import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildApp } from "../src/server/app.js";

/**
 * Vercel serverless entry. All routes are rewritten to this single function
 * (see vercel.json), which hands the request to the same Express app used
 * locally. The app is built once per warm instance and cached.
 */
let appPromise: ReturnType<typeof buildApp> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  appPromise ??= buildApp();
  const app = await appPromise;
  return (app as unknown as (req: VercelRequest, res: VercelResponse) => void)(req, res);
}
