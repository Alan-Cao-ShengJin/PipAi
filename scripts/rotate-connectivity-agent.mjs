import { existsSync, mkdirSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { ExecutionStore } from '../packages/connectivity/src/store.ts';
import { loadAgent } from '../packages/connectivity/src/keystore.ts';

const directory = resolve(process.env.PIP_SIGNER_DATA_DIR ?? 'D:/CodexData/Pip/signer');
const lockPath = join(directory, 'signer.lock');
if (existsSync(lockPath)) throw new Error('Stop the signer before rotating. After a crash, verify the old process is stopped before removing its lock.');
const lock = openSync(lockPath, 'wx', 0o600);
let db;
try {
  const key = process.env.PIP_SIGNER_ENCRYPTION_KEY ?? '';
  db = new ExecutionStore(join(directory, 'execution.sqlite'));
  if (db.get('retired') !== true) throw new Error('First revoke the agent in the trading wallet and refresh the connected account so retirement is recorded.');
  const original = join(directory, 'agent.encrypted.json');
  const archive = resolve(directory, 'archive', `agent-${Date.now()}.encrypted.json`);
  if (!archive.startsWith(directory + sep) || !resolve(original).startsWith(directory + sep)) throw new Error('Invalid archive target.');
  if (!existsSync(original) || existsSync(archive)) throw new Error('Original key is missing or archive target already exists.');
  loadAgent(original, key); // Validate the existing key before moving any file.
  mkdirSync(join(directory, 'archive'), { recursive: true });
  renameSync(original, archive);
  const fresh = loadAgent(original, key);
  db.transaction(() => {
    db.set('paused', true); db.set('everApproved', false); db.set('registrationExpiry', null); db.set('retired', false);
    db.event('agent.rotated', { newAgent: fresh.address.toLowerCase(), archive, previousHistoryPreserved: true });
  });
  console.log('Fresh API wallet provisioned. Prior key and execution history preserved. Restart the signer and sign a new approval and mandate; execution remains paused.');
} finally { db?.close(); closeSync(lock); unlinkSync(lockPath); }
