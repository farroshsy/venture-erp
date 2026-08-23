# Venture ERP Bounded Contexts

Venture ERP uses domain-driven boundaries, not generic technical layers. Each context is evaluated as a **potential platform service** with an owner, a data authority, a contract, an event vocabulary, operating objectives, and an extraction path.

| Context | Owns | Stable interfaces | Initial operating posture | Extraction signal |
|---|---|---|---|---|
| Platform Kernel | venture identity, membership, permissions, contracts, audit intent | `venture-context.v1`, `authorization.v1` | Foundation control plane | Separate identity/security cadence |
| Portfolio Governance | venture scorecards, portfolio read models, capital and risk views | `portfolio-snapshot.v1` | Read-model and policy service | Heavy analytics or independent board reporting |
| Finance | charting, ledger integration adapters, close readiness, cash views | `finance-summary.v1`, `journal-posted.v1` | System-of-record candidate | Regulatory controls or finance-specific team |
| Procurement | request-to-approve, supplier references, purchase commitments | `procurement-request.v1`, `purchase-approved.v1` | Workflow context | Separate sourcing operation or external suites |
| Inventory | stock position, reservations, item movement | `inventory-availability.v1`, `stock-adjusted.v1` | Operational context | Warehouse scale or low-latency demand |
| People | worker profile references, workforce planning, approvals | `people-directory.v1`, `worker-status-changed.v1` | Privacy-sensitive context | HRIS integration or sensitive-data boundary |
| Project Operations | initiatives, milestones, capacity signals, delivery health | `project-status.v1`, `milestone-achieved.v1` | Collaboration context | Dedicated delivery organization |
| Decision Governance | build-versus-buy evidence, assumptions, approvals, ADR linkage | `decision-review.v1`, `decision-approved.v1` | Governed workflow context | Enterprise architecture team or external evidence pipeline |

## Integration Rules

Synchronous API calls are reserved for immediate validation, commands, and user-facing queries. State propagation and portfolio rollups are event-driven and idempotent. Events describe business facts rather than database rows. Each consumer stores its own projection, accepts duplicate delivery, and records a correlation ID. This prevents a shared reporting database from becoming an undeclared integration layer.

> A bounded context is the unit of ownership. A service is the deployment option that the context earns when its operational or organizational profile demands separation.

The gateway enforces authentication, venture context propagation, rate policy, and contract routing. It deliberately contains no finance, procurement, inventory, people, or project logic.
