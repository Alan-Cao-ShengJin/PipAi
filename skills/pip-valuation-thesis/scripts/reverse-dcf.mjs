import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Numerical sensitivity helper only: inputs are explicit FCFE, not net income.
export function validateInputs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('An input object is required.');
  const allowed = ['basis', 'currency', 'unit', 'marketEquityValue', 'forecastFcfe', 'costOfEquityPct', 'terminalGrowthPct', 'transitionYears'];
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unknown valuation input field.');
  if (value.basis !== 'FCFE-equity') throw new Error('Use FCFE-equity: this helper does not discount net income or FCFF.');
  for (const key of ['currency', 'unit']) if (typeof value[key] !== 'string' || !value[key].trim()) throw new Error(`Explicit ${key} is required.`);
  for (const key of ['marketEquityValue', 'costOfEquityPct', 'terminalGrowthPct']) if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) throw new Error(`Finite ${key} is required.`);
  if (value.marketEquityValue <= 0) throw new Error('Market equity value must be positive.');
  if (!Array.isArray(value.forecastFcfe) || value.forecastFcfe.length < 1 || value.forecastFcfe.length > 20
    || value.forecastFcfe.some(x => typeof x !== 'number' || !Number.isFinite(x))) throw new Error('Use 1–20 finite explicit FCFE forecasts.');
  if (value.forecastFcfe.at(-1) <= 0) throw new Error('This geometric-transition helper requires positive final explicit FCFE. Use a different model for a turnaround.');
  if (!Number.isInteger(value.transitionYears) || value.transitionYears < 1 || value.transitionYears > 50) throw new Error('Transition years must be an explicit integer from 1 to 50.');
  if (value.costOfEquityPct <= 0 || value.costOfEquityPct > 100 || value.terminalGrowthPct <= -100 || value.terminalGrowthPct >= value.costOfEquityPct) {
    throw new Error('Use a positive cost of equity in percent, and terminal growth strictly below it and above -100 percent.');
  }
  return { ...value, forecastFcfe: [...value.forecastFcfe] };
}

export function equityValue(input, steadyFcfe) {
  const x = validateInputs(input);
  if (!Number.isFinite(steadyFcfe) || steadyFcfe < 0) throw new Error('Steady-year FCFE must be finite and nonnegative.');
  const r = x.costOfEquityPct / 100, g = x.terminalGrowthPct / 100;
  const k = x.forecastFcfe.length, n = x.transitionYears;
  let pv = x.forecastFcfe.reduce((total, cf, i) => total + cf / (1 + r) ** (i + 1), 0);
  const start = x.forecastFcfe.at(-1);
  for (let i = 1; i <= n; i++) {
    const cf = steadyFcfe === 0 ? 0 : start * (steadyFcfe / start) ** (i / n);
    pv += cf / (1 + r) ** (k + i);
  }
  pv += steadyFcfe * (1 + g) / (r - g) / (1 + r) ** (k + n);
  if (!Number.isFinite(pv)) throw new Error('Valuation overflow; review the rate, horizon and cash-flow inputs.');
  return pv;
}

export function impliedSteadyFcfe(input) {
  const x = validateInputs(input), target = x.marketEquityValue;
  const floor = equityValue(x, 0);
  if (target < floor) throw new Error('No nonnegative steady FCFE fits: explicit cash-flow present value already exceeds the market equity value. Reassess the premises.');
  if (target === floor) return result(x, 0);
  let lo = 0, hi = Math.max(1, x.forecastFcfe.at(-1));
  for (let i = 0; equityValue(x, hi) < target; i++) {
    if (i >= 100) throw new Error('Could not bracket a steady FCFE solution.');
    hi *= 2;
  }
  for (let i = 0; i < 160; i++) {
    const mid = (lo + hi) / 2;
    if (equityValue(x, mid) < target) lo = mid; else hi = mid;
  }
  const answer = result(x, (lo + hi) / 2);
  if (answer.relativeRoundTripError > 1e-9) throw new Error('Forward/reverse numerical check failed.');
  return answer;
}
function result(x, steadyFcfe) {
  const fitted = equityValue(x, steadyFcfe);
  return { basis: x.basis, currency: x.currency, unit: x.unit, marketEquityValue: x.marketEquityValue,
    costOfEquityPct: x.costOfEquityPct, terminalGrowthPct: x.terminalGrowthPct,
    explicitYears: x.forecastFcfe.length, transitionYears: x.transitionYears,
    impliedSteadyFcfe: steadyFcfe, fittedEquityValue: fitted,
    relativeRoundTripError: Math.abs(fitted - x.marketEquityValue) / x.marketEquityValue,
    interpretation: 'Conditional numerical sensitivity, not an observed market belief, suitability decision or return forecast.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node reverse-dcf.mjs INPUT.json');
    console.log(JSON.stringify(impliedSteadyFcfe(JSON.parse(await readFile(process.argv[2], 'utf8'))), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
