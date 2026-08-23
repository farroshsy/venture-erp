# Migration Roadmap: Foundation to Independent Services

The program begins by proving boundaries before paying the full microservice premium. A release cannot claim independent deployability until it passes contract, integration, migration, and rollback verification.

| Phase | Architecture | Measurable exit criteria | Rollback posture |
|---|---|---|---|
| 0 — Foundation | Service-aligned modules in one managed runtime; gateway facade; contract registry | No cross-context persistence imports; every module has owner, contract, maturity score, and runbook stub | Revert module implementation behind existing gateway route |
| 1 — Contract hardening | Consumer-driven contract tests; event schemas; outbox abstraction | ≥90% API compatibility coverage for public contracts; 100% destructive changes flagged | Route traffic to previous compatible adapter |
| 2 — First extraction | Extract the context with a different risk, scale, or release cadence | Dedicated datastore; SLO dashboard; trace propagation; staged traffic; rehearsal complete | Feature flag and gateway route return to in-process adapter |
| 3 — Event-led portfolio | Materialized portfolio projections consume context events | Idempotent consumers; replay procedure; reconciliation error below agreed threshold | Rebuild read model from source events |
| 4 — Federated operations | Independent teams release contexts through common platform templates | All production services meet maturity L3; no coordinated deploy required for a compatible change | Per-service rollback with contract compatibility window |

## Dependency-Reduction Milestones

The first migration target should be selected by evidence, not fashionable domain labels. High-change, independently staffed, security-sensitive, or scale-sensitive contexts are candidates. A context that requires cross-context transactions, simultaneous releases, or shared tables is not ready; its coupling must be reduced before extraction. Distributed consistency is handled through business sagas, compensation, reconciliation, and operator visibility rather than two-phase commit.

This approach retains the benefits of strong module boundaries and independent rollout while treating distribution, eventual consistency, testing, and operations as real costs rather than implementation details.[1]

## References

[1]: https://martinfowler.com/articles/microservice-trade-offs.html "Martin Fowler — Microservice Trade-Offs"
