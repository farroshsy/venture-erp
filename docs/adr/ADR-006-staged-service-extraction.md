# ADR-006: Staged Extraction from Service-Aligned Foundation to Federated Services

**Status:** Accepted  
**Date:** 2026-08-23  
**Decision owner:** Enterprise Architecture

## Context

The platform must preserve the option to independently deploy Finance, Procurement, Inventory, People, Project Operations, and Decision Governance. However, an immediate service fleet would impose deployment, observability, consistency, security, and support requirements before the business case for each context is proven.

## Decision

The migration proceeds in stages. A context remains inside the managed control plane until its business, operational, and technical case is demonstrated. Physical extraction uses a strangler route through the gateway, dedicated data ownership, compatible contracts, event or projection transition, staged traffic, and a rehearsed rollback.

| Stage | Required decision | Success measure | Rollback posture |
|---|---|---|---|
| Foundation | Name boundary, owners, data authority, and public contract. | No private cross-context persistence dependency. | Keep the context in-process. |
| Contract hardening | Publish compatibility policy, consumer list, and event vocabulary. | Consumers pass contract tests without shared tables. | Maintain the prior contract during migration window. |
| First extraction | Move one context with a distinct compliance, scale, or release driver. | Dedicated datastore and gateway route function under staged traffic. | Route traffic back to the in-process implementation; reconcile events. |
| Federated operation | Adopt service template, SLOs, runbook, and platform delivery controls. | L3 maturity and independent deployment verification. | Pause further extraction; retain last stable gateway route. |

## Rejected alternatives

The architecture rejects both “split every feature now” and “wait until the monolith is unmaintainable.” The former buys theoretical independence at significant operational cost; the latter allows data and deployment coupling to become expensive to unwind. A service-aligned foundation makes the intermediate state intentional.

## Consequences

Every proposed extraction requires a short business case, dependency map, data migration plan, contract compatibility report, observability plan, rollout steps, and rollback rehearsal. The migration roadmap remains a living implementation guide; this ADR records the durable decision rule.

## References

[1] [Microsoft Learn — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)  
[2] [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html)
