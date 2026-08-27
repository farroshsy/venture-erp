# Venture ERP

**Venture ERP** is an enterprise operating-system foundation for a portfolio of ventures. It does not treat “microservices” as a collection of small deployables. Instead, it makes **business boundaries, data ownership, tenant isolation, versioned contracts, release independence, and operational evidence** first-class from the beginning, then extracts physical services only when the measurable benefit exceeds the distributed-systems cost.

> The governing position is deliberate: **microservices are the target operating model; a service-aligned foundation is the starting implementation.** This preserves independent module evolution without manufacturing operational complexity before the portfolio has earned it.

## Live workspace and release posture

The managed Venture ERP workspace is available at **[ventureerp-ax3cnpay.manus.space](https://ventureerp-ax3cnpay.manus.space)**. The live application requires an authorized session and an active venture membership; it is not a public financial-reporting, payroll, tax, payment, or government-filing service.

> **Evidence-first release posture.** This repository deliberately distinguishes implemented, retained-evidence controls from planned or separately authorized financial capabilities. A visible workspace, route, record, or roadmap item is not a claim of statutory compliance, SAP parity, production accounting authority, live integration, or automatic financial effect.

| Start here | Purpose |
| --- | --- |
| [Live workspace](https://ventureerp-ax3cnpay.manus.space) | Use the tenant-scoped control workspace with a valid authorized session. |
| [Workspace Guide](https://ventureerp-ax3cnpay.manus.space/guide) | Read practical intent, navigation, expected outcomes, and boundaries for the active modules. |
| [Enterprise Intelligence cockpit](https://ventureerp-ax3cnpay.manus.space/intelligence) | Search every governed metric, inspect its evidence ledger/lineage, review deterministic priority signals, and identify the next data-collection capability. |
| [Knowledge Graph](https://ventureerp-ax3cnpay.manus.space/knowledge-graph) | Follow explicit tenant-scoped relationships between metrics, retained evidence, canonical objects, workflow, operations, audits, and human-governed planning records. |
| [Enterprise Operating System](https://ventureerp-ax3cnpay.manus.space/operating-system) | Draft and separately review objectives, key results, decision memories, scenario preparations, evidence links, and external source-contract readiness. |
| [Operating System Validation Program](https://ventureerp-ax3cnpay.manus.space/validation) | Review structural benchmark posture, metric trust, decision replay, explicit evidence paths, and human-recorded validation observations; retain/review validation evidence with separate human approval. |
| [Operations Reliability](https://ventureerp-ax3cnpay.manus.space/reliability) | Inspect Gate 1 request-time readiness, hardening controls, local capacity-test scope, operational gaps, and the evidence required before later maturity gates. |
| [Adoption & Operator Validation](https://ventureerp-ax3cnpay.manus.space/adoption) | Use role-aware orientation, bounded operator journeys, safe recovery guidance, and separately reviewed human-recorded study observations; it does not collect automatic behavior telemetry. |
| [External Evidence](https://ventureerp-ax3cnpay.manus.space/external-evidence) | Govern one tenant-scoped GitHub repository from draft through validation, separate authorization, explicit activation, bounded manual read-only acquisition, provenance review, and revocation—without automatic ERP-truth conversion. |
| [Documentation hub](docs/README.md) | Navigate architecture records, ADRs, research, compliance gates, validation notes, and the supported operating model. |
| [CREB design](docs/architecture/CANONICAL-RESOURCE-EVIDENCE-BRIDGE-DESIGN.md) | Review the active read-only Resource evidence projection, reconciliation semantics, gaps, and no-effect boundary. |
| [COEB design](docs/architecture/CANONICAL-OBLIGATION-EVIDENCE-BRIDGE-DESIGN.md) | Review the active read-only obligation projection, retained-evidence rules, reconciliation semantics, gaps, and no-effect boundary. |
| [Enterprise Decision Intelligence](docs/architecture/ENTERPRISE-DECISION-INTELLIGENCE-DESIGN.md) | Review the governed 219-metric catalog, retained-evidence evaluator, lineage, data-gap collection roadmap, and no-effect boundary. |
| [Executive Evidence Cockpit](docs/architecture/EXECUTIVE-EVIDENCE-COCKPIT-DESIGN.md) | Review the response-only metric ledger, declared dependency/evidence context, deterministic priority signals, all-route guidance, and non-autonomous boundary. |
| [Enterprise Operating System Intelligence](docs/architecture/ENTERPRISE-OPERATING-SYSTEM-INTELLIGENCE-DESIGN.md) | Review the integrated Knowledge Graph, metric governance, human planning records, source-contract/AI readiness, rollout gates, and strict no-effect boundaries. |
| [Operating System Validation Program](docs/architecture/OPERATING-SYSTEM-VALIDATION-PROGRAM-DESIGN.md) | Review the structural benchmark, metric-trust disclosure, human validation observation, decision replay, evidence-path, privacy/collection, and non-autonomous validation controls. |
| [Gate 1 Production Hardening](docs/architecture/GATE-1-PRODUCTION-HARDENING-DESIGN.md) | Review the Gate 1–5 maturity program, implemented request-time hardening controls, recovery/operational gaps, local-only capacity harness, and exit requirements. |
| [Gate 1 Operations Runbook](docs/platform/GATE-1-OPERATIONS-RUNBOOK.md) | Follow safe correlation-ID triage, probe interpretation, local capacity-harness limits, recovery ownership boundaries, and escalation-evidence requirements. |
| [Gate 2 Adoption and Operator Validation](docs/architecture/GATE-2-ADOPTION-VALIDATION-DESIGN.md) | Review the consent-aware human-observation protocol, role-specific journey catalog, independent-review controls, failure-recovery guidance, measured-versus-unmeasured interpretation, and Gate 2 exit evidence. |
| [Gate 3 GitHub Evidence Acquisition](docs/architecture/GATE-3-GITHUB-EVIDENCE-ACQUISITION-DESIGN.md) | Review the tenant-scoped source lifecycle, server-only credential reference, raw/evidence/version contract, manual bounded acquisition, review/reconciliation, revocation/retention requirements, and no-truth-conversion boundary. |
| [Gate 3 GitHub Evidence Runbook](docs/platform/GATE-3-GITHUB-EVIDENCE-RUNBOOK.md) | Follow the safe connection, one-page acquisition, rate-limit/refusal, provenance-review, revocation, and deferred-capability procedure. |

## What is implemented

The delivered workspace includes a venture-scoped portfolio dashboard, an executive architecture dashboard, interactive architecture governance, a full platform service catalog, operations panels for Finance, Procurement, Inventory, People, and Project Operations, a build-versus-buy workbench, an evidence-bounded architecture assistant, and a venture/module access-administration workspace. It persists ventures, memberships, governance cases, AI evidence-review drafts, role templates, permissions, scoped assignments, access-change records, and assistant conversation evidence in the database. It also contains versioned public contracts, ADRs, service maturity scorecards, contract validation, CI quality gates, and tenant-isolation integration tests.

| Capability | Delivered behavior | Boundary or guardrail |
|---|---|---|
| **Venture platform kernel** | Creates ventures, memberships, active scope selection, and portfolio visibility. | Every venture-scoped API checks an active membership; cross-venture records are never queried by a caller outside its membership set. |
| **Service catalog** | Shows owner, contract, data authority, release, health, deployment posture, and maturity per context. | Catalog metadata is a control-plane read model, not an operational system of record. |
| **Operational ERP workspaces** | Provides controlled finance, procurement, inventory, sales, people, delivery/assets, service/CRM, work, cash, automation, Asia, and operational-insight workspaces. | Domain commands remain scoped to the bounded context; live payment execution, statutory filing, external transmission, and unreviewed payroll activation are unavailable. |
| **Canonical evidence projections** | Provides CFOM discovery, a semantic evidence-gap/readiness register, canonical item/supplier profiles, and the inventory-only Canonical Resource Evidence Bridge (CREB). | These are tenant-scoped read models. CREB does not create a second inventory ledger, adjust balances, convert units, value inventory, calculate COGS, or post accounting. |
| **Enterprise Intelligence cockpit** | Provides a governed 219-metric catalog, response-only metric evidence ledger, declared dependency/evidence-context view, deterministic priority signals, data-coverage gaps, and route links for human investigation. | It is not a financial ledger, data warehouse, forecast, causal model, autonomous recommendation engine, decision authority, or external data collector. Observed values are limited to retained tenant evidence. |
| **Enterprise Operating System intelligence** | Provides a tenant-scoped Knowledge Graph plus human-governed objectives, key results, decision memories, scenario preparations, explicit evidence links, and external-source contract readiness. | It does not infer links or causality, calculate forecasts/scenarios, invoke AI, collect external data, recommend/execute a decision, allocate capital, post, pay, file, or create financial, payroll, or external effects. |
| **Operating System Validation Program** | Provides tenant-scoped structural benchmark posture, metric-trust disclosure, human-recorded validation observations with separate verification, decision replay, explicit evidence paths, and data-collection readiness. | It does not auto-track behavior, auto-grade success, certify quality/compliance, infer causality, calculate ROI/forecasts/scenarios, recommend/execute a decision, post/pay/file, calculate tax/payroll, collect externally, or cause external effects. |
| **Gate 1 Operations Reliability** | Provides tenant-gated request-time liveness/readiness posture, correlation IDs, bounded completion logs, browser-facing security headers, per-process rate-limit refusal, local-only capacity-harness guidance, and explicit maturity gaps. | It is not a telemetry/alerting/trace backend, distributed rate limiter, uptime/SLO/error-budget result, recovery drill, backup service, production load test, financial/payroll control, or external integration. |
| **Gate 2 Adoption & Operator Validation** | Provides role-aware first-session orientation, a bounded journey/recovery catalog, consent-confirmed human-recorded adoption-study protocols, pseudonymous task observations, and separate human protocol/observation review. | It is not clickstream/session replay, behavioral profiling, an adoption/satisfaction/ROI claim, production-readiness proof, payroll authorization, financial control, external telemetry, integration, AI, or autonomous action. |
| **Gate 3 GitHub External Evidence** | Provides a tenant-scoped, server-only-credential reference; draft/validated/separately-authorized/active/revoked source lifecycle; human-triggered bounded GitHub metadata acquisition; filtered raw payload/version hashing; normalized read projection; and separate evidence review. | It is not a broad data platform, secret store, webhook, poller, scheduler, retry worker, GitHub write integration, source-completeness/quality claim, ERP source of truth, metric calculation, recommendation, financial/payroll/tax control, or external action beyond an explicit read-only request. |
| **Costing Engine evidence controls** | Retains finance-owned effective-dated policy revisions, immutable layers, deterministic allocation evidence, and read-only valuation previews. | Evidence is not a financial effect: no layer consumption, inventory revaluation, COGS, journal/GL, tax, payroll, payment, filing, or external action is activated. |
| **Decision governance** | Scores SAP, alternative ERP, and custom delivery using declared criteria and weights. | The score is transparent decision support, not an automatic procurement recommendation. |
| **AI evidence review** | Produces a structured summary, assumptions, gaps, and risks from user-supplied evidence. | The server forces `humanApprovalRequired = true`; only authorized people can approve a review. |
| **Executive architecture dashboard** | Shows platform scorecards, governance evidence by venture, lifecycle, dependencies, technical debt, risks, and readiness. | Metrics without connected delivery/observability sources remain explicitly marked as integration-needed. |
| **Architecture governance portal** | Projects ADR timeline, context impact, alternatives, technical debt, risk, review, standards, roadmap, and RFC seam. | ADR Markdown remains the durable decision source; the UI does not fabricate code-change linkage. |
| **Architecture assistant** | Answers venture-scoped platform questions using ADRs, catalog metadata, maturity evidence, and accessible governance records. | Read-only evidence-bound retrieval; it cannot browse the web, act, grant access, or approve a decision. |
| **Scoped RBAC** | Manages roles, permissions, venture/module assignment requests, approval application, and access-review posture. | Existing membership remains the tenant boundary; ABAC is a documented future evolution, not an unsafe partial claim. |
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
  platform/               # Tenant boundary, maturity, catalog, executive and governance projections
  governance/             # Decision scoring and AI approval policy
  assistant/              # Read-only evidence retrieval and model synthesis
  intelligence/           # Governed metric catalog, response-only ledger, dependency context, priority signals
                          # Knowledge Graph plus human-governed objectives, decision memory, scenarios, evidence links, and source-contract readiness
  iam/                    # Roles, permissions, scoped assignment and effective-permission policy
  erp/                    # Tenant-scoped operational, finance-evidence, costing, and canonical-projection services
  routers/                # Typed API contracts for platform, governance, assistant, and IAM contexts
  _core/                  # Managed runtime infrastructure (do not change casually)

drizzle/
  schema.ts               # Venture, membership, governance case, evidence-review schema
  migrations/             # Additive database migrations

contracts/public/         # Versioned public service contracts
docs/
  README.md               # Documentation hub and truthful capability map
  adr/                    # Architecture Decision Records
  architecture/           # Context boundaries and migration roadmap
  platform/               # Standards, maturity, scorecards, validation notes
  research/               # Source notes used by architecture decisions
infra/                    # Infrastructure-as-code direction and deployment expectations
.github/workflows/        # CI quality gates
scripts/                  # Contract and foundation verification
```

## Evidence-bridge roadmap and enterprise finance research

The user-supplied institutional-finance roadmap is preserved in [`docs/research/ENTERPRISE-FINANCE-AND-OPERATIONS-ROADMAP.md`](docs/research/ENTERPRISE-FINANCE-AND-OPERATIONS-ROADMAP.md). It prioritizes governed inventory valuation/cost accounting, deterministic COGS/margins, fixed assets, treasury, an Investment Book of Record, formal reporting, budgeting, manufacturing, supply chain, and an evidence-bounded AI finance copilot.

The roadmap is an **input to architecture decisions**, not a claim that these engines are active. The implemented first step is an evidence-only **Costing Engine foundation** at `/costing`: finance-owned effective-dated policy revisions, immutable receipt cost layers, deterministic landed-cost allocation evidence, read-only valuation previews, and invariant reports. It is deliberately separate from journals and balances. The active inventory-only **Canonical Resource Evidence Bridge (CREB)** makes retained profile, movement, balance, document, declared source-fact, accounting-evidence, Costing Engine, and exact finance-dimension evidence reviewable under a canonical `Resource:{itemMasterId}` vocabulary. It returns only reconciled, exception, or insufficient-evidence status and never corrects a record.

The separately authorized **Canonical Obligation Evidence Bridge (COEB)** is now implemented as a tenant-scoped, read-only Cash Control projection over retained payable/receivable invoices and purchase/sales commitments. It preserves explicit document, three-way-match, receipt/fulfillment, internal payment, aging, declared dimension, and immutable-evidence references; it reports only `reconciled`, `exception`, or `insufficient_evidence` and never corrects a record. It has no COEB table, payment action, invoice mutation, journal behavior, accounting effect, tax/payroll calculation, filing, integration, or external effect. See [the COEB design record](docs/architecture/CANONICAL-OBLIGATION-EVIDENCE-BRIDGE-DESIGN.md) and [original roadmap decision](docs/architecture/CANONICAL-OBLIGATION-EVIDENCE-BRIDGE-ROADMAP.md). Each financial capability must still be separately authorized, finance-owned, effective-dated, tenant-scoped, evidence-backed, independently validated, and tested before activation. The workspace does not create COGS, inventory revaluation, revenue recognition, capitalization/depreciation, investment calculation, payment execution, tax/payroll determination, filing, external transmission, accounting-control posting, or formal financial statements. Indonesian payroll remains draft-only until a qualified Indonesian payroll/tax reviewer gives written, effective-dated approval.

## Using the workspace safely

Open **Workspace guide** in the left navigation for an in-product walkthrough. It now includes an **Every active route** index: each route explains its purpose, the visible safe human action, retained evidence to review, and active boundary. The same contextual help panel appears at the bottom of every active page. Start by selecting a venture in the header: that scope determines the records, controls, and authorization visible to you. Use the portfolio and architecture workspaces to understand governance and maturity; use operational modules to create and progress tenant-scoped internal records; use Journal Control to configure/review finance-owned rules, evidence, and simulations; use **Costing Engine** only to retain finance-reviewed policy/layer/evidence previews; and use Finance Reporting only as an evidence-backed activity view.

For a portfolio-level analytical review, open **Enterprise Intelligence**. Begin with a deterministic priority signal or an observed scorecard card; inspect the metric’s source-code definition version, effective date, formula, response-only evidence-ledger row, source/gap lineage, readiness, and collection path; then navigate to the named source workspace for a human investigation. The dependency display communicates declared input/evidence context only. It does not infer causality, forecast performance, select a recommendation, or execute any decision.

For strategic context, open **Knowledge Graph** to filter and inspect only explicit retained links between metrics, source evidence, canonical objects, operations, workflow, audit, governance, and the human-governed planning layer. Open **Enterprise Operating System** to create a real objective, key result, decision memory, scenario preparation, explicit evidence link, or source-contract draft for the active venture. The selected record must state its evidence requirement, assumptions, and limitations; a distinct authorized person must perform lifecycle approvals. A source-contract approval records readiness only—it does not connect a provider or begin collection. See [Enterprise Operating System Intelligence Design](docs/architecture/ENTERPRISE-OPERATING-SYSTEM-INTELLIGENCE-DESIGN.md) for the complete safe-use flow.

For a validation review, open **Operating System Validation Program**. Inspect the dimension’s source, unit, and stated limitation before interpreting it. Use metric structural trust only to learn whether a formula, retained evidence, tenant scope, and gap disclosure are present—never as a business-success or data-accuracy score. Record a deliberately human-measured question, review, or outcome only when the source reference and limitation are known; a different authorized human must verify/reject the observation. Retain a release benchmark only to preserve the exact structural evidence posture for later review, then obtain separate approval. See [Operating System Validation Program Design](docs/architecture/OPERATING-SYSTEM-VALIDATION-PROGRAM-DESIGN.md) for the full collection, privacy, and interpretation gates.

For Gate 1 review, open **Operations Reliability**. A green `readyz` result establishes only that the application process completed its bounded database-readiness check at that instant. It does not establish availability, performance, backup health, recovery time, SLO attainment, security certification, or production capacity. Capture the returned `x-request-id` when investigating an observed failure; use `pnpm test:gate1-capacity` only for its default bounded localhost health-probe exercise. See [Gate 1 Production Hardening Design](docs/architecture/GATE-1-PRODUCTION-HARDENING-DESIGN.md) for the exact implementation, recovery ownership, operational gaps, and exit evidence.

For Gate 2 adoption review, open **Adoption & Operator Validation**. Select an active venture, read the role lens and real bounded journey before the participant begins, and use the recovery guide to explain a refusal or gap rather than bypassing it. An authorized leader may retain a draft study protocol, but a different authorized leader must approve it before a facilitator records a task. The observation requires an explicit consent confirmation and a pseudonymous participant reference; a different authorized leader must verify or reject it. Rates remain withheld until verified independent observations exist, and every observed value remains scoped to its stated sample, task, environment, and limitations. See [Gate 2 Adoption and Operator Validation Design](docs/architecture/GATE-2-ADOPTION-VALIDATION-DESIGN.md) for the protocol and exit evidence.

For Gate 3 source evidence, open **External Evidence**. An authorized leader may draft one GitHub repository connection, preserving only the repository/scope/classification and policy statements—not a credential. Validate server-side access, then have a different authorized leader review/authorize it before explicit activation. An active connection permits one manual bounded page request for its declared resource types; it retains filtered source evidence, source/version hashes, pagination/rate-limit posture, and a deterministic read projection. A different human reviews the retained provider evidence. GitHub evidence stays external evidence: it does not become an ERP record, metric truth, recommendation, decision, financial or payroll fact. See [Gate 3 GitHub Evidence Acquisition Design](docs/architecture/GATE-3-GITHUB-EVIDENCE-ACQUISITION-DESIGN.md) and the [Gate 3 Runbook](docs/platform/GATE-3-GITHUB-EVIDENCE-RUNBOOK.md).

The interface marks deliberate boundaries rather than concealing them. A visible control or form does not imply live banking, logistics, invoicing, tax, payroll, valuation, posting, formal statements, or external integrations. Follow the workspace notices, create records only from real authorized operating evidence, and use the audit register to trace changes. The `docs/` directory contains the durable design, research, ADR, and validation records for review in GitHub.

## Local development and quality gates

Use the project’s managed environment and never store deployment credentials in the repository.

```bash
pnpm dev
pnpm check
pnpm test
pnpm test:integration
pnpm contracts:validate
pnpm verify:foundation
pnpm test:gate1-capacity
pnpm security:baseline
pnpm build
```

The current implementation validated `pnpm check`, `pnpm build`, all Vitest suites, integration suites, the public-contract validator, and the foundation verifier. The latest completed Operating System Validation Program gate recorded **109 tests** under `pnpm test` and **29 tests** under `pnpm test:integration`; Gate 1 results are recorded separately in [Validation Notes](docs/platform/VALIDATION-NOTES.md) when their full verification completes. Before a production release, run the deployed health probe and a contract smoke suite against the target environment as described in `docs/platform/ENGINEERING-STANDARDS.md`.

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

## Enterprise control plane

The control plane is the platform’s engineering and governance operating layer. It is deliberately honest about its sources: catalog and ADR data are governed metadata; venture comparisons are derived from accessible decision records; delivery frequency, MTTR, traces, queues, error budgets, and integration health stay marked **integration-needed** until a source system is connected. This avoids the common failure mode of presenting a polished dashboard that implies operational truth it cannot verify.

| Workspace | Leadership question | Current evidence source | Future integration boundary |
|---|---|---|---|
| Executive Architecture | Where is platform risk and maturity investment concentrated? | Catalog evidence, ADR registry, membership-scoped governance cases. | CI/CD, incident, SLO, trace, and delivery systems. |
| Architecture Governance | Which decisions affect which contexts, and what did we deliberately reject? | ADR registry, declared ownership, maturity evidence. | RFC workflow and repository-change links. |
| Architecture Assistant | What does the platform evidence say about a venture-specific question? | Venture-scoped governance, ADRs, catalog, and maturity gaps. | Curated documentation index and approved knowledge connectors. |
| Access Administration | Who can govern a venture or module, and how did access change? | Memberships, roles, permissions, assignments, and access-change records. | Organization hierarchy, service accounts, API clients, ABAC policy evaluation, and audit export. |

Read [Enterprise Platform Implementation Guide](docs/architecture/ENTERPRISE-PLATFORM-IMPLEMENTATION.md), [Control Plane Design](docs/architecture/PLATFORM-CONTROL-PLANE-DESIGN.md), [ADR-007](docs/adr/ADR-007-scoped-rbac-and-abac-evolution.md), and [ADR-008](docs/adr/ADR-008-evidence-bounded-architecture-assistant.md) for rationale, alternatives, operational costs, migration, rollback, production considerations, and multi-year evolution.

## Further reading

Read the [Executive Architecture Handbook](docs/EXECUTIVE-ARCHITECTURE-HANDBOOK.md) for the operating philosophy, decision framework, transition plan, and governance model. Read [Upgrade Options](docs/architecture/UPGRADE-OPTIONS.md) for the critical comparison that led to the selected architecture.

## References

[1] [Microsoft Learn — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)  
[2] [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html)  
[3] [SAP — Clean core extensibility for SAP S/4HANA Cloud](https://www.sap.com/documents/2024/09/20aece06-d87e-0010-bca6-c68f7e60039b.html)
[4] [NIST — Role Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)  
[5] [NIST — Attribute Based Access Control](https://csrc.nist.gov/projects/attribute-based-access-control)  
[6] [NIST SP 800-162 — Guide to Attribute Based Access Control](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
