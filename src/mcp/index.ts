#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SearchInput, GetBillInput } from "../data/schema.js";
import { makePayFetch } from "./pay-fetch.js";

/**
 * MCP server exposing Puerto Rico legislative data to any agent (Claude Code,
 * OpenClaw, etc.). Tools call the x402 HTTP API; when the server charges, the
 * agent auto-pays via its own wallet (see pay-fetch.ts).
 */
const API_BASE = (process.env.PR_X402_API_BASE ?? "http://localhost:4021").replace(/\/$/, "");

const server = new McpServer({
  name: "pr-legislative-mcp",
  version: "0.1.0",
});

let payFetch: typeof fetch | null = null;
async function api(path: string): Promise<unknown> {
  payFetch ??= await makePayFetch();
  const res = await payFetch(`${API_BASE}${path}`);
  if (res.status === 402) {
    throw new Error(
      "Payment required (402) and no funded wallet configured. Set WALLET_PRIVATE_KEY, or point PR_X402_API_BASE at an open dev server.",
    );
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

server.tool(
  "search_pr_legislation",
  "Search measures (proyectos y resoluciones) of the Puerto Rico Legislative Assembly by text, chamber, or status. Returns summary rows.",
  SearchInput.shape,
  async (args) => {
    const qs = new URLSearchParams();
    if (args.query) qs.set("q", args.query);
    if (args.chamber) qs.set("chamber", args.chamber);
    if (args.status) qs.set("status", args.status);
    if (args.limit) qs.set("limit", String(args.limit));
    const data = await api(`/v1/bills/search?${qs.toString()}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_pr_bill",
  "Get full detail for one Puerto Rico legislative measure by identifier: abstract, sponsors, and action history.",
  GetBillInput.shape,
  async (args) => {
    const data = await api(`/v1/bills/${encodeURIComponent(args.identifier)}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`pr-legislative-mcp ready — API base ${API_BASE}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
