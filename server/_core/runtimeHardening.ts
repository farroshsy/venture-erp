import crypto from "node:crypto";
import type { ErrorRequestHandler, Express, Request, RequestHandler, Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export type RuntimeReadiness = {
  ready: boolean;
  checkedAt: string;
  durationMs: number;
  scope: "process_and_database";
};

export type RuntimeLogEvent = {
  event: "http.request.completed";
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  at: string;
};

export type RuntimeHardeningOptions = {
  now?: () => Date;
  readinessCheck?: () => Promise<RuntimeReadiness>;
  log?: (event: RuntimeLogEvent) => void;
  rateLimit?: {
    maxRequests?: number;
    windowMs?: number;
  };
};

export const MAX_JSON_BODY_SIZE = "1mb";
export const MAX_URLENCODED_BODY_SIZE = "256kb";

type RateBucket = { count: number; resetAt: number };

function getRequestId(req: Request) {
  const supplied = req.header(REQUEST_ID_HEADER);
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
}

function requestPath(req: Request) {
  return req.path || "/";
}

function setSecurityHeaders(res: Response) {
  res.setHeader("Content-Security-Policy", "base-uri 'self'; frame-ancestors 'none'; object-src 'none'");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
}

function createRequestContextAndLog(options: RuntimeHardeningOptions): RequestHandler {
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (event => console.info(JSON.stringify(event)));

  return (req, res, next) => {
    const requestId = getRequestId(req);
    const startedAt = performance.now();
    res.locals.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    setSecurityHeaders(res);

    res.on("finish", () => {
      log({
        event: "http.request.completed",
        requestId,
        method: req.method,
        path: requestPath(req),
        statusCode: res.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        at: now().toISOString(),
      });
    });

    next();
  };
}

function createApiRateLimit(options: RuntimeHardeningOptions): RequestHandler {
  const maxRequests = options.rateLimit?.maxRequests ?? 240;
  const windowMs = options.rateLimit?.windowMs ?? 60_000;
  const buckets = new Map<string, RateBucket>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const bucket = buckets.get(key);
    const activeBucket = !bucket || bucket.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : bucket;

    if (activeBucket.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((activeBucket.resetAt - now) / 1000));
      buckets.set(key, activeBucket);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("Cache-Control", "no-store");
      res.status(429).json({ error: "too_many_requests", requestId: res.locals.requestId });
      return;
    }

    activeBucket.count += 1;
    buckets.set(key, activeBucket);
    res.setHeader("RateLimit-Limit", String(maxRequests));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - activeBucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(activeBucket.resetAt / 1000)));
    res.setHeader("Cache-Control", "no-store");
    next();
  };
}

function createApiMethodAllowlist(): RequestHandler {
  const allowed = new Set(["GET", "POST", "OPTIONS"]);
  return (req, res, next) => {
    if (allowed.has(req.method)) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.status(405).json({ error: "method_not_allowed", requestId: res.locals.requestId });
  };
}

function createRuntimeErrorHandler(): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const bodyError = error as { type?: string; status?: number };
    const status = bodyError.type === "entity.too.large" ? 413 : bodyError.type === "entity.parse.failed" ? 400 : bodyError.status && bodyError.status >= 400 && bodyError.status < 500 ? bodyError.status : 500;
    const code = status === 413 ? "payload_too_large" : status === 400 ? "invalid_request" : "internal_error";
    res.setHeader("Cache-Control", "no-store");
    res.status(status).json({ error: code, requestId: res.locals.requestId });
  };
}

export async function checkApplicationReadiness(): Promise<RuntimeReadiness> {
  const startedAt = performance.now();
  const checkedAt = new Date().toISOString();

  try {
    const db = await getDb();
    if (!db) {
      return { ready: false, checkedAt, durationMs: Math.round((performance.now() - startedAt) * 100) / 100, scope: "process_and_database" };
    }
    await db.execute(sql`SELECT 1`);
    return { ready: true, checkedAt, durationMs: Math.round((performance.now() - startedAt) * 100) / 100, scope: "process_and_database" };
  } catch {
    return { ready: false, checkedAt, durationMs: Math.round((performance.now() - startedAt) * 100) / 100, scope: "process_and_database" };
  }
}

export function getRuntimeHardeningProfile() {
  return {
    scope: "single managed Node process; request-time controls only" as const,
    controls: [
      { key: "request_correlation", label: "Request correlation", status: "implemented" as const, evidence: "A validated caller request ID is propagated; otherwise a server UUID is returned in x-request-id." },
      { key: "structured_logs", label: "Structured application logs", status: "implemented" as const, evidence: "Completion logs retain only event, request ID, method, path without query string, status, duration, and timestamp." },
      { key: "health_readiness", label: "Liveness and readiness probes", status: "implemented" as const, evidence: "GET /healthz checks process liveness; GET /readyz performs a bounded database SELECT 1 and returns only generic status." },
      { key: "browser_security_headers", label: "Browser-facing security headers", status: "implemented" as const, evidence: "Frame, MIME-sniffing, referrer, browser-permission, opener, and CSP framing/object protections are attached to application responses." },
      { key: "api_rate_limit", label: "API rate limiting", status: "partial" as const, evidence: "Per-process, per-source API limits return 429 and Retry-After. A shared edge/distributed limit remains required for cross-instance protection." },
      { key: "telemetry_pipeline", label: "Metrics, traces, alerts, and retention", status: "not_measured" as const, evidence: "No external collector, dashboard, alert route, trace backend, or retention service is connected by this increment." },
    ],
    boundaries: {
      noExternalTelemetry: true,
      noBackgroundWorker: true,
      noBusinessStateMutation: true,
      noFinancialOrPayrollEffect: true,
      noAutomaticSloAttainment: true,
      noProductionCapacityClaim: true,
    },
  };
}

export function registerRuntimeHardening(app: Express, options: RuntimeHardeningOptions = {}) {
  const readinessCheck = options.readinessCheck ?? checkApplicationReadiness;
  app.disable("x-powered-by");
  app.use(createRequestContextAndLog(options));
  app.use("/api", createApiRateLimit(options));
  app.use("/api", createApiMethodAllowlist());

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "live", requestId: res.locals.requestId });
  });

  app.get("/readyz", async (_req, res) => {
    const readiness = await readinessCheck();
    res.status(readiness.ready ? 200 : 503).json({
      status: readiness.ready ? "ready" : "not_ready",
      requestId: res.locals.requestId,
      checkedAt: readiness.checkedAt,
      durationMs: readiness.durationMs,
    });
  });
}

export function registerRuntimeErrorHandling(app: Express) {
  app.use(createRuntimeErrorHandler());
}
