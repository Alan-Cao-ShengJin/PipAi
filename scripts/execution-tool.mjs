import { ExecutionToolClient } from '../packages/connectivity/src/client.ts';
const client = new ExecutionToolClient({ token: process.env.PIP_WORKER_TOKEN ?? '', url: process.env.PIP_SIGNER_URL });
try {
  const name = process.argv[2];
  if (name === 'tools') console.log(JSON.stringify(client.tools, null, 2));
  else console.log(JSON.stringify(await client.invoke(name, process.argv[3] ? JSON.parse(process.argv[3]) : {}), null, 2));
} catch (error) { console.error(error instanceof Error ? error.message : 'Tool failed.'); process.exitCode = 1; }
