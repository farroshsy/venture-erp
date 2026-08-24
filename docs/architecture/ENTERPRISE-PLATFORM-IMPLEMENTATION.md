# Enterprise Platform Implementation Guide

## Purpose

This increment evolves Venture ERP from an ERP foundation into an **enterprise control plane** for multiple ventures. The control plane explains and governs domains; it does not replace the transaction systems those domains will own. Every projection clearly differentiates catalog evidence and governed records from future live telemetry.

## Implemented platform capabilities

| Capability | Problem solved | Selected implementation | Alternatives rejected | Operational cost and rollback |
|---|---|---|---|---|
| Executive architecture dashboard | Leadership lacked a single view of maturity, ownership, dependency, and architecture risk. | Derives scorecards, lifecycle, dependencies, ADR count, technical debt, known gaps, and venture governance evidence from platform records. | Static screenshots or fabricated DORA/SLO data. | Requires catalog curation; routes can be disabled without changing operational records. |
| Architecture governance workspace | ADRs were durable files but hard to explore as a portfolio. | Projects a timeline, impact map, alternatives, technical debt, risks, review posture, standards, roadmap, and RFC seam from a governed registry. | Replacing ADR files with UI-only records; introducing a full RFC engine before review workflow exists. | Registry metadata requires ownership; source ADR files remain the rollback-safe record. |
| Platform service catalog | Modules did not expose their complete platform contract. | Adds business capability, API/event seams, dependencies, consumers, lifecycle, security posture, runbook, ADR links, maturity, and extraction readiness. | Runtime discovery claims without connected sources. | Owners maintain metadata; unknown information remains explicitly unknown. |
| Architecture assistant | Operators could not query venture architecture evidence in natural language. | Builds a server-side, venture-scoped evidence packet and uses a structured model answer with citations, assumptions, gaps, and suggested human actions. | Generic public chat, external web retrieval, or autonomous changes. | Model cost and prompt governance; disable invocation while retaining audited conversation records. |
| RBAC administration | Venture membership was necessary but insufficient for module-level governance. | Adds roles, permissions, scoped assignments, access-change requests, effective permission evaluation, and review application. | A broad admin bypass or immediate external IAM migration. | Requires role governance and access review; assignments can be suspended or reverted without altering source membership. |

## Security architecture

The platform retains **membership-first tenant isolation**. Every assistant and IAM request resolves active membership for the requested venture before it collects data or changes access. RBAC applies named permissions through role assignments constrained by portfolio, venture, or module scope. NIST characterizes RBAC as associating users with roles and roles with privileges; it reduces the administrative cost of per-user grants. [4] The data model deliberately preserves scope attributes so it can evolve toward ABAC, whose policies evaluate subject, object, operation, and environment attributes. [5] [6]

The assistant is read-only. It does not receive secrets, unrestricted database access, external web tools, or authority to approve a governance case or grant a role. Its response schema separates answer text from citations, assumptions, information gaps, and recommended actions. The server filters citations to evidence IDs it actually supplied.

## Repository evolution

The repository now has logical platform roots while preserving a single deployable managed application. This is deliberate: the structure encourages team-scale ownership before infrastructure-scale separation.

```text
client/src/pages/             # Portfolio, executive, governance, assistant, access-admin workspaces
server/platform/              # Catalog, maturity, tenant scope, executive and governance projections
server/governance/            # Build-versus-buy and human-approved evidence policy
server/assistant/             # Read-only evidence retrieval and model synthesis
server/iam/                   # Roles, permissions, scoped assignment and effective-permission policy
server/routers/               # Typed platform, governance, assistant, and IAM contracts
shared/domain/                # Reusable platform vocabulary, never shared business rules
contracts/                    # Stable public API/event definitions
docs/adr/                     # Durable decisions and rejected alternatives
docs/architecture/            # Context boundaries, trade-offs, operating model, and migration plan
docs/platform/                # Standards, scorecards, runbooks, and validation evidence
tools/                        # Future template, contract-generation, and architecture-validation tooling
ops/                          # Future infrastructure, observability, and release automation configuration
```

The `tools/` and `ops/` roots are documented targets until their operational systems exist. They are not populated with placeholder automation that would claim an execution capability not present in this deployment.

## Migration and rollback

| Stage | Migration work | Success indicator | Rollback posture |
|---|---|---|---|
| Control-plane adoption | Populate owners, lifecycle, ADR links, and evidence gaps. | Catalog is trusted enough to expose unknowns rather than hide them. | Disable projections; canonical ERP data is unaffected. |
| IAM hardening | Review role templates, scope assignments, approval workflow, and access-review cadence. | All new changes are audited and effective permissions are test-covered. | Suspend/revoke new scoped assignments; preserve minimum membership control. |
| Assistant pilot | Restrict to approved venture data and monitor response cost, usefulness, and unsafe-output reports. | Operators can trace every answer to evidence IDs and no cross-venture result is observed. | Disable model calls while retaining evidence/history for review. |
| Observability connection | Connect deployment, incident, trace, queue, and integration sources. | KPI cards contain measured source timestamps rather than integration-needed states. | Disconnect a source and label metrics unavailable; do not infer values. |
| Service extraction | Follow L3 gates, contract compatibility, data migration, traffic staging, and rollback rehearsal. | A context releases without coordinated deployment and meets its SLO. | Route traffic to the prior implementation and reconcile projections. |

## Multi-year roadmap and measurable KPIs

The platform should measure only signals with an owned source. The first release creates the governing definition and UI location, not a fictional value.

| Horizon | Platform outcome | KPI source of truth |
|---|---|---|
| 0–12 months | Trustworthy control plane, governed tenant scope, contract/maturity visibility, access review, and AI evidence assistance. | Catalog coverage, ADR coverage, permission-review completion, contract checks, decision throughput. |
| 12–24 months | Instrumented delivery and observability integrations. | CI/CD deployment frequency and lead time, incident MTTR/change failure rate, traces, SLOs, error budgets, integration success. |
| 24–48 months | Federated services where justified by scale, security, or release cadence. | Extraction-ready context count, independent release success, cross-domain dependency count, shared-data violation count. |
| 48+ months | Self-service platform engineering and capability marketplace. | Time to scaffold service/venture, template adoption, developer onboarding duration, platform adoption, business cycle metrics. |

## Production considerations

The assistant needs budget limits, conversation retention policy, prompt/version review, and an incident escalation process before broad production use. IAM needs periodic access review, delegated-administration boundaries, separation-of-duties policy, and immutable audit export before it becomes the sole authorization system. Observability, integrations, workflows, document evidence, service accounts, and ABAC remain **explicit next capabilities**, not implied by this implementation.

## References

[1] [Microsoft Learn — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)  
[2] [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html)  
[3] [SAP — Clean core extensibility for SAP S/4HANA Cloud](https://www.sap.com/documents/2024/09/20aece06-d87e-0010-bca6-c68f7e60039b.html)  
[4] [NIST — Role Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)  
[5] [NIST — Attribute Based Access Control](https://csrc.nist.gov/projects/attribute-based-access-control)  
[6] [NIST SP 800-162 — Guide to Attribute Based Access Control](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
