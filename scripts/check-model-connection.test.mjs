import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOpenAIConnection } from "./check-model-connection.mjs";

test("checks only a fixed metadata endpoint without a prompt or generation", async () => {
  let count = 0;
  const result = await checkOpenAIConnection("fixture-key", async (url, options) => {
    count++;
    assert.equal(url, "https://api.openai.com/v1/models");
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.body, undefined);
    assert.equal(options.headers.Authorization, "Bearer fixture-key");
    return Response.json({ data: [{ id: "fixture-model" }] });
  });
  assert.equal(count, 1);
  assert.deepEqual(result, { provider: "openai", authenticated: true, modelCount: 1, generationRequests: 0 });
  assert.ok(!JSON.stringify(result).includes("fixture-key"));
});

test("missing configuration makes no network request", async () => {
  const result = await checkOpenAIConnection("", () => { throw new Error("must not run"); });
  assert.equal(result.error, "NOT_CONFIGURED");
});

test("authorization errors are not retried and do not print response bodies", async () => {
  let count = 0;
  const result = await checkOpenAIConnection("fixture-key", async () => {
    count++;
    return new Response("SECRET_SERVER_RESPONSE", { status: 403 });
  });
  assert.equal(count, 1);
  assert.equal(result.status, 403);
  assert.ok(!JSON.stringify(result).includes("SECRET"));
});

test("network errors and malformed success responses remain unverified", async () => {
  const network = await checkOpenAIConnection("fixture-key", async () => { throw new Error("SECRET_TOKEN"); });
  assert.equal(network.error, "CONNECTION_NOT_VERIFIED");
  assert.ok(!JSON.stringify(network).includes("SECRET"));
  const shape = await checkOpenAIConnection("fixture-key", async () => Response.json({ error: "not a model list" }));
  assert.equal(shape.error, "INVALID_RESPONSE");
});
