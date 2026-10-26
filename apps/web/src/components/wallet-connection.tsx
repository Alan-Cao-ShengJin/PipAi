"use client";

import { useCallback, useState } from "react";
import { WalletButton } from "./wallet-button";
import { HyperliquidStatus } from "./hyperliquid-status";
import { checkingHyperliquid, type HyperliquidConnection } from "./hyperliquid-connection";
import type { WalletState } from "./browser-wallet";

export function WalletConnection() {
  const [wallet, setWallet] = useState<WalletState>({ connected: false });
  const [connection, setConnection] = useState<HyperliquidConnection>(checkingHyperliquid);
  const [retry, setRetry] = useState(0);
  const onWallet = useCallback((state: WalletState) => { setWallet(state); setConnection(checkingHyperliquid); }, []);
  const connected = wallet.connected && connection.state === "connected";
  const account = connected ? connection.account : undefined;
  return <main className="connection-page connection-setup">
    <a href="/">← Back to chat</a>
    <section id="hyperliquid" className="setup-panel" aria-labelledby="setup-title">
      <h1 id="setup-title">{connected ? "You’re connected" : "Connect Hyperliquid"}</h1>
      <p className="setup-intro">{connected ? "Your Hyperliquid mainnet account is connected for read-only access." : !wallet.connected ? "Connect MetaMask to view your Hyperliquid mainnet account." : connection.state === "checking" ? "Checking your mainnet account…" : connection.detail}</p>
      <div className="setup-connections">
        <WalletButton onChange={onWallet} setup />
        {wallet.connected && <HyperliquidStatus refreshKey={`${wallet.address}:${retry}`} setup onChange={setConnection} />}
      </div>
      {wallet.connected && <div className="setup-next-action">
        {connected ? <a className="primary-button" href="/">Back to chat</a> : <button className="primary-button" disabled={connection.state === "checking"} onClick={() => setRetry(value => value + 1)}>{connection.state === "checking" ? "Checking connection…" : "Check connection"}</button>}
      </div>}
      <p className="setup-assurance">Read only. Pip cannot place trades, move funds or withdraw.</p>
      {account && <details className="connection-section">
        <summary>Account details</summary>
        <p>Core perps account value: ${account.corePerpsEquityUsd}</p>
        <p>Core perps positions: {account.corePerpsPositions} · Core and spot open orders: {account.coreAndSpotOpenOrders}</p>
        <p>Spot balances: {account.spotBalances.length ? account.spotBalances.map(balance => `${balance.total} ${balance.coin}`).join(", ") : "None"}</p>
        <p className="fine-print">Checked {new Date(account.observedAt).toLocaleTimeString()}. This view covers core perpetuals and spot; builder-deployed markets are not included.</p>
        <a href="https://app.hyperliquid.xyz/" target="_blank" rel="noreferrer">Open Hyperliquid</a>
      </details>}
    </section>
  </main>;
}
