# ADR-005: Observability and Operational Readiness Precede Independent Release

**Status:** Accepted  
**Date:** 2026-08-23  
**Decision owner:** Platform Engineering and Service Owners

## Context

Independent deployment without service-level telemetry, ownership, support procedures, security evidence, and rollback is only independent failure. A microservice architecture increases the need to understand cross-service request paths, contract failures, and data synchronization behavior. [1]

## Decision

No bounded context is classified as L3 independently releasable until it meets the service maturity scorecard. Minimum evidence includes a named owner, public contract, integration and contract tests, security review, structured logs, correlation propagation, service-level metrics, alerting policy, runbook, rollback rehearsal, and deployment verification.

| Maturity evidence | Why it is mandatory |
|---|---|
| Correlation ID in logs and events | Enables an operator to trace a portfolio request across future services. |
| SLO-oriented metrics and alerts | Makes reliability an owned operational commitment rather than a post-incident debate. |
| Runbook and escalation owner | Ensures a failed release or data reconciliation has a human response path. |
| Rollback and migration rehearsal | Prevents an irreversible data or contract cutover. |
| Vulnerability and dependency review | Makes the service owner accountable for supply-chain exposure. |

## Consequences

The maturity gate can slow the first extraction, but it reduces avoidable operational risk. A context may remain in the managed control plane until it supplies the evidence; urgency alone is not a waiver. This decision rejects “deploy first and document later” for ERP domains.

## References

[1] [Microsoft Learn — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)
