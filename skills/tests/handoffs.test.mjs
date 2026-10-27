import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assessReadiness, validateHandoff } from '../lib/handoffs.mjs';

const original = JSON.parse(readFileSync(new URL('../pip-research-cycle/references/handoff-example.json', import.meta.url), 'utf8'));
const fixture = () => structuredClone(original);
const context = { mandateId: 'synthetic-paper-mandate', mandateVersion: 1, nowMs: Date.parse('2026-10-27T09:10:00Z'),
  maxAgeMs: 1800000, upstreamVersions: {}, allowSynthetic: true, historical: false };
describe('research handoff gates', () => {
  it('accepts a complete synthetic research fixture only in an explicitly synthetic evaluation', () => {
    expect(assessReadiness(fixture(), context).ready).toBe(true);
    expect(assessReadiness(fixture(), { ...context, allowSynthetic: false }).ready).toBe(false);
  });
  it('does not accept a source name that is absent from the source register', () => {
    const a = fixture(); a.claims[0].sourceIds = ['invented'];
    expect(() => validateHandoff(a)).toThrow(/unknown source/);
  });
  it('requires a calculation record for derived observations', () => {
    const a = fixture(); a.claims[0].calculation = null;
    expect(() => validateHandoff(a)).toThrow(/calculation/);
  });
  it('blocks critical unresolved facts and failed or unrun blocking checks', () => {
    const a = fixture(); a.criticalUnknowns.push('Material revenue basis unresolved');
    expect(assessReadiness(a, context).ready).toBe(false);
    for (const result of ['fail', 'not-run']) { const b = fixture(); b.checks[0].result = result; expect(assessReadiness(b, context).ready).toBe(false); }
  });
  it('blocks artifacts that depend on revised or unavailable upstream versions', () => {
    const a = fixture(); a.dependencies = [{ id: 'actuals', version: 1, changed: false }];
    expect(assessReadiness(a, context).ready).toBe(false);
    expect(assessReadiness(a, { ...context, upstreamVersions: { actuals: 2 } }).ready).toBe(false);
    expect(assessReadiness(a, { ...context, upstreamVersions: { actuals: 1 } }).ready).toBe(true);
    a.dependencies[0].changed = true;
    expect(assessReadiness(a, { ...context, upstreamVersions: { actuals: 1 } }).ready).toBe(false);
  });
  it('rejects future information from a historical cutoff', () => {
    const a = fixture(); a.sources[0].availableAt = '2026-10-27T09:01:00Z';
    expect(assessReadiness(a, { ...context, historical: true }).ready).toBe(false);
  });
  it('does not treat an unknown availability date as point-in-time evidence', () => {
    const a = fixture(); a.sources[0].availableAt = null; a.sources[0].publishedAt = null;
    expect(assessReadiness(a, { ...context, historical: true }).ready).toBe(false);
  });
  it('blocks unavailable source support rather than claiming a paid vendor was checked', () => {
    const a = fixture(); a.sources[0].accessStatus = 'unavailable';
    expect(assessReadiness(a, context).ready).toBe(false);
  });
  it('blocks stale artifacts and changed mandates', () => {
    expect(assessReadiness(fixture(), { ...context, nowMs: context.nowMs + 3600000 }).ready).toBe(false);
    expect(assessReadiness(fixture(), { ...context, mandateVersion: 2 }).ready).toBe(false);
  });
  it('keeps a proposed watch planned until a host acknowledgement is present', () => {
    const a = fixture(); a.nextActions = [{ task: 'Observe a defined metric', kind: 'watch', completionCondition: 'Review the threshold',
      dueAt: '2026-10-28T09:00:00Z', trigger: null, activationStatus: 'planned', activationId: null }];
    expect(validateHandoff(a).nextActions[0].activationStatus).toBe('planned');
    a.nextActions[0].activationStatus = 'active'; expect(() => validateHandoff(a)).toThrow(/acknowledgement/);
  });
  it('rejects a handoff with no continuing task and distinguishes partial output from completion', () => {
    const a = fixture(); a.nextActions = []; expect(() => validateHandoff(a)).toThrow();
    const b = fixture(); b.status = 'partial'; expect(assessReadiness(b, context).ready).toBe(false);
  });
  it('does not let an empty checklist or empty material claims pass a model handoff', () => {
    const a = fixture(); a.checks = []; expect(assessReadiness(a, context).ready).toBe(false);
    const b = fixture(); b.claims = []; expect(assessReadiness(b, context).ready).toBe(false);
  });
  it('preserves raw input and rejects false provenance timing', () => {
    const a = fixture(); const before = structuredClone(a); assessReadiness(a, context); expect(a).toEqual(before);
    a.sources[0].retrievedAt = '2026-10-27T09:06:00Z'; expect(() => validateHandoff(a)).toThrow(/after artifact/);
  });
  it('requires a stated reason to skip a branch', () => {
    const a = fixture(); a.status = 'not-applicable'; expect(() => validateHandoff(a)).toThrow(/needs a reason/);
  });
});
