# Platform Engineering Standards

Every bounded context uses the service template, repository conventions, contract registry, and delivery pipeline. The objective is freedom **within** a governed platform: teams own a service end to end without diverging on authentication, telemetry, deployment safety, or documentation.

| Standard | Required implementation |
|---|---|
| Contract first | Versioned JSON or OpenAPI contract under `contracts/`; compatible additions are minor, breaking changes create a new major version. |
| Ownership | `service.yaml` identifies business owner, engineering owner, escalation contact, data classification, SLO, and dependency inventory. |
| Data ownership | A context owns its schema and repository functions; direct cross-context data access is prohibited. |
| Security | Threat model for L2+, least privilege, secrets only through the environment manager, dependency checks, vulnerability response runbook. |
| Observability | Structured logs, correlation IDs, request latency/error metrics, health checks, audit events for privileged actions. |
| Testing | Unit, contract, integration, and migration tests; user-critical workflows receive end-to-end checks. |
| Delivery | Static analysis, tests, production build, contract compatibility, dependency review, staged rollout, and deployment verification. |
| Documentation | README, ADRs, API contract, runbook, data classification, ownership, and change log are co-versioned with code. |

## Directory Convention

```text
contracts/                 # Versioned public APIs and domain-event schemas
docs/adr/                  # Architecture decisions and rejected alternatives
docs/architecture/         # Domain map, migration, executive handbook
docs/platform/             # Standards, maturity, templates, runbooks
infra/                     # IaC modules, environment manifests, delivery policy
server/platform/           # Gateway policy, tenant context, contracts, shared operational primitives
server/routers/            # Context-facing tRPC gateway adapters
server/modules/<context>/  # Context application code; no cross-context persistence imports
shared/domain/             # Stable, dependency-light domain vocabulary only
client/src/features/       # Context-owned UI features
```

The existing scaffold remains the application host. The target directory structure is introduced incrementally so the codebase gains explicit boundaries without a destabilizing rewrite.
