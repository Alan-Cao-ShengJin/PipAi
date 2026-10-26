export function GET() {
  return Response.json({ status: "ok", mode: "local-demo", liveExecution: false, modelCalls: false });
}
