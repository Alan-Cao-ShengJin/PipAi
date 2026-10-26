import { describe, expect, it } from "vitest";
import { DemoStore } from "./store";

describe("demo persistence boundary", () => {
  it("isolates sessions and rejects forged session tokens", () => {
    const store = new DemoStore(":memory:");
    try {
      const a = store.create();
      const b = store.create();
      store.mutate(a.token, { type: "answer", step: "goal", value: "Private goal A", expectedRevision: 0 });
      expect(store.read(a.token)?.profile.goal).toBe("Private goal A");
      expect(store.read(b.token)?.profile.goal).toBeUndefined();
      expect(store.read("forged")).toBeNull();
      expect(() => store.mutate("forged", { type: "review", expectedRevision: 0 })).toThrow(/expired/);
    } finally { store.close(); }
  });
  it("serializes conflicting mutations and rolls back failed commands", () => {
    const store = new DemoStore(":memory:");
    try {
      const { token } = store.create();
      store.mutate(token, { type: "answer", step: "goal", value: "My goal", expectedRevision: 0 });
      expect(() => store.mutate(token, { type: "answer", step: "goal", value: "Conflicting goal", expectedRevision: 0 })).toThrow(/another tab/);
      expect(() => store.mutate(token, { type: "answer", step: "capitalCents", value: "-100", expectedRevision: 1 })).toThrow();
      expect(store.read(token)?.revision).toBe(1);
      expect(store.read(token)?.profile.goal).toBe("My goal");
    } finally { store.close(); }
  });
});
