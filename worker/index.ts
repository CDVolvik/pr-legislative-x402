import { httpServerHandler } from "cloudflare:node";
import { buildApp } from "../src/server/app.js";

/**
 * Cloudflare Workers entry. The same Express app that serves locally and on
 * Vercel listens on a loopback port inside the Worker, and the Node.js HTTP
 * server bridge hands each incoming request to it. public/index.html is
 * served by the static assets binding before the Worker runs, so the app
 * only sees /health, /v1/* and anything unmatched (which it answers 404).
 */
const port = 4021;
const app = await buildApp();
app.listen(port);

export default httpServerHandler({ port });
