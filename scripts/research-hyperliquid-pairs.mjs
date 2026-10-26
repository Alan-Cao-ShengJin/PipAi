// Standalone public-data research. No account, signing, order or model APIs.
// Run: node scripts/research-hyperliquid-pairs.mjs
// Replay captured inputs: node scripts/research-hyperliquid-pairs.mjs --replay PATH
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const endpoint = 'https://api.hyperliquid.xyz/info';
const day = 86_400_000;
const hour = 3_600_000;
const candidates = [
  ['xyz:NVDA', 'xyz:AMD'],
  ['xyz:XYZ100', 'xyz:SP500'],
  ['xyz:GOLD', 'xyz:SILVER'],
];
const coins = [...new Set(candidates.flat())];
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const variance = xs => mean(xs.map(x => (x - mean(xs)) ** 2));
const covariance = (xs, ys) => mean(xs.map((x, i) => (x - mean(xs)) * (ys[i] - mean(ys))));
const round = (x, n = 5) => Number.isFinite(x) ? +x.toFixed(n) : null;
const iso = ms => new Date(ms).toISOString();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function info(body, signal) {
  assert(['metaAndAssetCtxs', 'candleSnapshot', 'fundingHistory', 'l2Book'].includes(body.type), 'Read type not allowed');
  signal?.throwIfAborted();
  const requestedAt = iso(Date.now());
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])]),
  });
  assert(response.ok, `${body.type}: HTTP ${response.status}`);
  return { body, requestedAt, receivedAt: iso(Date.now()), data: await response.json() };
}

export async function capture({ signal } = {}) {
  let reads = 0;
  const read = body => { assert(++reads <= 60, 'Research request limit exceeded'); return info(body, signal); };
  const asOf = Date.now();
  const metadata = await read({ type: 'metaAndAssetCtxs', dex: 'xyz' });
  const assets = {};
  // Limit concurrency to two public market reads at a time.
  for (let i = 0; i < coins.length; i += 2) {
    await Promise.all(coins.slice(i, i + 2).map(async coin => {
      const candles = await read({ type: 'candleSnapshot', req: {
        coin, interval: '1d', startTime: asOf - 180 * day, endTime: asOf,
      } });
      const fundingPages = [];
      let cursor = asOf - 30 * day;
      let reachedEnd = false;
      for (let page = 0; page < 5; page++) {
        const result = await read({ type: 'fundingHistory', coin, startTime: cursor, endTime: asOf });
        assert(Array.isArray(result.data), `Invalid funding response: ${coin}`);
        fundingPages.push(result);
        if (!result.data.length) { reachedEnd = true; break; }
        const times = result.data.map(row => row.time);
        assert(times.every(Number.isSafeInteger), `Invalid funding times: ${coin}`);
        const next = Math.max(...times) + 1;
        assert(next > cursor, `Non-progressing funding pagination: ${coin}`);
        cursor = next;
        if (cursor >= asOf) { reachedEnd = true; break; }
      }
      assert(reachedEnd, `Funding pagination incomplete: ${coin}`);
      const book = await read({ type: 'l2Book', coin });
      assets[coin] = { candles, fundingPages, book };
    }));
  }
  return { schemaVersion: 1, endpoint, asOf, capturedThrough: iso(Date.now()), requestCount: reads, metadata, assets };
}

function validatedCandles(capture, coin) {
  const rows = capture.assets[coin].candles.data;
  assert(Array.isArray(rows), `Invalid candles: ${coin}`);
  const times = new Set();
  for (const row of rows) {
    assert(Number.isSafeInteger(row.t) && Number.isSafeInteger(row.T) && row.T > row.t, `Invalid candle time: ${coin}`);
    assert(row.s === coin && row.i === '1d', `Wrong candle market or interval: ${coin}`);
    assert(['o', 'h', 'l', 'c'].every(key => Number.isFinite(+row[key]) && +row[key] > 0), `Invalid candle price: ${coin}`);
    assert(+row.h >= Math.max(+row.o, +row.c) && +row.l <= Math.min(+row.o, +row.c), `Invalid OHLC: ${coin}`);
    assert(!times.has(row.t), `Duplicate candle: ${coin}`);
    times.add(row.t);
  }
  return rows.filter(row => row.T < capture.asOf && +row.v > 0 && +row.n > 0).sort((a, b) => a.t - b.t);
}

function fundingHours(capture, coin) {
  const byHour = new Map();
  for (const page of capture.assets[coin].fundingPages) {
    for (const row of page.data) {
      assert(row.coin === coin && Number.isSafeInteger(row.time) && Number.isFinite(+row.fundingRate), `Invalid funding: ${coin}`);
      if (row.time < capture.asOf - 30 * day || row.time > capture.asOf) continue;
      const timestamp = Math.floor(row.time / hour) * hour;
      const previous = byHour.get(timestamp);
      assert(!previous, `Duplicate funding hour: ${coin}`);
      byHour.set(timestamp, row);
    }
  }
  return byHour;
}

function fitReturns(rows) {
  const a = rows.map(row => row.a);
  const b = rows.map(row => row.b);
  assert(a.length >= 20 && variance(a) > 0 && variance(b) > 0, 'Insufficient return variation');
  return {
    observations: rows.length,
    correlation: round(covariance(a, b) / Math.sqrt(variance(a) * variance(b))),
    betaAOnB: round(covariance(a, b) / variance(b)),
  };
}

function bookMetrics(asset) {
  const { data: book, receivedAt } = asset.book;
  assert(Array.isArray(book.levels) && book.levels.length === 2, 'Invalid book');
  assert(Number.isSafeInteger(book.time), 'Invalid book time');
  const [bids, asks] = book.levels;
  assert(bids.length && asks.length, 'Empty book');
  for (const level of [...bids, ...asks]) assert(+level.px > 0 && +level.sz > 0, 'Invalid book level');
  assert(+bids[0].px < +asks[0].px, 'Crossed book');
  const mid = (+bids[0].px + +asks[0].px) / 2;
  function walk(levels, targetUsd) {
    let remaining = targetUsd, units = 0;
    for (const level of levels) {
      const spend = Math.min(remaining, +level.px * +level.sz);
      units += spend / +level.px;
      remaining -= spend;
      if (remaining < 1e-8) break;
    }
    return remaining > 1e-8 ? null : targetUsd / units;
  }
  const buy = walk(asks, 250), sell = walk(bids, 250);
  return {
    timestamp: iso(book.time), ageAtReceiptSeconds: round((Date.parse(receivedAt) - book.time) / 1000, 2),
    bestBid: +bids[0].px, bestAsk: +asks[0].px,
    spreadBps: round((+asks[0].px - +bids[0].px) / mid * 10_000, 3),
    buy250MidImpactBps: buy === null ? null : round((buy / mid - 1) * 10_000, 3),
    sell250MidImpactBps: sell === null ? null : round((1 - sell / mid) * 10_000, 3),
  };
}

export function analyse(capture) {
  assert(capture.schemaVersion === 1 && capture.endpoint === endpoint, 'Unexpected snapshot format');
  const universe = capture.metadata.data[0].universe;
  const contexts = capture.metadata.data[1];
  const series = new Map(coins.map(coin => [coin, validatedCandles(capture, coin)]));
  const funding = new Map(coins.map(coin => [coin, fundingHours(capture, coin)]));
  const markets = coins.map(coin => {
    const index = universe.findIndex(row => row.name === coin);
    assert(index >= 0 && !universe[index].isDelisted, `Unavailable market: ${coin}`);
    const meta = universe[index], ctx = contexts[index], candles = series.get(coin);
    return {
      coin, metadata: meta, mark: +ctx.markPx, oracle: +ctx.oraclePx,
      dayNotionalVolume: +ctx.dayNtlVlm, currentHourlyFunding: +ctx.funding,
      completeDailyCandles: candles.length, firstCandle: iso(candles[0].t), lastCandle: iso(candles.at(-1).t),
      fundingObservations: funding.get(coin).size, book: bookMetrics(capture.assets[coin]),
    };
  });
  const pairs = candidates.map(([a, b]) => {
    const bByTime = new Map(series.get(b).map(row => [row.t, row]));
    const aligned = series.get(a).flatMap(row => {
      const other = bByTime.get(row.t);
      const weekday = new Date(row.t).getUTCDay();
      return other && weekday !== 0 && weekday !== 6 ? [{ t: row.t, a: +row.c, b: +other.c }] : [];
    });
    assert(aligned.length >= 80, `Insufficient aligned weekday candles: ${a}/${b}`);
    const returns = aligned.slice(1).map((row, i) => ({ t: row.t, a: row.a / aligned[i].a - 1, b: row.b / aligned[i].b - 1 }));
    const split = Math.floor(returns.length * 2 / 3);
    const training = returns.slice(0, split), holdout = returns.slice(split);
    const trainingFit = fitReturns(training), holdoutFit = fitReturns(holdout);
    const beta = covariance(training.map(row => row.a), training.map(row => row.b)) / variance(training.map(row => row.b));
    const residual = holdout.map(row => row.a - beta * row.b);
    const aHours = funding.get(a), bHours = funding.get(b);
    const matchedHours = [...aHours.keys()].filter(t => bHours.has(t)).sort((x, y) => x - y);
    const rateA = matchedHours.reduce((sum, t) => sum + +aHours.get(t).fundingRate, 0);
    const rateB = matchedHours.reduce((sum, t) => sum + +bHours.get(t).fundingRate, 0);
    let gaps = 0;
    for (let i = 1; i < matchedHours.length; i++) if (matchedHours[i] - matchedHours[i - 1] !== hour) gaps++;
    return {
      a, b, alignedWeekdayCloses: aligned.length,
      firstDate: iso(aligned[0].t), lastDate: iso(aligned.at(-1).t),
      trainingEnd: iso(training.at(-1).t), training: trainingFit, holdout: holdoutFit,
      holdoutAStdDailyPct: round(Math.sqrt(variance(holdout.map(row => row.a))) * 100, 3),
      holdoutResidualStdDailyPct: round(Math.sqrt(variance(residual)) * 100, 3),
      holdoutResidualMeanDailyPct: round(mean(residual) * 100, 4),
      funding: {
        matchedHours: matchedHours.length, gaps,
        firstHour: matchedHours.length ? iso(matchedHours[0]) : null,
        lastHour: matchedHours.length ? iso(matchedHours.at(-1)) : null,
        sumRateAPct: round(rateA * 100, 4), sumRateBPct: round(rateB * 100, 4),
        equalNotionalLongAShortB250EachCarryUsd: round(250 * (rateB - rateA), 4),
        trainingBetaLongA250ShortBBetaTimes250CarryUsd: round(250 * (beta * rateB - rateA), 4),
      },
    };
  });
  return {
    asOf: iso(capture.asOf), capturedThrough: capture.capturedThrough,
    method: '180-day daily trade-candle window; aligned nonzero-volume UTC weekday closes; first 2/3 training, last 1/3 held out; OLS simple-return beta with intercept; frozen-beta residual diagnostics, NOT a trading backtest. Last 30 calendar days of hourly funding; constant-notional illustrations, NOT realised P&L. No significance or cointegration test. No live action.',
    markets, pairs,
    feeSensitivity: [1, 5, 10].map(bps => ({ hypotheticalPerFillBps: bps, fourFills250EachRoundTripUsd: round(4 * 250 * bps / 10_000, 2) })),
  };
}

async function main() {
const replayIndex = process.argv.indexOf('--replay');
if (replayIndex >= 0) {
  assert(process.argv[replayIndex + 1], 'Missing replay path');
  console.log(JSON.stringify(analyse(JSON.parse(await readFile(process.argv[replayIndex + 1], 'utf8'))), null, 2));
} else {
  const captured = await capture();
  const raw = JSON.stringify(captured);
  const folder = resolve('.data/research', `hyperliquid-pairs-${iso(captured.asOf).replace(/[:.]/g, '-')}`);
  await mkdir(folder, { recursive: true });
  // Preserve inputs before analysis, including inputs that fail validation.
  await writeFile(resolve(folder, 'inputs.json'), raw + '\n');
  const summary = { inputSha256: createHash('sha256').update(raw).digest('hex'), ...analyse(captured) };
  await writeFile(resolve(folder, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ folder, reads: captured.requestCount, ...summary }, null, 2));
}
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
