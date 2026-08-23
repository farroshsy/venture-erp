# ADR-002: Venture-Scoped Isolation and Permission Boundaries

**Status:** Accepted  
**Date:** 2026-08-23  
**Decision owner:** Platform and Security

## Decision

Every business record carries a `ventureId` assigned by the owning bounded context. Requests resolve an **active venture** from a validated membership, not from a client-trusted field. The platform kernel is the authority for venture membership; domain contexts enforce their own role-to-action rules using the resolved venture scope.

| Layer | Requirement |
|---|---|
| Identity | Authenticate a human or workload identity before resolving an active venture. |
| Membership | Store membership separately from the venture and require it for any venture-scoped action. |
| Authorization | Evaluate least-privilege role and action policy inside the called context. |
| Data | Filter by `ventureId` in every query and prohibit unscoped repository functions. |
| Contracts | Pass the resolved tenant context as a trusted request claim; never derive scope from display names. |
| Audit | Emit a decision record for approval, escalation, role, or scope changes. |

The initial kernel provides `portfolio_admin`, `venture_lead`, `finance_lead`, `operator`, and `viewer` roles. Contexts may add action-specific policies but cannot weaken the membership boundary. Cross-venture reports are allowed only through portfolio-level read models and require a portfolio role.

## Consequences

This approach supports a shared platform database at foundation stage without legitimizing shared-domain access. It makes later database-per-service extraction mechanical: each context moves only records it owns, while the platform kernel retains identity and membership. It also makes accidental cross-venture queries a testable failure condition.
