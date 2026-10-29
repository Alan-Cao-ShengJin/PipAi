import { describe, expect, it } from "vitest";
import { brokerIntent } from "./broker-intent";
import type { ConnectionView } from "../server/broker-connections";

const disconnected: ConnectionView = { broker: "tiger", phase: "disconnected", accounts: [] };
const choosing: ConnectionView = { broker: "tiger", phase: "choosing-account", accounts: [
  { id: "own-a", label: "account-1234", type: "STANDARD" }, { id: "own-b", label: "account-5678", type: "STANDARD" },
] };
describe("broker conversation shortcuts (no model calls)", () => {
  it.each(["connect Tiger", "Please connect my Tiger account.", "Can you link my Tiger Brokers account?", "reconnect Tiger"])("routes explicit Tiger intent: %s", text => {
    expect(brokerIntent(text, disconnected, false)).toEqual({ kind: "command", command: { action: "connect" } });
  });
  it.each(["connect broker", "connect my brokerage account", "show my broker accounts", "broker accounts"])("offers supported broker discovery: %s", text => {
    expect(brokerIntent(text, disconnected, false)).toEqual({ kind: "command", command: { action: "show" } });
  });
  it.each(["Don’t connect Tiger", "Do not connect Tiger", "Should I connect Tiger", "I want to grow savings using Tiger", "5000"])("leaves unrelated or uncertain intent out of broker actions: %s", text => {
    expect(brokerIntent(text, disconnected, false)).toBeNull();
  });
  it("resolves typed endings only from the current authorized account choices", () => {
    for (const value of ["5678", "use 5678", "account ending 5678", "Choose account 5678"]) {
      expect(brokerIntent(value, choosing, true)).toEqual({ kind: "command", command: { action: "select-account", accountId: "own-b" } });
    }
    expect(brokerIntent("9012", choosing, true)?.kind).toBe("help");
    expect(brokerIntent("5678", disconnected, true)).toBeNull();
    const collision = { ...choosing, accounts: choosing.accounts.map(row => ({ ...row, label: "account-1234" })) };
    expect(brokerIntent("1234", collision, true)?.kind).toBe("help");
  });
  it("cancels an active flow without interpreting stop as permission to disconnect a completed account", () => {
    expect(brokerIntent("cancel", choosing, true)).toEqual({ kind: "command", command: { action: "cancel" } });
    expect(brokerIntent("cancel", { ...disconnected, phase: "connected" }, true)).toBeNull();
    expect(brokerIntent("disconnect Tiger", choosing, true)).toEqual({ kind: "command", command: { action: "disconnect" } });
  });
  it("keeps unrecognized replies during sign-in out of paper profile answers", () => {
    for (const phase of ["starting", "authorizing", "choosing-account"] as const) {
      const result = brokerIntent("PRIVATE_PASSWORD_OR_CODE", { ...choosing, phase }, true);
      expect(result?.kind).toBe("help"); expect(JSON.stringify(result)).not.toContain("PRIVATE_PASSWORD_OR_CODE");
    }
  });
  it("does not silently link Tiger when a user requests an unsupported broker", () => {
    expect(brokerIntent("connect Robinhood", disconnected, false)?.kind).toBe("help");
  });
});
