/**
 * Stand-in for body-parser inside the Worker bundle.
 *
 * Express 4 loads body-parser at import time, and body-parser pulls in
 * iconv-lite, whose package.json "browser" field replaces its streams module
 * with an empty one. The bundler honours that field, so the Worker crashed on
 * start with "require_streams(...) is not a function". This API is GET-only
 * and never parses a request body, so the four parsers are replaced with
 * pass-through middleware. If a POST route is ever added, parse the body in
 * the route with req.on("data") or move to a Workers-native body reader.
 */
import type { NextFunction, Request, Response } from "express";

const passThrough = () => (_req: Request, _res: Response, next: NextFunction) => next();

export const json = passThrough;
export const raw = passThrough;
export const text = passThrough;
export const urlencoded = passThrough;
export default { json, raw, text, urlencoded };
