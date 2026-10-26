import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { configureWalletWeb } from './configure-wallet-web.mjs';

// Provision local process credentials, never a user's wallet key.
const signerPath = resolve('.env.signer'), workerPath = resolve('.env.execution-worker');
if (existsSync(signerPath) || existsSync(workerPath)) throw new Error('Connectivity environment files already exist. Preserve them and existing history; setup will not overwrite credentials.');
const directory = 'D:/CodexData/Pip/signer';
mkdirSync(directory, { recursive: true });
const encryption = randomBytes(32).toString('hex'), control = randomBytes(32).toString('hex'), worker = randomBytes(32).toString('hex');
writeFileSync(signerPath, `PIP_SIGNER_DATA_DIR=${directory}\nPIP_SIGNER_ENCRYPTION_KEY=${encryption}\nPIP_CONTROL_TOKEN=${control}\nPIP_WORKER_TOKEN=${worker}\nPIP_TESTNET_EXECUTION=disabled\nPIP_WEB_ORIGIN=http://127.0.0.1:3000\nPIP_SIGNER_PORT=8788\n`, { flag: 'wx', mode: 0o600 });
writeFileSync(workerPath, `PIP_SIGNER_URL=http://127.0.0.1:8788\nPIP_WORKER_TOKEN=${worker}\n`, { flag: 'wx', mode: 0o600 });
console.log(`Created ${signerPath} and ${workerPath}. Testnet execution is disabled. Data: ${directory}.`);
configureWalletWeb(control);
console.log('Users connect through the browser wallet button. Never give the signer environment or backend credentials to a research worker.');
