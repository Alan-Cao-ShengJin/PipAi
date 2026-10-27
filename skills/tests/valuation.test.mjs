import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { equityValue, impliedSteadyFcfe } from '../pip-valuation-thesis/scripts/reverse-dcf.mjs';

const example = JSON.parse(readFileSync(new URL('../pip-valuation-thesis/references/fcfe-example.json', import.meta.url), 'utf8'));
describe('conditional equity cash-flow calculator', () => {
  it('matches the independently known constant-cash-flow perpetuity', () => {
    expect(equityValue(example, 100)).toBeCloseTo(100 / 0.10, 9);
    expect(impliedSteadyFcfe(example).impliedSteadyFcfe).toBeCloseTo(100, 9);
  });
  it('matches a growing perpetuity without double-counting the terminal year', () => {
    const growth = 0.02, years = example.forecastFcfe.length + example.transitionYears;
    const value = { ...example, terminalGrowthPct: 2, forecastFcfe: [1, 2, 3].map(t => 100 * (1 + growth) ** t) };
    expect(equityValue(value, 100 * (1 + growth) ** years)).toBeCloseTo(100 * 1.02 / (0.10 - growth), 8);
  });
  it('scales cash values consistently while leaving rates and periods unchanged', () => {
    const scale = 1000;
    const scaled = { ...example, marketEquityValue: example.marketEquityValue * scale, forecastFcfe: example.forecastFcfe.map(x => x * scale), unit: 'different scale' };
    expect(impliedSteadyFcfe(scaled).impliedSteadyFcfe).toBeCloseTo(impliedSteadyFcfe(example).impliedSteadyFcfe * scale, 6);
  });
  it('does not invent a root when the explicit flows already exceed market value', () => {
    expect(() => impliedSteadyFcfe({ ...example, marketEquityValue: 1 })).toThrow(/No nonnegative/);
  });
  it('rejects a terminal growth rate at or above the discount rate', () => {
    expect(() => impliedSteadyFcfe({ ...example, terminalGrowthPct: 10 })).toThrow(/strictly below/);
    expect(() => impliedSteadyFcfe({ ...example, terminalGrowthPct: 11 })).toThrow(/strictly below/);
  });
  it('requires explicit FCFE/equity basis and a chosen horizon', () => {
    expect(() => impliedSteadyFcfe({ ...example, basis: 'net-income' })).toThrow(/FCFE-equity/);
    const { transitionYears, ...missing } = example;
    expect(() => impliedSteadyFcfe(missing)).toThrow(/explicit integer/);
  });
  it('rejects a nonpositive final FCFE rather than silently extrapolating a turnaround', () => {
    expect(() => impliedSteadyFcfe({ ...example, forecastFcfe: [100, 50, -1] })).toThrow(/different model/);
  });
  it('allows earlier negative cash flows but requires a stronger later path to offset them', () => {
    const weaker = { ...example, forecastFcfe: [-100, 100, 100] };
    expect(impliedSteadyFcfe(weaker).impliedSteadyFcfe).toBeGreaterThan(impliedSteadyFcfe(example).impliedSteadyFcfe);
  });
  it('shows that weaker cash conversion raises the required terminal earnings at a fixed price', () => {
    const full = { ...example, forecastFcfe: [10, 11, 12], marketEquityValue: 200 };
    const half = { ...full, forecastFcfe: full.forecastFcfe.map(x => x * 0.5) };
    const impliedProfitFullConversion = impliedSteadyFcfe(full).impliedSteadyFcfe;
    const impliedProfitHalfConversion = impliedSteadyFcfe(half).impliedSteadyFcfe / 0.5;
    expect(impliedProfitHalfConversion).toBeGreaterThan(impliedProfitFullConversion);
  });
  it('requires more terminal cash at the same price when the discount rate is higher', () => {
    expect(impliedSteadyFcfe({ ...example, costOfEquityPct: 12 }).impliedSteadyFcfe).toBeGreaterThan(impliedSteadyFcfe(example).impliedSteadyFcfe);
  });
  it('rejects nonfinite values and unsupported input fields', () => {
    expect(() => impliedSteadyFcfe({ ...example, forecastFcfe: [NaN, 100, 100] })).toThrow(/finite/);
    expect(() => impliedSteadyFcfe({ ...example, forecastFcfe: [Infinity, 100, 100] })).toThrow(/finite/);
    expect(() => impliedSteadyFcfe({ ...example, desiredProfit: 1000000 })).toThrow(/Unknown/);
  });
});
