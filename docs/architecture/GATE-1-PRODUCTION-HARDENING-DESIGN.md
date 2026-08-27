# Gate 1 — Production Hardening Design

**Status:** Implemented request-time foundation; Gate 1 remains in progress.
**Owner:** Platform Engineering.
**Scope:** The managed Venture ERP application running as one Node/Express process with tenant-scoped tRPC business APIs.
**Related records:** [Enterprise Platform Implementation](ENTERPRISE-PLATFORM-IMPLEMENTATION.md), [Engineering Standards](../platform/ENGINEERING-STANDARDS.md), [Service Maturity](../platform/SERVICE-MATURITY.md), and [Operating System Validation Program](OPERATING-SYSTEM-VALIDATION-PROGRAM-DESIGN.md).

## 1. Decision and program shape

The enterprise architecture has reached a foundation freeze point. The next roadmap is an ordered maturity program, not another feature-accumulation list: each gate must retain evidence sufficient to justify beginning the next. Gate 1 begins with a narrow, verifiable request-time foundation. It does **not** certify production reliability, security, recovery, scalability, or compliance.

| Gate | Program | Exit decision requires | Current posture |
| --- | --- | --- | --- |
| Gate 1 | Production Hardening | Owned evidence that reliability, observability, security, recovery, performance, and integrity controls are demonstrably sufficient for the agreed service scope. | **In progress.** Request-time controls and local-only validation are implemented; operational evidence is incomplete. |
| Gate 2 | Adoption | Independently observed, human-reviewed evidence that authorized unfamiliar users can correctly complete real workflows with minimal assistance. | Blocked by Gate 1. |
| Gate 3 | Integrations and Data Acquisition | Approved systems-of-record contracts, credentials, provenance, health monitoring, failure visibility, replay, and controlled source onboarding. | Blocked by Gates 1–2. |
| Gate 4 | AI and Decision Intelligence | Evidence-grounded retrieval evaluation, authorization, provenance, privacy, and human-review controls. | Blocked by Gates 1–2. No model invocation is enabled. |
| Gate 5 | Commercialization | Measured operating/adoption evidence and a separately approved customer-service commitment. | Blocked by prior gates. |

> **Continuous validation and evidence.** Every material capability requires explicit acceptance criteria, executable proof where practical, a retained validation record, stated limits, and a responsible owner. An unmeasured claim remains a gap, not a score.

## 2. Verified Gate 1 baseline

The current application is a managed, autoscaling Node process. It has tenant membership checks, role guards, immutable evidence paths, additive migrations, source-controlled tests, checkpoint rollback, and a request-time readiness seam. Before this increment, it did not expose public liveness/readiness routes, per-request correlation, bounded structured completion logs, browser-facing hardening headers, or a documented local capacity harness. The process is still not a metrics backend, log-retention system, distributed tracing platform, alerting service, backup/restore service, or production load-testing system.

| Workstream | Implemented in this increment | Still required before Gate 1 exit |
| --- | --- | --- |
| Reliability and observability | Request ID propagation; structured, query/body/cookie-free completion logging; liveness and bounded database-readiness routes. | Approved service-level indicators/objectives, metric and trace collection, retention, alert routing, incident records, and a governing error-budget policy. |
| Application security | Browser-facing frame/object/CSP, MIME-sniffing, referrer, permissions, and opener policies; API `429` refusal with `Retry-After`; session cookies set `HttpOnly`, `Secure` on HTTPS, host-only OAuth state, and `SameSite=Lax`; local repository secret-baseline check. | Formal threat model, dependency/supply-chain scan evidence, secret-rotation evidence, pen-test scope/results, and distributed edge/rate-limit protection. |
| Recovery and continuity | Source checkpoint rollback continues to exist; recovery limitations are surfaced. | Account-specific managed-backup status confirmation, owned backup/restore procedure, restore drill, RTO/RPO definition/measurement method, and incident communications plan. |
| Performance and capacity | A local-only health-probe harness records actual response distribution for the target localhost process. | Authorized representative load, production-safe test plan, database query profiling, capacity observation, and explicit throughput/resource limits. |
| Integrity and release safety | Existing tenant, immutable-evidence, migration, authorization, and domain-invariant tests remain active. | Migration rollback drill, concurrent-write/idempotency/recovery scenarios, retained release/incident evidence, and recovery exercise. |

## 3. Request-time implementation

`server/_core/runtimeHardening.ts` is the narrow application-level boundary. It attaches a request ID to every response, accepts only a syntactically safe caller-provided ID, and emits a JSON completion event with the event name, request ID, HTTP method, path **without query string**, response status, duration, and timestamp. It does not log headers, cookies, request body, authorization, tenant records, SQL, or secrets. This supports a bounded investigation handoff without representing the local development log as a retained observability platform.

The same layer exposes these unauthenticated, generic responses:

| Route | Success behavior | Deliberate limit |
| --- | --- | --- |
| `GET /healthz` | Returns `200` and `status: live` when the process can respond. | It does not check database connectivity, user-facing workflow availability, external dependencies, backups, or recovery. |
| `GET /readyz` | Executes a bounded `SELECT 1` through the configured application database and returns `200`/`503` with generic readiness status. | It does not expose connection detail, credentials, query errors, tenant data, storage status, external health, or capacity. |

The API limiter is intentionally a per-process, per-source, in-memory control with a default ceiling of 240 requests per minute. It returns `429 Too Many Requests`, `Retry-After`, and standard rate-limit advisory headers when that local window is exhausted. The API method boundary permits only `GET`, `POST`, and `OPTIONS`; other API verbs are rejected with a generic `405`. General JSON and URL-encoded bodies are bounded at 1 MB and 256 KB respectively; malformed JSON returns a generic `400` and oversized JSON a generic `413`, each retaining only the request ID. This behavior is a defensive friction control only; it is not a distributed denial-of-service defense or a cross-instance consumption limit. Shared edge protection must precede any stronger claim.

`pnpm security:baseline` scans the local tracked and unignored working tree for a small set of high-signal token/private-key patterns and committed environment files. It prints only a path and rule identifier on failure; it never prints a detected value or uploads source content. It is a repository hygiene control rather than a secret manager, rotation system, dependency scan, vulnerability assessment, or security certification.

The headers provide browser-facing defense in depth: `Content-Security-Policy` blocks framing and plugin objects while preserving the application’s current managed asset model; `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy: same-origin` are sent with application responses. Managed TLS/certificate lifecycle stays owned by the hosting platform and is not treated as application-controlled proof.

## 4. Evidence and operating protocol

The tenant-gated **Operations Reliability** workspace at `/reliability?venture=<id>` returns the same request-time control profile, current generic readiness result, successive gate status, workstream gaps, and an investigation starter. It exposes no tenant business records and never changes operational, financial, payroll, tax, journal, payment, filing, integration, or external state.

When an authorized user observes an application failure, the first bounded action is to retain the returned `x-request-id` and inspect the corresponding completion event. That event is an investigation pointer, not a complete audit log. The team must then use the owning context’s evidence, access controls, and approved incident procedure. A successful probe is not an availability calculation, a successful recovery, or a service-level objective result.

### Local-only capacity harness

`pnpm test:gate1-capacity` makes only GET requests to `http://127.0.0.1:3000/healthz` by default. The target is rejected unless it is a localhost address; request count is bounded to 1–200, and concurrency to 1–32. Its JSON output identifies the target, start time, request count, concurrency, status distribution, and minimum/p50/p95/maximum latency from that **specific local run**. It makes no business-domain call and cannot create a customer, venture, operational record, journal, or external request.

The harness is deliberately not a production load test. It cannot establish availability, capacity, resource utilization, database saturation, regional behavior, network performance, user experience, SLO compliance, recovery time, or scalability. Its value is reproducible proof that the local liveness path behaves under the exact bounded test parameters printed in the result.

## 5. Security model and limitations

The existing OAuth callback keeps an anti-forgery check: an OAuth `state` nonce must match the one-time host-only browser cookie before code exchange. The move to `SameSite=Lax` keeps same-site application requests available while reducing ordinary cross-site cookie exposure; it is defense in depth and not a replacement for endpoint authorization or future CSRF analysis. Session-token issuance, expiry, revocation, identity-provider assurance, secret lifecycle, and cross-origin design remain platform/integration concerns that must be reviewed as Gate 1 evidence—not assumed from these headers.

This design follows the narrow principle that web request logging must omit sensitive input, browser-facing security controls should use explicit headers, and application APIs should make rate-limit rejection observable. It also follows the SRE distinction between an SLI specification and a real measurement implementation: a meaningful SLO needs a defined population, numerator, denominator, threshold, measurement source, owner, and review policy rather than an aspirational percentage. [1] [2] [3]

## 6. Recovery, backup, and platform boundary

Checkpoint rollback covers the project source/configuration snapshot and is not a substitute for a tested production-data recovery process. The managed platform’s website/database backup and restoration status must be confirmed against the account’s official in-app/email notice. If backup is required, exports are point-in-time snapshots rather than continuous protection; restore is an account/platform process, not an application endpoint. [4]

| Recovery evidence required | Accountable owner | Gate 1 status |
| --- | --- | --- |
| Confirm account-specific backup eligibility/status and current export location | Account owner | Not assessed by application code. |
| Maintain versioned recovery, incident-communications, and rollback procedures | Platform Engineering | Draft design/routing only; no restore drill recorded. |
| Define RTO/RPO in terms of actual backup method and tested recovery observation | Product and Platform owners | Not measured; no target is claimed. |
| Execute an authorized restore drill against a safe environment and retain results | Named human owner/reviewer | Not run. |
| Validate migrations, integrity, tenant isolation, and business invariants after recovery | Platform Engineering and owning context | Existing test evidence only; recovery-specific proof is missing. |

## 7. Gate 1 exit checklist

Gate 1 cannot be marked complete solely because the workspace renders green. It requires a human-approved evidence record that addresses every applicable row below.

| Area | Minimum exit evidence | Current outcome |
| --- | --- | --- |
| Service objectives | Approved SLI/SLO specifications, measurement implementation, owner, review cadence, and error-budget policy. | Missing. |
| Telemetry and alerting | Retained metrics/logs/traces with access controls, retention, alert routes, and incident linkage. | Missing. |
| Recovery | Verified account backup status, approved procedure, safe restore drill, observed RTO/RPO, and post-restore integrity checks. | Missing. |
| Security | Threat model, dependency/supply-chain review, secret-rotation procedure, external edge controls where required, and scoped security testing. | Partially implemented application controls; formal evidence missing. |
| Performance | Representative, authorized capacity plan and observed limits with workload/data scope. | Local liveness-only harness implemented; representative evidence missing. |
| Data integrity | Migration rollback, concurrency/idempotency, transaction-recovery, and tenant-isolation exercise results. | Existing invariant tests; full Gate 1 exercise missing. |
| Operations | Named incident/operational owner, escalation route, runbook rehearsal, and deployment rollback validation. | Ownership/alert/rehearsal evidence missing. |

## 8. Explicit exclusions

This work adds no background worker, scheduler, poller, queue, telemetry collector, third-party integration, database schema, financial calculation, valuation, COGS, journal/GL change, payment, payroll calculation, tax calculation, filing, external transmission, AI invocation, recommendation, autonomous decision, or external effect. It does not upgrade the managed hosting mode, create an on-call service, commit an availability target, or represent a local development result as a production outcome.

The Indonesian payroll evidence pack remains **draft-only, inactive, unreviewed, unselected, and blocked**. It cannot be used for payroll calculation, rehearsal, activation, production, payment, compliance assertion, or filing until a qualified Indonesian payroll/tax reviewer supplies the required written, effective-dated authorization.

## References

[1] [Google SRE Workbook — Implementing SLOs](https://sre.google/workbook/implementing-slos/)
[2] [OpenTelemetry — Semantic Conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)
[3] [OWASP — REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) and [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
[4] [Manus — Website Backup and Restoration Guidance](https://help.manus.im/en/articles/16147892-service-change-overview-how-to-back-up-your-data)
