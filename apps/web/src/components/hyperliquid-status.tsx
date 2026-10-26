"use client";

import { useEffect, useState } from "react";
import { walletRequest } from "./browser-wallet";
import { checkingHyperliquid, readHyperliquidConnection, type HyperliquidConnection } from "./hyperliquid-connection";

export function HyperliquidStatus({ refreshKey, onOpen, setup = false, onChange }: { refreshKey?: unknown; onOpen?: () => void; setup?: boolean; onChange?: (connection: HyperliquidConnection) => void }) {
  const [connection, setConnection] = useState<HyperliquidConnection>(checkingHyperliquid);
  useEffect(() => {
    let mounted = true, running = false;
    const controller = new AbortController();
    setConnection(checkingHyperliquid);
    async function refresh() {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const next = await readHyperliquidConnection(body => walletRequest(body, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)])));
        if (mounted && !document.hidden) setConnection(next);
      } finally { running = false; }
    }
    const visibility = () => {
      if (document.visibilityState === "hidden") setConnection(checkingHyperliquid);
      else void refresh();
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("focus", refresh);
    return () => { mounted = false; controller.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("focus", refresh); };
  }, [refreshKey]);
  useEffect(() => {
    if (connection.state !== "connected" || !connection.validUntil) return;
    const expiry = window.setTimeout(() => setConnection(checkingHyperliquid), Math.max(0, connection.validUntil - Date.now()));
    return () => window.clearTimeout(expiry);
  }, [connection]);
  useEffect(() => { onChange?.(connection); }, [connection, onChange]);
  if (setup) return <div className={`hyperliquid-status setup-hyperliquid-row ${connection.state === "connected" ? "is-connected" : ""}`} title={connection.detail} role="status" aria-live="polite"><span className="hyperliquid-light" aria-hidden="true" /><span>Hyperliquid</span><span className="hyperliquid-network">Mainnet · Read only</span><span className="setup-row-state">{connection.state === "connected" ? "Connected" : connection.state === "checking" ? "Checking…" : "Not connected"}</span></div>;
  return <a className={`hyperliquid-status ${connection.state === "connected" ? "is-connected" : ""}`} href="/connect#hyperliquid" onClick={onOpen} title={connection.detail} aria-label={`${connection.label}. Mainnet. Read only. ${connection.detail}`}>
    <span className="hyperliquid-light" aria-hidden="true" /><span>{connection.label}</span><span className="hyperliquid-network">Mainnet · Read only</span>
  </a>;
}
