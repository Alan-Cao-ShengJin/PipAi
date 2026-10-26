import { NextRequest, NextResponse } from "next/server";
import { CommandSchema, DomainError } from "@pip/domain";
import { getStore, SESSION_COOKIE, SESSION_SECONDS } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const existing = token && getStore().read(token);
  if (existing) return NextResponse.json(existing, { headers });
  const fresh = getStore().create();
  const response = NextResponse.json(fresh.state, { headers });
  response.cookies.set(SESSION_COOKIE, fresh.token, {
    httpOnly: true, sameSite: "strict", secure: request.nextUrl.protocol === "https:",
    path: "/", maxAge: SESSION_SECONDS,
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new DomainError("This local demo only accepts same-origin requests.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new DomainError("Send an application/json command.", 415);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 8192) throw new DomainError("The command is too large.", 413);
    let json: unknown;
    try { json = JSON.parse(raw); } catch { throw new DomainError("The command must be valid JSON."); }
    const parsed = CommandSchema.safeParse(json);
    if (!parsed.success) throw new DomainError("Invalid demo command. Live execution and permission changes are not supported.");
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) throw new DomainError("Load the workspace before sending a command.", 401);
    return NextResponse.json(getStore().mutate(token, parsed.data), { headers });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    // Do not print request bodies, cookies or financial profile details.
    return NextResponse.json({ error: "The workspace could not be saved. Please try again." }, { status: 500, headers });
  }
}
