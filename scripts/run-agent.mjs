import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { AgentStore, ProactiveAgent, ToolGateway, UsageLedger, ResearchContextSchema, defineReadTool } from '../packages/harness/src/index.ts';
import { OpenRouterAdapter } from '../packages/harness/src/openrouter.ts';
import { capture, analyse } from './research-hyperliquid-pairs.mjs';

const goalFlag = process.argv.indexOf('--goal');
if (goalFlag < 0 || !process.argv[goalFlag + 1]) {
  console.error('Usage: npm run agent:run -- --goal config/research-goal.example.json [--watch | --pause]');
  process.exit(1);
}
let store, ledger;
try {
  const definition = z.object({ id: z.string().min(1).max(120), context: ResearchContextSchema }).strict()
    .parse(JSON.parse(await readFile(process.argv[goalFlag + 1], 'utf8')));
  if (definition.context.portfolio.dataMode !== 'synthetic') throw new Error('This CLI supports hypothetical allocations only. Real accounts need an authenticated context loader.');
  // This timestamp is refreshed only for explicitly synthetic input, never an observed account.
  const loadContext = async () => ({ ...structuredClone(definition.context),
    portfolio: { ...definition.context.portfolio, asOf: new Date().toISOString() } });
  if (!process.argv.includes('--pause') && (!process.env.OPENROUTER_API_KEY?.trim() || !process.env.PIP_MODEL?.trim())) {
    throw new Error('Set OPENROUTER_API_KEY and PIP_MODEL locally in .env.harness. No provider request was sent.');
  }
  store = new AgentStore(resolve('.data/agent/work.sqlite'));
  const tenant = definition.context.scope.tenantId;
  if (process.argv.includes('--pause')) {
    store.pause(tenant, definition.id);
    console.log('Research paused. Any outstanding provider request still needs its usage receipt.');
  } else {
    ledger = new UsageLedger(resolve('.data/agent/usage.sqlite'));
    ledger.configureTenant(tenant, Number(process.env.PIP_TENANT_BUDGET_MICROS ?? 1000000));
    const symbols = ['xyz:NVDA', 'xyz:AMD', 'xyz:XYZ100', 'xyz:SP500', 'xyz:GOLD', 'xyz:SILVER'];
    const screen = defineReadTool({ name: 'markets.screen', version: 'public-diagnostic-v1',
      description: 'Compare three predefined cross-asset hypotheses using current metadata, 180-day candle diagnostics, 30-day funding and order books. This is not a trading backtest or a validated entry signal.',
      dataMode: 'live-read-only', maxCostMicros: 0, inputSchema: z.object({}), outputSchema: z.json(),
      async execute(_, { signal }) {
        const raw = await capture({ signal });
        const directory = resolve('.data/agent/evidence', new Date(raw.asOf).toISOString().replace(/[:.]/g, '-'));
        const inputJson = JSON.stringify(raw);
        await mkdir(directory, { recursive: true });
        await writeFile(resolve(directory, 'inputs.json'), inputJson + '\n');
        return { data: { ...analyse(raw), inputSha256: createHash('sha256').update(inputJson).digest('hex') }, actualCostMicros: 0 };
      },
    });
    const snapshot = defineReadTool({ name: 'market.snapshot', version: 'public-v1', description: 'Refresh one eligible market price, funding quote, volume and margin metadata. Not a future-return estimate.',
      dataMode: 'live-read-only', maxCostMicros: 0, inputSchema: z.object({ symbol: z.enum(symbols) }),
      outputSchema: z.object({ symbol: z.string(), observedAt: z.iso.datetime(), mark: z.number().positive(), oracle: z.number().positive(),
        hourlyFunding: z.number(), dayNotionalVolume: z.number().nonnegative(), metadata: z.json(), source: z.string() }).strict(),
      async execute({ symbol }, { signal }) {
        const response = await fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'metaAndAssetCtxs', dex: 'xyz' }), signal });
        if (!response.ok) throw new Error('Public market read failed');
        const [meta, contexts] = await response.json();
        const index = meta.universe.findIndex(row => row.name === symbol && !row.isDelisted);
        if (index < 0) throw new Error('Market unavailable');
        const row = contexts[index];
        return { data: { symbol, observedAt: new Date().toISOString(), mark: +row.markPx, oracle: +row.oraclePx,
          hourlyFunding: +row.funding, dayNotionalVolume: +row.dayNtlVlm, metadata: meta.universe[index], source: 'https://api.hyperliquid.xyz/info' }, actualCostMicros: 0 };
      },
    });
    const gateway = new ToolGateway({ tools: [screen, snapshot], ledger, timeoutMs: 60_000 });
    const agent = new ProactiveAgent({ store, ledger, gateway,
      model: new OpenRouterAdapter({ apiKey: process.env.OPENROUTER_API_KEY, model: process.env.PIP_MODEL }),
      limits: { modelCallMaxCostMicros: Number(process.env.PIP_MODEL_CALL_BOUND_MICROS ?? 50000),
        runBudgetMicros: Number(process.env.PIP_RUN_BUDGET_MICROS ?? 200000) } });
    store.create(definition.id, await loadContext(), Date.now());
    const reviewFlag = process.argv.indexOf('--review');
    if (reviewFlag >= 0) {
      if (!process.argv[reviewFlag + 1]) throw new Error('A research message is required after --review.');
      store.requestReview(tenant, definition.id, Date.now(), process.argv[reviewFlag + 1]);
    }
    console.log('Local paper-research worker: synthetic allocation, real public market reads and paid model calls. No orders or wallet connection.');
    const cancellation = new AbortController();
    process.once('SIGINT', () => cancellation.abort());
    let previous = '';
    do {
      const goal = await agent.tick(tenant, definition.id, loadContext, cancellation.signal);
      const update = JSON.stringify({ status: goal.status, summary: goal.summary, nextTask: goal.nextTask,
        nextReviewAt: goal.dueAt === null ? null : new Date(goal.dueAt).toISOString() });
      if (update !== previous) { console.log(update); previous = update; }
      if (!process.argv.includes('--watch') || !['watching', 'queued', 'running'].includes(goal.status) || cancellation.signal.aborted) break;
      try { await delay(10_000, undefined, { signal: cancellation.signal }); } catch { break; }
    } while (true);
  }
} catch (error) {
  // Provider errors may contain credentials/headers; only known local configuration errors are printed.
  const allowed = ['Set OPENROUTER_API_KEY', 'This CLI supports hypothetical allocations'];
  console.error(allowed.some(prefix => error?.message?.startsWith(prefix)) ? error.message : 'Research worker could not start or continue. Check local configuration and persisted status; provider details are redacted.');
  process.exitCode = 1;
} finally { store?.close(); ledger?.close(); }
