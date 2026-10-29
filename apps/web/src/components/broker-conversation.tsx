"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import type { ConnectionView } from "../server/broker-connections";
import type { BrokerCommand } from "./broker-intent";

const endpoint = "/api/v1/brokers/tiger";
const waiting = (view: ConnectionView | null) => view?.phase === "starting" || view?.phase === "authorizing";

export function useBrokerConversation() {
  const [state, setState] = useState<ConnectionView | null>(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null), [visible, setVisible] = useState(false);
  const popup = useRef<Window | null>(null), openedUrl = useRef<string | null>(null);
  const running = useRef(false), latest = useRef<ConnectionView | null>(null);
  const initialization = useRef<Promise<void> | null>(null);
  function update(value: ConnectionView) { latest.current = value; setState(value); }
  async function load(signal?: AbortSignal) {
    const response = await fetch(endpoint, { cache: "no-store", signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Couldn’t check your broker connection.");
    if (!signal?.aborted) update(body);
  }
  useEffect(() => {
    const controller = new AbortController();
    // Opening the conversation reads only local status. It never starts OAuth,
    // refreshes a broker token or dispatches a model request.
    initialization.current = load(controller.signal).catch(() => {});
    return () => controller.abort();
  }, []);
  const pending = waiting(state);
  useEffect(() => {
    if (!pending) return;
    let stopped = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { await load(controller.signal); if (!stopped) setError(null); }
      catch (error) { if (!stopped) setError(error instanceof Error ? error.message : "Couldn’t check Tiger. Try again."); }
      finally { if (!stopped) timer = setTimeout(poll, 1500); }
    };
    timer = setTimeout(poll, 1500);
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [pending]);
  useEffect(() => {
    if (state?.authorizeUrl && openedUrl.current !== state.authorizeUrl && popup.current && !popup.current.closed) {
      openedUrl.current = state.authorizeUrl; popup.current.location.href = state.authorizeUrl;
    }
    if (state && !waiting(state) && popup.current) { popup.current.close(); popup.current = null; }
  }, [state]);
  async function send(command: BrokerCommand) {
    if (running.current) return false;
    running.current = true; setBusy(true); setError(null); setVisible(true);
    if (command.action === "connect") {
      // Keep the conversation open while Tiger handles its own login/consent.
      popup.current = window.open("about:blank", "_blank");
      if (popup.current) {
        popup.current.opener = null;
        popup.current.document.title = "Connecting to Tiger…";
        popup.current.document.body.textContent = "Opening Tiger sign-in. Return to your Pip conversation when you’re done.";
      }
      openedUrl.current = null;
    }
    try {
      if (!latest.current) await initialization.current;
      if (!latest.current) await load();
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Couldn’t update your broker connection.");
      update(body); return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t update your broker connection.");
      if (command.action === "connect") { popup.current?.close(); popup.current = null; }
      return false;
    } finally { running.current = false; setBusy(false); }
  }
  return { state, busy, error, visible, send, setError, setVisible };
}

export function BrokerConversationActions({ state, busy, send }: {
  state: ConnectionView; busy: boolean; send: (command: BrokerCommand) => Promise<boolean>;
}) {
  const pending = waiting(state);
  return <div className="pip-broker-actions" role="group" aria-label="Broker connection actions">
    {pending && <>
      <span className="pip-broker-wait" role="status"><LoaderCircle size={14} className="spin" /> Waiting for Tiger</span>
      {state.authorizeUrl && <a href={state.authorizeUrl} className="secondary-button" target="_blank" rel="noopener noreferrer">Continue to Tiger <ArrowUpRight size={14} /></a>}
      <button className="quiet-button" disabled={busy} onClick={() => void send({ action: "cancel" })}>Cancel connection</button>
    </>}
    {state.phase === "choosing-account" && <>
      {state.accounts.map((account, index) => <button className="secondary-button" disabled={busy} key={account.id} onClick={() => void send({ action: "select-account", accountId: account.id })}>
        Account ending {account.label.slice(-4)}{state.accounts.filter(row => row.label === account.label).length > 1 ? ` (${index + 1})` : ""}
      </button>)}
      <button className="quiet-button" disabled={busy} onClick={() => void send({ action: "cancel" })}>Cancel connection</button>
    </>}
    {state.phase === "connected" && <button className="quiet-button" disabled={busy} onClick={() => void send({ action: "disconnect" })}>Disconnect Tiger</button>}
    {!["starting", "authorizing", "choosing-account", "connected"].includes(state.phase) && <>
      <button className="secondary-button" disabled={busy} onClick={() => void send({ action: "connect" })}>{busy && <LoaderCircle size={14} className="spin" />}{state.phase === "reconnect" ? "Reconnect Tiger" : "Connect Tiger"}<ArrowUpRight size={14} /></button>
      <details className="pip-broker-help"><summary>Connection help</summary><p>This local preview works on the computer running Pip. Tiger may require <a href="https://developer.itigerup.com" target="_blank" rel="noopener noreferrer">OpenAPI activation</a>. Sign in and enter verification codes only on Tiger’s site.</p></details>
    </>}
  </div>;
}
