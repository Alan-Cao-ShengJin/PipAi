import { readFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { HandoffSchema, validateHandoff } from '../lib/handoffs.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await readFile(resolve(root, 'catalog.json'), 'utf8'));
const errors = [], ids = new Set();
const within = (base, target) => { const rel = relative(base, target); return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !rel.includes(':')); };
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path)); else result.push(path);
  }
  return result;
}
for (const skill of catalog.skills) {
  if (ids.has(skill.id)) errors.push(`Duplicate skill ${skill.id}`); ids.add(skill.id);
  const path = resolve(root, skill.path);
  if (!within(root, path)) { errors.push(`Skill path escapes the bundle: ${skill.id}`); continue; }
  const text = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n') || !/^name: [a-z0-9-]+$/m.test(text) || !/^description: \S.+$/m.test(text)) errors.push(`Invalid entry metadata: ${skill.id}`);
  if (!text.includes(`\nname: ${skill.id}\n`) || dirname(path).split(sep).at(-1) !== skill.id) errors.push(`Entry identity mismatch: ${skill.id}`);
}
if (!ids.has(catalog.entrySkill)) errors.push('Unknown entry skill.');
for (const [name, stage] of Object.entries(catalog.stages)) {
  if (!ids.has(stage.skill)) errors.push(`Unknown skill for stage ${name}`);
  for (const dep of stage.requiredBefore) if (!catalog.stages[dep]) errors.push(`Unknown dependency ${dep}`);
}
for (const [name, flow] of Object.entries(catalog.flows)) {
  const seen = new Set();
  for (const id of flow) {
    const stage = catalog.stages[id];
    if (!stage || seen.has(id)) { errors.push(`Unknown or repeated stage ${id} in ${name}`); continue; }
    for (const dep of stage.requiredBefore) if (!seen.has(dep)) errors.push(`${name}: ${id} precedes required ${dep}`);
    seen.add(id);
  }
}
let markdownLinks = 0;
for (const path of (await files(root)).filter(path => path.endsWith('.md'))) {
  const text = await readFile(path, 'utf8');
  for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const dest = resolve(dirname(path), decodeURIComponent(target));
    // README may link the repository audit; skills themselves remain within the bundle.
    if (!within(dirname(root), dest)) { errors.push(`Link escapes repository: ${relative(root, path)}`); continue; }
    try { await access(dest); markdownLinks++; } catch { errors.push(`Broken link ${target} from ${relative(root, path)}`); }
  }
}
const actualSchema = JSON.parse(JSON.stringify(z.toJSONSchema(HandoffSchema)));
const documentedSchema = JSON.parse(await readFile(resolve(root, 'pip-research-cycle/references/handoff.schema.json'), 'utf8'));
if (JSON.stringify(actualSchema) !== JSON.stringify(documentedSchema)) errors.push('Documented handoff schema differs from its implementation.');
validateHandoff(JSON.parse(await readFile(resolve(root, 'pip-research-cycle/references/handoff-example.json'), 'utf8')));
const inventory = JSON.parse(await readFile(resolve(root, 'source-inventory.json'), 'utf8'));
const originalSkills = inventory.files.filter(entry => entry.path.endsWith('/SKILL.md')).map(entry => entry.path.split('/').at(-2));
const mappedSkills = new Set(catalog.skills.flatMap(skill => skill.sourceSkills));
for (const name of originalSkills) if (!mappedSkills.has(name)) errors.push(`Original skill has no curated mapping: ${name}`);
for (const name of mappedSkills) if (!originalSkills.includes(name)) errors.push(`Unknown original skill in mapping: ${name}`);
let originalFilesVerified = 0, originalFilesUnavailable = 0;
for (const entry of inventory.files) {
  let bytes;
  try { bytes = await readFile(resolve(dirname(root), entry.path)); } catch { originalFilesUnavailable++; continue; }
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) errors.push(`Original source changed: ${entry.path}`);
  else originalFilesVerified++;
}
if (errors.length) { console.error(JSON.stringify({ errors }, null, 2)); process.exitCode = 1; }
else console.log(JSON.stringify({ skills: ids.size, originalSkillsMapped: originalSkills.length, flows: Object.keys(catalog.flows).length, markdownLinks,
  handoffSchema: 'consistent', originalFilesVerified, originalFilesUnavailable,
  note: 'Structural checks, not proof of analyst behaviour or investment performance.' }, null, 2));
