import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { registerRuntimeErrorHandling, registerRuntimeHardening, type RuntimeLogEvent } from "./runtimeHardening";

async function start(server: Server) {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP server address");
  return `http://127.0.0.1:${address.port}`;
}

async function stop(server: Server) {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

describe("runtime hardening", () => {
  const servers: Server[] = [];
  afterEach(async () => { await Promise.all(servers.splice(0).map(stop)); });

  it("adds safe correlation and browser protections, redacts query strings from structured completion logs, and refuses excess API requests", async () => {
    const events: RuntimeLogEvent[] = [];
    const app = express();
    registerRuntimeHardening(app, {
      log: event => events.push(event),
      rateLimit: { maxRequests: 3, windowMs: 60_000 },
      readinessCheck: async () => ({ ready: true, checkedAt: "2026-08-27T00:00:00.000Z", durationMs: 1, scope: "process_and_database" }),
    });
    app.get("/api/probe", (_req, res) => res.json({ ok: true }));
    const server = new (await import("node:http")).Server(app); servers.push(server);
    const baseUrl = await start(server);

    const first = await fetch(`${baseUrl}/api/probe?token=must-not-be-logged`, { headers: { "x-request-id": "approved_correlation_0001" } });
    const methodRefused = await fetch(`${baseUrl}/api/probe`, { method: "PUT" });
    const second = await fetch(`${baseUrl}/api/probe`);
    const blocked = await fetch(`${baseUrl}/api/probe`);

    expect(first.status).toBe(200);
    expect(first.headers.get("x-request-id")).toBe("approved_correlation_0001");
    expect(first.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(first.headers.get("x-content-type-options")).toBe("nosniff");
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(first.headers.get("x-powered-by")).toBeNull();
    expect(methodRefused.status).toBe(405);
    expect(methodRefused.headers.get("allow")).toBe("GET, POST, OPTIONS");
    expect(second.status).toBe(200);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(await blocked.json()).toMatchObject({ error: "too_many_requests", requestId: expect.any(String) });
    expect(events.some(event => event.path.includes("token"))).toBe(false);
    expect(events.some(event => event.requestId === "approved_correlation_0001" && event.statusCode === 200)).toBe(true);
    expect(events.some(event => event.statusCode === 429)).toBe(true);
  });

  it("distinguishes liveness from generic readiness without exposing database failure detail", async () => {
    const app = express();
    registerRuntimeHardening(app, { readinessCheck: async () => ({ ready: false, checkedAt: "2026-08-27T00:00:00.000Z", durationMs: 2, scope: "process_and_database" }) });
    const server = new (await import("node:http")).Server(app); servers.push(server);
    const baseUrl = await start(server);

    const live = await fetch(`${baseUrl}/healthz`);
    const ready = await fetch(`${baseUrl}/readyz`);
    expect(live.status).toBe(200);
    expect(await live.json()).toMatchObject({ status: "live", requestId: expect.any(String) });
    expect(ready.status).toBe(503);
    expect(await ready.json()).toEqual({ status: "not_ready", requestId: expect.any(String), checkedAt: "2026-08-27T00:00:00.000Z", durationMs: 2 });
  });

  it("refuses malformed and oversized JSON inputs without reflecting parser internals or user body content", async () => {
    const app = express();
    registerRuntimeHardening(app);
    app.use(express.json({ limit: "1kb" }));
    app.post("/api/probe", (_req, res) => res.json({ ok: true }));
    registerRuntimeErrorHandling(app);
    const server = new (await import("node:http")).Server(app); servers.push(server);
    const baseUrl = await start(server);

    const malformed = await fetch(`${baseUrl}/api/probe`, { method: "POST", headers: { "content-type": "application/json" }, body: "{unsafe" });
    const oversized = await fetch(`${baseUrl}/api/probe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "secret-like-user-content-".repeat(100) }) });

    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "invalid_request", requestId: expect.any(String) });
    expect(oversized.status).toBe(413);
    const oversizedBody = await oversized.text();
    expect(oversizedBody).toContain("payload_too_large");
    expect(oversizedBody).not.toContain("secret-like-user-content");
    expect(oversizedBody).not.toContain("PayloadTooLargeError");
  });
});
