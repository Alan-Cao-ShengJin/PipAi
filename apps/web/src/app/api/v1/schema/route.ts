import { contractSchemas } from "@pip/domain";

export function GET() { return Response.json(contractSchemas()); }
