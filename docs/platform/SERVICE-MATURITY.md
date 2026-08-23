# Service Maturity Model

Service maturity is a release-governance measure rather than a vanity score. A context may not move to a higher autonomy level by asserting readiness; the evidence below must be present and verified in the delivery pipeline.

| Level | Documentation | Testing | Observability | Security | Operations | Release eligibility |
|---|---|---|---|---|---|---|
| L0 — Proposed | Problem and owner named | None | None | Classification pending | No runbook | Design only |
| L1 — Foundation | README, contract, ADR reference | Unit tests | Structured logs | Auth boundary declared | Health owner named | Internal preview |
| L2 — Governed | Runbook and data map | Unit + contract tests | Metrics and correlation IDs | Dependency review and least privilege | SLO drafted, rollback documented | Controlled production |
| L3 — Operable | Change log and dependency map | Unit + contract + integration tests | Dashboard, alerts, traces | Threat model and vulnerability response | On-call, rehearsal, restore path | Independent production release |
| L4 — Resilient | Disaster and continuity docs | Failure-mode and load tests | SLO/error-budget governance | Periodic access review | Game days and recovery evidence | Critical-workload release |

The product computes an initial maturity score from verifiable attributes and records missing evidence. This is intentionally conservative: a service cannot be called independently deployable if it lacks compatible contracts, rollback, observability, and an accountable owner.
