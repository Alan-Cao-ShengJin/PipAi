import { z } from "zod";

const empty = z.object({}).strict();
const proposalId = z.object({ proposalId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/) }).strict();
const positive = z.string().max(40).regex(/^(0|[1-9]\d*)(\.\d+)?$/).refine(s => /[1-9]/.test(s));
const definitions = [
  { name: "account.read", description: "Read the linked Hyperliquid testnet trading account. Includes source times and unsupported-exposure flags.", schema: empty },
  { name: "markets.read", description: "Discover supported core perpetual markets on Hyperliquid testnet.", schema: empty },
  { name: "trade.propose", description: "Create an expiring trade proposal within the wallet-signed testnet mandate. Does not submit an order.", schema: z.object({ symbol: z.string().regex(/^[A-Za-z0-9_-]{1,30}$/), side: z.enum(["buy", "sell"]), size: positive, limitPrice: positive, reduceOnly: z.boolean() }).strict() },
  { name: "trade.execute", description: "Request execution of a recorded proposal. Signer independently reloads authority and risk. Per-order mode also requires an exact wallet approval. Never retry an uncertain order under a new ID.", schema: proposalId },
  { name: "orders.cancel", description: "Cancel only an order recorded by this signer and reconcile its outcome. Available during a local pause.", schema: proposalId },
  { name: "execution.reconcile", description: "Read exact order status and fresh account state. Unknown outcomes continue blocking execution.", schema: proposalId },
  { name: "execution.status", description: "Read authority, pause status and durable execution outcomes. Contains no keys.", schema: empty },
];

// Keep in the trusted worker process. Serialize only `tools`, never this client/configuration.
export class ExecutionToolClient {
  #token: string; #url: string; #fetch: typeof fetch;
  readonly tools = definitions.map(d => ({ name: d.name, description: d.description, inputSchema: z.toJSONSchema(d.schema) }));
  constructor(options: { token: string; url?: string; fetcher?: typeof fetch }) {
    if (!/^[0-9a-f]{64}$/.test(options.token)) throw new Error("A dedicated worker credential is required.");
    this.#url = options.url ?? "http://127.0.0.1:8788";
    if (!/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(this.#url)) throw new Error("This local signer client only supports loopback HTTP.");
    this.#token = options.token; this.#fetch = options.fetcher ?? fetch;
  }
  async invoke(name: string, input: unknown): Promise<unknown> {
    const d = definitions.find(d => d.name === name);
    if (!d) throw new Error("Tool denied. No transfer, withdrawal, raw-signing or account-control tools are exposed.");
    const parsed = d.schema.parse(input);
    let response: Response;
    try {
      response = await this.#fetch(`${this.#url}/worker`, { method: "POST", redirect: "error", headers: { Authorization: `Bearer ${this.#token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, input: parsed }), signal: AbortSignal.timeout(45_000) });
    } catch { throw new Error("Signer outcome unavailable. Query execution.status and reconcile; do not resubmit under a new proposal."); }
    const payload = await response.json() as { error?: string; result?: unknown };
    if (!response.ok) throw new Error(payload.error ?? "Signer rejected the tool call.");
    return payload.result;
  }
}
