import { z } from 'zod';

const id = z.string().min(1).max(160);
const timestamp = z.iso.datetime({ offset: true });
export const HandoffSchema = z.object({
  id, kind: z.enum(['research-brief', 'evidence-pack', 'hypothesis', 'company-model', 'financial-quality', 'valuation-thesis', 'investment-conclusion',
    'strategy-test', 'challenge', 'portfolio-decision', 'management-questions', 'brief', 'monitor-review']),
  version: z.number().int().positive(), status: z.enum(['complete', 'partial', 'blocked', 'not-applicable']),
  notApplicableReason: z.string().min(1).nullable(),
  mandateId: id, mandateVersion: z.number().int().positive(), scopeIds: z.array(id).min(1).max(100),
  asOf: timestamp, producedAt: timestamp, summary: z.string().min(1).max(8000),
  sources: z.array(z.object({ id, location: z.string().min(1), locator: z.string().min(1),
    publishedAt: timestamp.nullable(), availableAt: timestamp.nullable(), retrievedAt: timestamp,
    accessStatus: z.enum(['available', 'partial', 'unavailable']), synthetic: z.boolean(),
  }).strict()).max(200),
  claims: z.array(z.object({ id, text: z.string().min(1), material: z.boolean(),
    basis: z.enum(['reported', 'derived', 'guidance', 'estimate', 'assumption', 'inference']), sourceIds: z.array(id).max(30),
    calculation: z.object({ method: z.string().min(1), inputIds: z.array(id).min(1) }).strict().nullable(),
    rationale: z.string().min(1).nullable(),
  }).strict()).max(300),
  dependencies: z.array(z.object({ id, version: z.number().int().positive(), changed: z.boolean() }).strict()).max(100),
  checks: z.array(z.object({ name: z.string().min(1), result: z.enum(['pass', 'fail', 'not-run']), blocking: z.boolean(), detail: z.string().min(1) }).strict()).max(100),
  criticalUnknowns: z.array(z.string().min(1)).max(100),
  nextActions: z.array(z.object({ task: z.string().min(1), kind: z.enum(['read', 'calculate', 'challenge', 'user-input', 'review', 'watch']),
    completionCondition: z.string().min(1), dueAt: timestamp.nullable(), trigger: z.string().min(1).nullable(),
    activationStatus: z.enum(['planned', 'active']).nullable(), activationId: id.nullable(),
  }).strict()).min(1).max(30),
}).strict();

// Shape/schema are separate from readiness; neither proves truth or execution authority.
export function validateHandoff(value) {
  const a = HandoffSchema.parse(value);
  if (Date.parse(a.producedAt) < Date.parse(a.asOf)) throw new Error('Information cutoff cannot be after artifact production.');
  if (a.status === 'not-applicable' && !a.notApplicableReason) throw new Error('A not-applicable artifact needs a reason.');
  const sources = new Set(a.sources.map(s => s.id));
  if (sources.size !== a.sources.length) throw new Error('Source IDs must be unique.');
  if (new Set(a.claims.map(c => c.id)).size !== a.claims.length) throw new Error('Claim IDs must be unique.');
  if (new Set(a.dependencies.map(d => d.id)).size !== a.dependencies.length) throw new Error('Dependency IDs must be unique.');
  if (a.sources.some(source => Date.parse(source.retrievedAt) > Date.parse(a.producedAt))) throw new Error('A source cannot be retrieved after artifact production.');
  for (const claim of a.claims) {
    if (claim.sourceIds.some(source => !sources.has(source))) throw new Error('A claim references an unknown source.');
    if (claim.basis === 'derived' && !claim.calculation) throw new Error('A derived claim needs its calculation and input references.');
  }
  for (const action of a.nextActions) {
    if (action.kind === 'watch' && !action.dueAt && !action.trigger) throw new Error('A watch needs a review date or observable trigger.');
    if (action.kind === 'watch' && !action.activationStatus) throw new Error('A watch needs an explicit activation status.');
    if (action.activationStatus === 'active' && (action.kind !== 'watch' || !action.activationId)) throw new Error('An active watch needs a host acknowledgement.');
    if (action.kind !== 'watch' && (action.activationStatus || action.activationId)) throw new Error('Only watch actions carry activation fields.');
  }
  return a;
}

const ReadinessContext = z.object({ mandateId: id, mandateVersion: z.number().int().positive(), nowMs: z.number().int().nonnegative(),
  maxAgeMs: z.number().int().positive(), upstreamVersions: z.record(id, z.number().int().positive()),
  allowSynthetic: z.boolean().default(false), historical: z.boolean().default(false),
}).strict();
export function assessReadiness(value, context) {
  const a = validateHandoff(value), c = ReadinessContext.parse(context), issues = [];
  if (a.status !== 'complete') issues.push('Artifact is not complete.');
  if (a.mandateId !== c.mandateId || a.mandateVersion !== c.mandateVersion) issues.push('Mandate version does not match.');
  const age = c.nowMs - Date.parse(a.asOf);
  if (age < 0 || Date.parse(a.producedAt) > c.nowMs || age > c.maxAgeMs) issues.push('Artifact cutoff/production time is future or stale.');
  if (a.criticalUnknowns.length) issues.push('Critical unknowns remain unresolved.');
  const assessedKinds = ['company-model', 'financial-quality', 'valuation-thesis', 'investment-conclusion', 'strategy-test', 'challenge', 'portfolio-decision'];
  if (assessedKinds.includes(a.kind) && !a.checks.some(check => check.blocking)) issues.push('No substantive blocking validation checks are recorded.');
  if (assessedKinds.includes(a.kind) && !a.claims.some(claim => claim.material)) issues.push('No decision-driving claims are recorded.');
  if (a.checks.some(check => check.blocking && check.result !== 'pass')) issues.push('A blocking check failed or was not run.');
  for (const dep of a.dependencies) if (dep.changed || c.upstreamVersions[dep.id] !== dep.version) issues.push(`Dependency ${dep.id} needs refresh or a current version.`);
  const sources = new Map(a.sources.map(s => [s.id, s]));
  for (const claim of a.claims.filter(claim => claim.material)) {
    if (['reported', 'derived', 'guidance', 'estimate'].includes(claim.basis) && claim.sourceIds.length === 0) issues.push(`Material claim ${claim.id} has no source support.`);
    if (['assumption', 'inference'].includes(claim.basis) && !claim.rationale) issues.push(`Material assumption/inference ${claim.id} needs a rationale.`);
    for (const sourceId of claim.sourceIds) {
      const source = sources.get(sourceId);
      if (source.accessStatus !== 'available') issues.push(`Source ${sourceId} is incomplete or unavailable.`);
      if (!c.allowSynthetic && source.synthetic) issues.push(`Source ${sourceId} is synthetic.`);
      const available = source.availableAt ?? source.publishedAt;
      if ((c.historical && !available) || (available && Date.parse(available) > Date.parse(a.asOf))) issues.push(`Source ${sourceId} was not demonstrably available by the cutoff.`);
    }
  }
  return { ready: issues.length === 0, issues: [...new Set(issues)],
    interpretation: 'Research handoff checks only. This result grants no approval, trading authority or monitor activation.' };
}
