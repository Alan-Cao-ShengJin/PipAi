import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./request-origin";

describe("workspace request origin", () => {
  function request(origin?: string, host = "127.0.0.1:3000", extra: Record<string, string> = {}) {
    return new Request("http://localhost:3000/api/v1/workspace", {
      method: "POST", headers: { Host: host, ...(origin ? { Origin: origin } : {}), ...extra },
    });
  }

  it("accepts the browser origin when Next normalizes the internal hostname", () => {
    expect(isSameOrigin(request("http://127.0.0.1:3000"))).toBe(true);
    expect(isSameOrigin(request("http://localhost:3000", "localhost:3000"))).toBe(true);
  });

  it("rejects absent, null, foreign, wrong-port and wrong-protocol origins", () => {
    for (const origin of [undefined, "null", "https://outside.example", "http://127.0.0.1:3001", "https://127.0.0.1:3000", "http://localhost:3000"]) {
      expect(isSameOrigin(request(origin))).toBe(false);
    }
  });

  it("does not allow forwarded headers to override the actual host", () => {
    expect(isSameOrigin(request("https://outside.example", "127.0.0.1:3000", {
      "X-Forwarded-Host": "outside.example", "X-Forwarded-Proto": "https",
    }))).toBe(false);
  });
});
