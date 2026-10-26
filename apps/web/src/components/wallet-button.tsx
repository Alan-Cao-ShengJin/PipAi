"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, Check, LoaderCircle } from "lucide-react";
import { connectBrowserWallet, discoverBrowserWallets, walletError, walletRequest, type WalletState } from "./browser-wallet";

export function WalletButton({ onChange, compact = false, setup = false }: { onChange?: (state: WalletState) => void; compact?: boolean; setup?: boolean }) {
  const [state, setState] = useState<WalletState>({ connected: false });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const attempt = useRef(0);
  useEffect(() => {
    const stopDiscovery = discoverBrowserWallets(); let mounted = true; const initialAttempt = attempt.current;
    walletRequest<WalletState>().then(s => { if (mounted && attempt.current === initialAttempt) { setState(s); onChange?.(s); } }).catch(() => { /* A connection attempt shows actionable errors. */ });
    return () => { mounted = false; stopDiscovery(); };
  }, [onChange]);
  async function connect() {
    if (busy) return;
    attempt.current++;
    setBusy(true); setMessage("");
    try { const s = await connectBrowserWallet(); setState(s); onChange?.(s); }
    catch (e) { setMessage(walletError(e)); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    attempt.current++;
    setBusy(true); setMessage("");
    try { const s = await walletRequest<WalletState>({ action: "disconnect" }); setState(s); onChange?.(s); }
    catch (e) { setMessage(walletError(e)); }
    finally { setBusy(false); }
  }
  return <div className={`wallet-button-group ${compact ? "compact" : ""}`}>
    {state.connected && setup ? <div className="setup-wallet-row"><Check size={16} aria-hidden="true" /><span>Wallet</span><span className="setup-row-state">Connected</span><details className="setup-wallet-menu"><summary aria-label="Wallet settings" title={state.address}>{state.address.slice(0, 6)}…{state.address.slice(-4)}</summary><button disabled={busy} onClick={() => void disconnect()}>Disconnect</button></details></div> : state.connected ? <>
      <a className="wallet-connected" href="/connect"><Check size={14} strokeWidth={1.5} /><span>{state.address.slice(0, 6)}…{state.address.slice(-4)}</span></a>
      {!compact && <button className="wallet-secondary" disabled={busy} onClick={() => void disconnect()}>Disconnect</button>}
    </> : <button className="wallet-connect-button" disabled={busy} onClick={() => void connect()}>
      {busy ? <LoaderCircle size={16} className="spin" /> : !compact && <Wallet size={17} strokeWidth={1.5} />}{busy ? "Confirm in wallet…" : "Connect wallet"}
    </button>}
    {message && <p className="wallet-button-error" role="alert">{message}</p>}
  </div>;
}
