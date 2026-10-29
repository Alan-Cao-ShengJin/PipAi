import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Authentication metadata only. No prompt, inference endpoint, retry, or fallback.
export async function checkOpenAIConnection(apiKey, fetcher = fetch) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return { provider: "openai", authenticated: false, error: "NOT_CONFIGURED", generationRequests: 0 };
  }
  try {
    const response = await fetcher("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return { provider: "openai", authenticated: false, status: response.status, error: "AUTH_NOT_VERIFIED", generationRequests: 0 };
    }
    const result = await response.json();
    if (!Array.isArray(result?.data) || !result.data.every(model => typeof model?.id === "string")) {
      return { provider: "openai", authenticated: false, error: "INVALID_RESPONSE", generationRequests: 0 };
    }
    return { provider: "openai", authenticated: true, modelCount: result.data.length, generationRequests: 0 };
  } catch {
    return { provider: "openai", authenticated: false, error: "CONNECTION_NOT_VERIFIED", generationRequests: 0 };
  }
}

export function projectOpenAIKey() {
  // Use only the user's project-local ignored files; never read credentials from the example.
  for (const name of [".env.local", ".env"]) {
    const path = resolve(root, name);
    if (!existsSync(path)) continue;
    const values = parseEnv(readFileSync(path, "utf8"));
    if (values.OPENAI_API_KEY?.trim()) return values.OPENAI_API_KEY;
  }
  return undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) {
    console.error("This command accepts no prompts, model names, credentials or endpoint overrides.");
    process.exitCode = 2;
  } else {
    try {
      const result = await checkOpenAIConnection(projectOpenAIKey());
      console.log(JSON.stringify(result, null, 2));
      if (!result.authenticated) process.exitCode = 1;
    } catch {
      console.error("Could not read the local environment configuration; no generation was requested.");
      process.exitCode = 1;
    }
  }
}
