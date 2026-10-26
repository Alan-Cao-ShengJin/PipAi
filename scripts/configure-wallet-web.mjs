import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

export function configureWalletWeb(controlToken, signerPort = '8788') {
  if (!/^[0-9a-f]{64}$/.test(controlToken) || !/^\d{4,5}$/.test(signerPort)) throw new Error('Valid backend configuration is required.');
  const path = resolve('apps/web/.env.local');
  const original = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const existing = parseEnv(original);
  const values = { PIP_WEB_SIGNER_TOKEN: controlToken, PIP_WEB_SIGNER_URL: `http://127.0.0.1:${signerPort}`, PIP_WEB_ORIGIN: 'http://127.0.0.1:3000' };
  for (const [name, value] of Object.entries(values)) if (existing[name] && existing[name] !== value) throw new Error('Existing web configuration differs. Preserve and review it before changing backend credentials.');
  const additions = Object.entries(values).filter(([name]) => !existing[name]).map(([name, value]) => `${name}=${value}`).join('\n');
  if (additions) writeFileSync(path, original + (original.endsWith('\n') || !original ? '' : '\n') + additions + '\n', { mode: 0o600 });
  console.log('Web wallet connection configured. Backend credentials stay on the server.');
}
if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/configure-wallet-web.mjs')) configureWalletWeb(process.env.PIP_CONTROL_TOKEN ?? '', process.env.PIP_SIGNER_PORT);
