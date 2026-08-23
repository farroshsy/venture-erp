# Venture ERP

**Venture ERP** is an enterprise operating-system foundation for a portfolio of ventures. It does not treat “microservices” as a collection of small deployables. Instead, it makes **business boundaries, data ownership, tenant isolation, versioned contracts, release independence, and operational evidence** first-class from the beginning, then extracts physical services only when the measurable benefit exceeds the distributed-systems cost.

> The governing position is deliberate: **microservices are the target operating model; a service-aligned foundation is the starting implementation.** This preserves independent module evolution without manufacturing operational complexity before the portfolio has earned it.

## What is implemented

The delivered workspace includes a venture-scoped portfolio dashboard, an eight-context service catalog, operations panels for Finance, Procurement, Inventory, People, and Project Operations, a build-versus-buy workbench, and an architecture handbook. It persists ventures, memberships, governance cases, and AI evidence-review drafts in the database. It also contains the first versioned public contract, ADRs, service maturity scorecards, contract validation, CI quality gates, and tenant-isolation integration tests.

| Capability | Delivered behavior | Boundary or guardrail |
|---|---|---|
| **Venture platform kernel** | Creates ventures, memberships, active scope selection, and portfolio visibility. | Every venture-scoped API checks an active membership; cross-venture records are never queried by a caller outside its membership set. |
| **Service catalog** | Shows owner, contract, data authority, release, health, deployment posture, and maturity per context. | Catalog metadata is a control-plane read model, not an operational system of record. |
| **Initial ERP workspaces** | Provides finance, procurement, inventory, people, and project operating controls. | Domain commands remain scoped to the bounded context and are not allowed to write another context’s database. |
| **Decision governance** | Scores SAP, alternative ERP, and custom delivery using declared criteria and weights. | The score is transparent decision support, not an automatic procurement recommendation. |
| **AI evidence review** | Produces a structured summary, assumptions, gaps, and risks from user-supplied evidence. | The server forces `humanApprovalRequired = true`; only authorized people can approve a review. |
| **Delivery controls** | Adds unit, integration, contract, foundation, and CI checks. | A context is not release-independent merely because it has a folder or endpoint. |

## Why this architecture—not immediate physical microservices

An immediate fleet of independently deployed ERP services creates valuable isolation only when services need different release cadence, scale, reliability posture, security boundary, or team ownership. Until then, it imposes a “microservice premium”: network failure modes, distributed tracing, message delivery guarantees, data synchronization, versioned contracts, incident coordination, and deployment infrastructure. Microsoft documents the same trade-off: microservices benefit from autonomous bounded contexts and service-owned data, but introduce distributed-data, integration, management, and observability complexity. [1] Martin Fowler similarly cautions that service decomposition brings a cost that complex systems must justify. [2]

The selected approach is therefore a **service-aligned modular foundation**. The current application runs in one managed process, but its contracts, routers, persistence ownership, authorization checks, maturity measures, ADRs, and extraction plan are designed as if each bounded context will become independently deployed. This is more disciplined than either extreme: it avoids a shared “big ball of mud” while avoiding premature operational fragmentation.

| Upgrade option | Advantages | Disadvantages | Decision |
|---|---|---|---|
| **Immediate physical microservices** | Strong deployment isolation, independent scaling, clear blast-radius boundaries. | Highest infrastructure and operational burden before real demand exists. | **Do not start here** for the current managed foundation. |
| **Conventional modular monolith** | Fast delivery, simple transactions and local debugging. | Boundaries often erode; deployment and data coupling can become permanent. | Insufficient without explicit contracts, ownership, and extraction controls. |
| **Service-aligned foundation** | Preserves bounded contexts and versioned contracts while keeping one operational unit. | Requires discipline to prevent backdoor coupling; does not yet provide runtime deployment isolation. | **Selected.** Extract on measured evidence. |
| **Vendor-suite customization** | Faster coverage for standardized, compliance-heavy processes. | Can create lock-in and upgrade friction when core processes are deeply customized. | Use clean-core integration and extension principles for non-differentiating work. [3] |

## ERP domain map

The platform uses domain-driven design language. A **bounded context** owns a business vocabulary, rules, data authority, external contract, events, and engineering accountability. It is a platform service candidate, not merely a screen or feature.

| Bounded context | Owns | Contract | Typical service-extraction signal |
|---|---|---|---|
| Platform Kernel | Venture scope, memberships, authorization, contract registry | `erp-platform.v1` | Independent identity/security posture or gateway scale. |
| Portfolio Governance | Portfolio read models and operating posture | `portfolio-snapshot.v1` | Separate analytics scale or a dedicated portfolio systems team. |
| Finance | Journal truth, close state, accounting adapters | `finance-summary.v1` | Regulatory control, finance release cadence, or accounting system integration. |
| Procurement | Requests, approvals, supplier integration seams | `procurement-request.v1` | Dedicated sourcing operation or suite integration boundary. |
| Inventory | Stock position, reservations, movements | `inventory-availability.v1` | Warehouse scale, low-latency demand, or dedicated supply systems team. |
| People | Privacy-sensitive workforce references and approvals | `people-directory.v1` | HRIS boundary or enhanced privacy/compliance requirements. |
| Project Operations | Initiatives, milestones, delivery signals | `project-status.v1` | Dedicated delivery organization or a separate execution toolchain. |
| Decision Governance | Decision cases, evidence, assumptions, reviews, approvals | `decision-review.v1` | Elevated governance, risk, or architectural review demand. |

## Build versus buy: when SAP, an alternative ERP, or custom code fits

The decision workbench evaluates **process differentiation, compliance fit, integration complexity, total cost of ownership, vendor lock-in exposure, and delivery capacity**. These are not universal weights. A regulated finance process and a differentiated venture-operating process should not have the same decision profile.

| Situation | Usually favors | Why |
|---|---|---|
| Broad regulatory, financial-control, and standardized back-office requirements | SAP or a strong ERP suite | The organization benefits more from established process coverage and controls than from inventing commodity behavior. |
| Stable but cost-sensitive operational workflows with moderate integration needs | An alternative ERP | The best fit may be a lower-complexity suite with less lock-in and a shorter implementation path. |
| A narrow process that directly creates competitive advantage, has clear ownership, and can be safely operated | Custom capability behind a stable contract | The capability can evolve at business speed without contaminating the vendor core or unrelated modules. |
| A differentiated workflow that still depends on vendor master data or accounting | Hybrid | Keep the suite clean and extend through APIs, events, or side-by-side services rather than invasive core changes. [3] |

## Repository map

```text
client/src/
  components/             # ERP shell, status and presentation primitives
  contexts/               # Venture scope selected by the user
  pages/                  # Portfolio, catalog, operations, decisions, architecture

server/
  platform/               # Tenant boundary, maturity, catalog, scoped portfolio aggregation
  governance/             # Decision scoring and AI approval policy
  routers/                # Typed API contracts for platform and governance contexts
  _core/                  # Managed runtime infrastructure (do not change casually)

drizzle/
  schema.ts               # Venture, membership, governance case, evidence-review schema
  migrations/             # Additive database migrations

contracts/public/         # Versioned public service contracts
docs/
  adr/                    # Architecture Decision Records
  architecture/           # Context boundaries and migration roadmap
  platform/               # Standards, maturity, scorecards, validation notes
  research/               # Source notes used by architecture decisions
infra/                    # Infrastructure-as-code direction and deployment expectations
.github/workflows/        # CI quality gates
scripts/                  # Contract and foundation verification
```

## Local development and quality gates

Use the project’s managed environment and never store deployment credentials in the repository.

```bash
pnpm dev
pnpm check
pnpm test
pnpm test:integration
pnpm contracts:validate
pnpm verify:foundation
pnpm build
```

The current implementation validated `pnpm check`, `pnpm build`, all Vitest suites, integration suites, the public-contract validator, and the foundation verifier. Before a production release, run the deployed health probe and a contract smoke suite against the target environment as described in `docs/platform/ENGINEERING-STANDARDS.md`.

## Service maturity and extraction gates

The catalog assigns a maturity level from L0 to L3. A module reaches L3 only after evidence covers documentation, tests, contract compatibility, observability, security review, resilience, runbook ownership, and deployment verification. The scorecard is intentionally a **release conversation**, not an objective claim of production readiness.

| Level | Meaning | Release posture |
|---|---|---|
| L0 | Planned boundary | No independent service release. |
| L1 | Contracted module | Additive internal change only; key contract and ownership evidence exists. |
| L2 | Governed service candidate | Contract tests, operational metrics, and integration evidence are emerging. |
| L3 | Independently releasable service | Can deploy without coordinated changes, has an owned datastore, and meets control gates. |

## AI review safety

The evidence-review assistant receives only the decision case inputs. It summarizes evidence, calls out assumptions and gaps, and drafts a rationale. It does **not** approve decisions, select vendors, or make factual claims beyond the supplied evidence. The server overrides the approval flag regardless of model output. Read [ADR-003](docs/adr/ADR-003-ai-assisted-evidence-review.md) for the full control rationale.

## Further reading

Read the [Executive Architecture Handbook](docs/EXECUTIVE-ARCHITECTURE-HANDBOOK.md) for the operating philosophy, decision framework, transition plan, and governance model. Read [Upgrade Options](docs/architecture/UPGRADE-OPTIONS.md) for the critical comparison that led to the selected architecture.

## References

[1] [Microsoft Learn — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)  
[2] [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html)  
[3] [SAP — Clean core extensibility for SAP S/4HANA Cloud](https://www.sap.com/documents/2024/09/20aece06-d87e-0010-bca6-c68f7e60039b.html)
