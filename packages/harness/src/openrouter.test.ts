import { describe, expect, it, vi } from "vitest";
import { HTTPClient } from "@openrouter/sdk/lib/http.js";
import { OpenRouterAdapter } from "./openrouter.ts";
import { buildModelContext, type ResearchContext } from "./contracts.ts";

function request() {
  const facts: ResearchContext = {
    scope: { tenantId: "test", accountId: "test", conversationId: "test", runId: "test", allowedReadTools: [] },
    goal: "Synthetic transport contract test", mandate: { id: "test", version: 1, status: "approved", authority: "paper-only", maxExposurePct: 0, maxPositionPct: 0, allowedSymbols: [] },
    portfolio: { id: "test", asOf: new Date().toISOString(), dataMode: "synthetic", cashCents: 100000, positions: [] },
  };
  return { context: buildModelContext(facts), messages: [], tools: [], maxOutputTokens: 1000, signal: new AbortController().signal };
}
function response(overrides: Record<string, unknown> = {}) {
  return { id: "test-generation", object: "chat.completion", created: 1, model: "test/model", system_fingerprint: null,
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: '{"type":"example"}' } }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0.0000001 }, ...overrides };
}
function transport(body: unknown, status = 200) {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  const client = new HTTPClient({ fetcher });
  return { fetcher, model: new OpenRouterAdapter({ apiKey: "not-a-real-key", model: "test/model", httpClient: client }) };
}
describe("OpenRouter SDK transport contract (mock HTTP only)", () => {
  it("uses bounded JSON output, explicit model, fixed origin and no automatic retries/fallbacks", async () => {
    const x = transport(response()); const receipt = await x.model.complete(request());
    expect(receipt).toMatchObject({ output: { type: "example" }, usage: { inputTokens: 10, outputTokens: 5, costMicros: 1 }, finishReason: "stop" });
    expect(x.fetcher).toHaveBeenCalledTimes(1);
    const sent = x.fetcher.mock.calls[0] as unknown as [Request];
    const httpRequest = sent[0];
    expect(httpRequest.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(await httpRequest.clone().text());
    expect(body).toMatchObject({ model: "test/model", max_tokens: 1000, stream: false, response_format: { type: "json_object" },
      provider: { allow_fallbacks: false, require_parameters: true, data_collection: "deny" } });
    expect(JSON.stringify(body)).not.toContain("tenantId");
    expect(JSON.stringify(body)).not.toContain("not-a-real-key");
  });
  it("retains known cost when content is malformed", async () => {
    const x = transport(response({ choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: 'bad-json' } }] }));
    expect(await x.model.complete(request())).toMatchObject({ output: null, usage: { costMicros: 1 } });
  });
  it("never accepts a token-truncated JSON object as a tool dispatch", async () => {
    const x = transport(response({ choices: [{ index: 0, finish_reason: "length", message: { role: "assistant", content: '{"type":"tools","calls":[]}' } }] }));
    expect(await x.model.complete(request())).toMatchObject({ output: null, finishReason: "length", usage: { costMicros: 1 } });
  });
  it("requires actual provider cost metadata", async () => {
    const x = transport(response({ usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }));
    await expect(x.model.complete(request())).rejects.toMatchObject({ code: "UNRESOLVED_CALL" });
  });
  it("does not retry an HTTP error", async () => {
    const x = transport({ error: { message: "test upstream failure", code: 429 } }, 429);
    await expect(x.model.complete(request())).rejects.toBeDefined(); expect(x.fetcher).toHaveBeenCalledTimes(1);
  });
  it("requires an explicit key and model configuration", () => {
    expect(() => new OpenRouterAdapter({ apiKey: "", model: "test/model" })).toThrow(/Configure/);
    expect(() => new OpenRouterAdapter({ apiKey: "not-a-real-key", model: "" })).toThrow();
  });
});
