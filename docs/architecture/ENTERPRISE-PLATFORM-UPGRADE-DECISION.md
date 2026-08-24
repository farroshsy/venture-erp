# Enterprise Platform Upgrade Decision

**Status:** Accepted scope for the current platform increment  
**Decision owners:** Enterprise Architecture, Platform Engineering, Portfolio Operations

## Problem

Venture ERP has a strong service-aligned ERP foundation but lacks the leadership control plane expected of a long-lived enterprise platform. Engineering leadership cannot yet compare maturity across ventures, explore architectural decisions interactively, manage access at module granularity, or query platform knowledge through a safely constrained assistant.

The goal is not to imitate a hyperscaler control plane in one release. It is to establish the **governance primitives and seams** from which that control plane can grow without breaking tenant isolation or embedding business logic in a dashboard.

## Options considered

| Option | Advantages | Disadvantages | Decision |
|---|---|---|---|
| Build every requested platform service as a live distributed product now | Maximum feature breadth and an immediate demonstration of the target organization. | Would fabricate SLOs, delivery metrics, traces, integrations, workflow execution, and audit evidence; operational cost would exceed evidence of need. | Rejected. |
| Add dashboards as disconnected static mock data | Fast visual result. | Violates platform truthfulness and cannot govern real services or ventures. | Rejected. |
| Introduce an enterprise governance control plane with persisted access policy and transparent derived projections | Creates reusable architecture, IAM, catalog, ADR, assistant, and metric seams without inventing unavailable operational facts. | Requires explicit distinction between measured records, catalog metadata, and future integrations. | **Selected.** |
| Replace current role checks with a full external IAM product immediately | Potentially rich hierarchy and policy language. | High migration and lock-in risk; unsafe to switch identity authority before the current tenant boundary and audit model are mature. | Deferred behind an IAM evolution path. |

## Selected scope

| Capability | Implementation now | Deferred boundary |
|---|---|---|
| Executive architecture dashboard | Derived maturity, lifecycle, extraction, ownership, dependency, ADR, technical-debt, and readiness views from the platform catalog and governance records. | Live DORA, SLO, MTTR, trace, queue, and error-budget ingestion until an observability source is connected. |
| ADR governance | Interactive catalog, timeline, impact links, rejected alternatives, review state, linked bounded contexts, and ownership metadata. | Full RFC authoring and code-provider webhook linking. |
| Architecture assistant | Venture-scoped chat that retrieves bounded platform facts, ADRs, maturity gaps, active decisions, and catalog dependencies before asking the model to synthesize. | Autonomous action execution, external web retrieval, and unbounded cross-tenant context. |
| IAM / RBAC | Persisted role definitions, permission grants, module scopes, assignment changes, delegated-admin controls, audit-ready approvals, and access-review projection. | Full organization tree, service accounts, API clients, and ABAC policy interpreter. |
| Platform catalog | Capability, context, contract, dependency, lifecycle, security, operational, runbook, ADR, and extraction metadata. | Runtime discovery and integration health from real external systems. |

## IAM decision

The near-term model is **role-based access control with policy-ready attributes**. RBAC maps operational privileges to named organizational responsibilities and is easier to administer at this stage; NIST describes it as a model where users are assigned roles and roles receive privileges. [1] ABAC evaluates subject, object, operation, and environment attributes against policy, which is powerful for future hierarchy and context-aware authorization but requires disciplined attribute governance. [2] [3]

The implementation therefore persists role and permission concepts now, preserves `ventureId` and `moduleId` scope as first-class attributes, and records future ABAC inputs such as environment, business unit, and service identity as a **documented extension path**. It deliberately does not claim a complete ABAC engine.

## Architecture-assistant decision

The assistant is retrieval-constrained rather than generic. The server constructs a venture-scoped evidence packet from authorized platform records, ADR metadata, catalog entries, active decisions, and maturity gaps. The model receives that packet and the user’s question, but it does not receive database credentials, unfiltered tenant records, or permission to write policy. Every response identifies its platform evidence, assumptions, and suggested human next step.

## Operational cost and rollback

| Change | New operational cost | Rollback posture |
|---|---|---|
| Governance dashboard | Catalog/ADR metadata curation. | Disable the route; no operational source data is mutated. |
| Assistant | Model request cost, prompt governance, evidence freshness, audit retention. | Disable model invocation while retaining the evidence packet and approved records. |
| RBAC administration | Policy design, assignment review, access-change audit. | Revert role assignments; preserve existing venture membership as the minimum safe control. |
| Catalog expansion | Ownership and lifecycle maintenance. | Treat unmapped fields as unknown; do not infer readiness. |

## References

[1] [NIST — Role Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)  
[2] [NIST — Attribute Based Access Control](https://csrc.nist.gov/projects/attribute-based-access-control)  
[3] [NIST SP 800-162 — Guide to Attribute Based Access Control](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
