# Gate 1 Operations Runbook

**Status:** Initial request-time operating procedure. It is not an on-call commitment, an incident-management service, a backup/restore procedure, or proof that Gate 1 has passed.
**Owner:** Platform Engineering.
**Scope:** Current managed Venture ERP application only.
**Related design:** [Gate 1 Production Hardening](../architecture/GATE-1-PRODUCTION-HARDENING-DESIGN.md).

## Purpose

This runbook gives an authorized operator a safe, evidence-first starting point when a user observes a request failure. It preserves the existing tenant, finance, payroll, and external-effect boundaries: troubleshooting must never bypass membership checks, weaken role guards, expose secrets, replay a consequential command, mutate evidence, or activate a blocked workflow.

| Signal | Meaning | First safe action | Does **not** establish |
| --- | --- | --- | --- |
| `GET /healthz` returns `200` | The process returned a generic liveness response. | Record the returned `x-request-id` and timestamp. | Database readiness, application workflow health, uptime, recovery, or user success. |
| `GET /readyz` returns `200` | A bounded application database `SELECT 1` completed at that instant. | Record the returned `x-request-id`, `checkedAt`, and `durationMs`. | Data integrity, backup health, capacity, external dependency health, or an SLO result. |
| `GET /readyz` returns `503` | The process could not complete its generic readiness check. | Preserve the `x-request-id`; do not retry a consequential action automatically. | Root cause, data loss, or database outage scope. |
| API returns `429` | The current process has refused a source that exceeded its local API-window limit. | Observe `Retry-After`; wait before a **read-only** retry or escalate through the owning procedure. | A distributed/global rate limit or an attack conclusion. |
| User observes a failed/slow request | The response has a correlation ID and a bounded completion event. | Capture the request ID, path, UTC/local observed time, user-facing status, and non-sensitive reproduction steps. | A full incident record, trace, or causal explanation. |

## Triage sequence

1. **Preserve only safe evidence.** Record the `x-request-id`, route, status, timestamp, and visible user symptom. Do not include cookies, authorization headers, passwords, secrets, raw request bodies, personal data, or financial/payroll details in a shared note.
2. **Classify the state.** Use `/healthz` and, if relevant, `/readyz`. Treat a probe as a point-in-time signal only. Do not convert a successful probe into an availability, recovery, performance, or security assertion.
3. **Check the bounded completion event.** Search for the ID in the application completion log. That event contains the method, path without query string, status, duration, and timestamp. It intentionally omits the input body, query values, headers, session token, identity, tenant, and database detail.
4. **Respect ownership.** Use the route/module guide and retained source evidence to identify the owning context. Follow its existing role/state/finance guards. Do not use a different module or direct database change to work around a failed command.
5. **Contain rather than automate.** For a repeated consequential failure, stop and preserve evidence. Do not retry payment, posting, payroll, tax, filing, integration, approval, or other external-effect paths automatically.
6. **Create a human review record when appropriate.** Use the existing decision/validation controls only when the scope, evidence, limitation, and separate review rule are satisfied. Do not create a benchmark or observation that implies an unmeasured root cause or outcome.

## Local capacity check

Run `pnpm test:gate1-capacity` only in a controlled development/test environment. It accepts no external target by default and rejects non-local hosts. Its printed result captures the exact local process/route, request count, concurrency, status distribution, and latency distribution it exercised.

| Safe use | Prohibited interpretation |
| --- | --- |
| Verify the current localhost liveness endpoint behaves under the printed bounded request count/concurrency. | A production load test, capacity plan, database-saturation test, user-experience measure, SLO result, or scalability guarantee. |
| Keep the JSON result with the local validation record if a reviewer needs to reproduce it. | Treat a one-time local result as recurring telemetry, retained monitoring, alerting coverage, or a release approval. |

## Repository security hygiene

Run `pnpm security:baseline` before a hardening checkpoint. The command scans the local tracked and unignored working tree for committed environment files and selected high-signal token/private-key patterns. On failure it identifies only the file path and rule, never the detected value. Treat a passing result as narrow hygiene evidence; it does not rotate a secret, inspect managed secrets, scan deployed memory, analyze dependencies, perform penetration testing, or certify the application.

## Recovery boundary

The application currently has a source/configuration checkpoint rollback capability, but no application-owned data backup or restore drill. Project/database backup and restoration status are account/platform matters that must be confirmed by the account owner through the applicable managed-platform records. A point-in-time export, where applicable, is not continuous protection; no RTO/RPO, restore time, or data-loss window is currently claimed.

Before a recovery claim may be used to advance Gate 1, named owners must retain the applicable backup-status confirmation, approved recovery procedure, safe restore-drill result, observed integrity/tenant-isolation checks, and a separate review of any proposed RTO/RPO. Until then, an operational interruption must be recorded as a gap, not treated as a recoverable event by assumption.

## Escalation evidence template

| Field | Required content |
| --- | --- |
| Observation time | UTC timestamp and local display time. |
| Request ID | Exact `x-request-id`; never a session token. |
| Route and method | Path without query string and HTTP method. |
| Visible result | Status and generic symptom only. |
| Probe result | Point-in-time liveness/readiness response, if collected. |
| Scope | Affected tenant/module only when authorization permits identifying it; do not copy business records unnecessarily. |
| Limitations | What the observation does not prove, including root cause, impact scope, uptime, recovery, or security conclusion. |
| Owner/review | Named responsible human and separate reviewer where the existing governance lifecycle requires one. |

## Gate 1 exit guard

Do not close Gate 1 based on this runbook. Gate 1 requires the evidence listed in the [hardening design’s exit checklist](../architecture/GATE-1-PRODUCTION-HARDENING-DESIGN.md#7-gate-1-exit-checklist), including measured objectives/collection, alerting, recovery/restore evidence, security review, representative capacity evidence, integrity drills, and owned operating procedures.

No part of this runbook authorizes payroll calculation, tax calculation, payment, posting, filing, external transmission, connection activation, AI invocation, or autonomous remediation. Indonesian payroll remains draft-only, inactive, unreviewed, unselected, and blocked pending qualified written Indonesian payroll/tax reviewer approval.
