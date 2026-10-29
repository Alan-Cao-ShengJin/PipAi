import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrokerConnections, BrokerStore, localBrokerRequest, type Launch } from "./broker-connections";

const directories: string[] = [], services: BrokerConnections[] = [];
afterEach(() => { for (const service of services.splice(0)) service.close(); for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
const account = (id = "a".repeat(32), label = "account-1234") => ({ id, label, type: "STANDARD" });
function setup() {
  const path = mkdtempSync(join(tmpdir(), "pip-brokers-")); directories.push(path);
  const jobs: { home: string; event: (value: unknown) => void; done: (ok: boolean) => void; cancel: ReturnType<typeof vi.fn> }[] = [];
  const launch: Launch = (home, event, done) => {
    const cancel = vi.fn(() => done(false));
    jobs.push({ home, event: value => { try { event(value); } catch { done(false); } }, done, cancel });
    return cancel;
  };
  const store = new BrokerStore(join(path, "connections.sqlite"), join(path, "private"));
  const service = new BrokerConnections(store, launch); services.push(service);
  return { path, service, store, jobs, token: store.create() };
}
function approved(job: ReturnType<typeof setup>["jobs"][number], accounts = [account()]) {
  job.event({ event: "accounts", authorized: true, expiresAtMs: Date.now() + 60_000, accounts }); job.done(true);
}
function url(extra: Record<string, string> = {}) {
  return "https://openapi-oauth2.tigerfintech.com/oauth2/authorize?" + new URLSearchParams({
    response_type: "code", redirect_uri: "http://127.0.0.1:5555/callback", scope: "api.basic:read api.quote:read api.account:read api.trade:read",
    client_id: "fake", state: "fake-state", code_challenge: "fake-challenge", code_challenge_method: "S256", ...extra,
  });
}

describe("local browser broker connection boundaries (no broker calls)", () => {
  it("persists conversational prompts separately for each owner without starting OAuth", () => {
    const x = setup(), other = x.store.create();
    const shown = x.service.show(x.token);
    expect(shown.messages?.at(-1)?.content).toContain("I can connect Tiger Brokers");
    expect(x.jobs).toHaveLength(0);
    expect(x.service.view(other).messages ?? []).toEqual([]);
    const reopened = new BrokerStore(join(x.path, "connections.sqlite"), x.store.homes);
    try { expect(reopened.read(x.token)?.messages).toEqual(shown.messages); } finally { reopened.close(); }
  });
  it("journals verified connection outcomes without credentials or sign-in URLs", () => {
    const x = setup(); x.service.start(x.token);
    x.jobs[0].event({ event: "authorize", url: url() });
    approved(x.jobs[0], [account(), account("b".repeat(32), "account-5678")]);
    expect(x.service.view(x.token).messages?.at(-1)?.content).toContain("Which account should I use");
    const result = x.service.select(x.token, "b".repeat(32));
    expect(result.messages?.at(-1)?.content).toContain("account ending 5678 is connected");
    expect(JSON.stringify(result.messages)).not.toContain("fake-challenge");
    expect(JSON.stringify(result.messages)).not.toContain("oauth2/authorize");
    const count = result.messages?.length;
    x.service.view(x.token); expect(x.service.view(x.token).messages).toHaveLength(count!);
    const cancelled = x.service.disconnect(x.token, true);
    expect(cancelled.messages?.at(-1)?.content).toContain("cancelled");
    x.jobs[0].event({ event: "accounts", authorized: true, expiresAtMs: Date.now() + 60_000, accounts: [account()] });
    expect(x.service.view(x.token).messages).toEqual(cancelled.messages);
  });
  it("bounds the local broker transcript", () => {
    const x = setup();
    for (let n = 0; n < 60; n++) x.service.show(x.token);
    expect(x.service.view(x.token).messages).toHaveLength(100);
  });
  it("isolates owners, private homes and account selection", () => {
    const x = setup(), other = x.store.create();
    x.service.start(x.token); x.service.start(other);
    expect(x.jobs[0].home).not.toBe(x.jobs[1].home);
    approved(x.jobs[0], [account(), account("b".repeat(32), "account-5678")]);
    approved(x.jobs[1], [account("c".repeat(32), "account-9012"), account("d".repeat(32))]);
    expect(() => x.service.select(other, "a".repeat(32))).toThrow(/own Tiger connection/);
    expect(x.service.select(x.token, "b".repeat(32)).selectedAccount?.label).toBe("account-5678");
    expect(x.service.view(other).phase).toBe("choosing-account");
    expect(JSON.stringify(x.service.view(x.token))).not.toContain("attemptId");
    expect(JSON.stringify(x.service.view(x.token))).not.toContain(x.path);
    expect(x.store.read("forged")).toBeNull();
    expect(() => x.service.start("forged")).toThrow(/fresh session/);
    expect(statSync(x.store.homes).mode & 0o777).toBe(0o700);
  });
  it("does not start authorization or broker reads when opening status", () => {
    const x = setup();
    expect(x.service.view(x.token).phase).toBe("disconnected"); expect(x.jobs).toHaveLength(0);
  });
  it("uses a single ongoing attempt and allows only fixed Tiger read-only PKCE URLs", () => {
    const x = setup(); x.service.start(x.token); x.service.start(x.token);
    expect(x.jobs).toHaveLength(1);
    x.jobs[0].event({ event: "authorize", url: url() });
    expect(x.service.view(x.token).authorizeUrl).toBe(url());
    approved(x.jobs[0]);
    expect(x.service.view(x.token)).toMatchObject({ phase: "connected", selectedAccount: account() });
    expect(x.service.view(x.token).authorizeUrl).toBeUndefined();
  });
  it.each([
    url().replace("openapi-oauth2.tigerfintech.com", "evil.example"),
    url({ scope: "api.trade:write" }), url({ code_challenge_method: "plain" }),
    url({ redirect_uri: "https://outside.example/callback" }),
  ])("rejects an unsafe authorization link without returning it", unsafe => {
    const x = setup(); x.service.start(x.token); x.jobs[0].event({ event: "authorize", url: unsafe });
    expect(x.service.view(x.token).phase).toBe("error");
    expect(x.service.view(x.token).authorizeUrl).toBeUndefined();
  });
  it("removes saved credentials and cannot be resurrected by late callbacks", () => {
    const x = setup(); x.service.start(x.token);
    writeFileSync(join(x.jobs[0].home, "fake-token"), "PRIVATE_FIXTURE");
    x.service.disconnect(x.token);
    expect(x.jobs[0].cancel).toHaveBeenCalledTimes(1);
    x.jobs[0].event({ event: "accounts", authorized: true, expiresAtMs: Date.now() + 60_000, accounts: [account()] });
    expect(x.service.view(x.token).phase).toBe("disconnected");
    expect(() => readFileSync(join(x.jobs[0].home, "fake-token"))).toThrow();
    x.service.start(x.token); approved(x.jobs[1]); x.service.disconnect(x.token);
    expect(x.service.view(x.token).accounts).toEqual([]);
  });
  it("marks lost pending work as interrupted, then gives retries a new private home", () => {
    const x = setup(); x.service.start(x.token);
    const second = new BrokerConnections(x.store, () => () => {});
    expect(second.view(x.token).phase).toBe("error");
    const firstHome = x.jobs[0].home;
    x.service.disconnect(x.token); x.service.start(x.token);
    expect(x.jobs[1].home).not.toBe(firstHome);
  });
  it("requires reconnect after expiry and rejects cached selection", () => {
    const x = setup(); x.service.start(x.token); approved(x.jobs[0], [account(), account("b".repeat(32))]);
    x.store.write(x.token, { ...x.store.read(x.token)!, expiresAtMs: Date.now() - 1 });
    expect(x.service.view(x.token).phase).toBe("reconnect");
    expect(() => x.service.select(x.token, account().id)).toThrow(/Reconnect/);
  });
  it("retains an expired completed connection so the SDK can refresh without another sign-in", () => {
    const x = setup(); x.service.start(x.token); approved(x.jobs[0]);
    writeFileSync(join(x.jobs[0].home, "refresh-fixture"), "PRIVATE_REFRESH_FIXTURE");
    x.store.write(x.token, { ...x.store.read(x.token)!, expiresAtMs: Date.now() - 1 });
    x.service.start(x.token);
    expect(x.jobs[1].home).toBe(x.jobs[0].home);
    expect(readFileSync(join(x.jobs[1].home, "refresh-fixture"), "utf8")).toBe("PRIVATE_REFRESH_FIXTURE");
    approved(x.jobs[1]); expect(x.service.view(x.token).phase).toBe("connected");
  });
  it("limits simultaneous authorization attempts", () => {
    const x = setup();
    for (let n = 0; n < 4; n++) x.service.start(x.store.create());
    expect(() => x.service.start(x.token)).toThrow(/Several connections/);
  });
  it("does not claim connected when account discovery fails after approval", () => {
    const x = setup(); x.service.start(x.token);
    x.jobs[0].event({ event: "error", code: "SECRET_SDK_DETAILS" }); x.jobs[0].done(false);
    const view = x.service.view(x.token);
    expect(view.phase).toBe("error"); expect(JSON.stringify(view)).not.toContain("SECRET");
  });
  it("rejects remote/rebound hosts and cross-site access even with forwarded headers", () => {
    const request = (host: string, site?: string) => new Request("http://localhost/api", { headers: {
      Host: host, "X-Forwarded-Host": "localhost", ...(site ? { "Sec-Fetch-Site": site } : {}),
    } });
    expect(localBrokerRequest(request("127.0.0.1:3000", "same-origin"))).toBe(true);
    for (const host of ["pip.example", "localhost.evil.example", "127.0.0.1.evil.example", "evil.example"]) expect(localBrokerRequest(request(host))).toBe(false);
    expect(localBrokerRequest(request("localhost:3000", "cross-site"))).toBe(false);
  });
});
