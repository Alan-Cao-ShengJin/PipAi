import { NextRequest, NextResponse } from "next/server";
import { BROKER_COOKIE, BROKER_SESSION_SECONDS, BrokerError, getBrokerConnections, localBrokerRequest } from "@/server/broker-connections";
import { isSameOrigin } from "@/server/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
function unavailable() { return NextResponse.json({ error: "This broker preview works on the computer running Pip. Hosted connections are not available yet." }, { status: 403, headers }); }
export async function GET(request: NextRequest) {
  if (!localBrokerRequest(request)) return unavailable();
  try {
    const service = getBrokerConnections();
    const cookie = request.cookies.get(BROKER_COOKIE)?.value;
    const token = cookie && service.store.read(cookie) ? cookie : service.store.create();
    const response = NextResponse.json(service.view(token), { headers });
    if (token !== cookie) response.cookies.set(BROKER_COOKIE, token, {
      httpOnly: true, sameSite: "strict", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: BROKER_SESSION_SECONDS,
    });
    return response;
  } catch { return NextResponse.json({ error: "Broker connections could not be opened. Reload to try again." }, { status: 503, headers }); }
}
export async function POST(request: NextRequest) {
  if (!localBrokerRequest(request) || !isSameOrigin(request)) return unavailable();
  try {
    if (request.headers.get("content-type") !== "application/json") throw new BrokerError("Send a connection command as JSON.", 415);
    if (Number(request.headers.get("content-length") ?? 0) > 1024) throw new BrokerError("Connection command is too large.", 413);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1024) throw new BrokerError("Connection command is too large.", 413);
    let command;
    try { command = JSON.parse(raw); } catch { throw new BrokerError("Invalid connection command."); }
    if (!command || typeof command !== "object" || Array.isArray(command)) throw new BrokerError("Invalid connection command.");
    const keys = Object.keys(command).sort().join(",");
    const service = getBrokerConnections(), token = request.cookies.get(BROKER_COOKIE)?.value;
    if (!token || !service.store.read(token)) throw new BrokerError("Reload broker connections to continue.", 401);
    let state;
    if (command.action === "show" && keys === "action") state = service.show(token);
    else if (command.action === "connect" && keys === "action") state = service.start(token);
    else if (command.action === "disconnect" && keys === "action") state = service.disconnect(token);
    else if (command.action === "cancel" && keys === "action") state = service.disconnect(token, true);
    else if (command.action === "select-account" && keys === "accountId,action" && typeof command.accountId === "string") state = service.select(token, command.accountId);
    else throw new BrokerError("Unsupported connection command.");
    return NextResponse.json(state, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof BrokerError ? error.message : "Tiger could not connect. Try again." }, { status: error instanceof BrokerError ? error.status : 503, headers });
  }
}
