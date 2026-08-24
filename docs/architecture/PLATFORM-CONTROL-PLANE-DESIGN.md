# Platform Control Plane Design

## Design intent

The upgrade adds a **control plane**, not a competing transaction system. Its responsibility is to describe, govern, authorize, and explain the ERP platform. Finance, procurement, inventory, people, and project records remain owned by their bounded contexts. The dashboard may show a context’s readiness or health only through an explicit projection; it must not claim live operational performance without a connected source.

## Control-plane projections

| Projection | Source of truth | What it may show | What it must not imply |
|---|---|---|---|
| Executive architecture dashboard | Service catalog, ADR registry, governance cases, maturity evidence, access assignments. | Readiness, known gaps, ownership, dependencies, status, and actual governance counts. | Live deployment frequency, MTTR, traces, error budgets, or business throughput before collectors exist. |
| Venture maturity view | Venture records plus approved governance and scoped policy records. | Comparative governance coverage and known maturity status. | Independent operational maturity when no venture-specific instrumented source exists. |
| ADR governance | Versioned ADR registry and bounded-context links. | Decision timeline, ownership, status, alternatives, impact, and linked services. | Git-provider change linkage unless a repository integration is configured. |
| Platform catalog | Static catalog metadata with derived maturity. | APIs, event seams, dependencies, owners, security and runbook posture, extraction readiness. | Runtime topology discovery or integration health unless an observability/integration source is configured. |

## Authorization model

The access model is additive. Existing venture membership remains the minimum tenant boundary. New policy records grant capability permissions within a portfolio, venture, or module scope. A request succeeds only when the caller has an active venture membership **and** the required permission is granted by a compatible active assignment. Platform administrators retain administrative capabilities but do not bypass venture membership when reading venture data.

| Entity | Purpose | Key constraints |
|---|---|---|
| `platform_roles` | Reusable roles such as `venture_admin`, `architecture_reviewer`, and `module_operator`. | A role carries no tenant access by itself. |
| `platform_permissions` | Named capabilities such as `architecture.view`, `architecture.review`, or `module.finance.manage`. | Permissions use stable dotted identifiers for API enforcement and audit. |
| `platform_role_permissions` | Role-to-permission relation. | Supports additive permission grants without changing code role switches. |
| `platform_access_assignments` | A user’s role at portfolio, venture, or module scope. | Active assignment requires a target scope; mutation is tenant-admin-only. |
| `access_change_requests` | Approval-ready record for sensitive grant/revoke changes. | UI can display change intent and reviewer state; enforcement uses only approved active assignments. |

### RBAC now, ABAC later

The current increment uses RBAC with scope attributes because it is auditable, testable, and sufficient for venture/module administration. Future ABAC policies will evaluate subject, resource, action, and environment attributes, but the system will not pretend an unfinished policy engine is protecting data. The stored scope fields are intentionally compatible with that evolution.

## Architecture assistant retrieval policy

The assistant is a **read-only, evidence-bounded** server capability.

1. Resolve the user and active venture membership.
2. Collect only the platform catalog, ADRs, maturity gaps, permission posture, and governed decision records available within the user’s scope.
3. Create an evidence packet with source IDs and timestamps.
4. Instruct the model to answer only from that packet, distinguish fact from inference, name gaps, and recommend a human workflow when a decision or access change is needed.
5. Store the question, response, evidence references, and scope ID in a tenant-scoped chat history.

The assistant cannot execute database writes, grant permissions, approve governance cases, browse the public web, or answer about another venture. It is an architecture and governance co-pilot, not an autonomous administrator.

## Dashboard information architecture

| Workspace | Primary audience | Primary questions answered |
|---|---|---|
| Executive Architecture | Portfolio leadership | Where is delivery or extraction risk concentrated? Which ventures and contexts need investment or a governance decision? |
| Architecture Governance | Architects and reviewers | Which ADRs are pending, impacted, or linked to a context? What alternatives were rejected and why? |
| Platform Catalog | Engineering and product owners | Who owns this capability, what contract does it expose, what dependencies exist, and what blocks independent release? |
| Architecture Assistant | Authorized operators | What do the catalog, ADRs, maturity scorecards, and current venture governance records say about a question? |
| Access Administration | Portfolio and venture admins | Who can view, manage, or review which venture/module, and which access changes are awaiting approval? |

## Repository evolution

The current repository remains deployable as one managed application. The platform-oriented target is introduced as **logical roots** first: `server/platform`, `server/governance`, `server/iam`, `server/assistant`, `shared/domain`, `contracts`, `docs/architecture`, `docs/platform`, and `tools`. Physical multi-repository extraction is deferred until a context reaches the existing L3 criteria.
