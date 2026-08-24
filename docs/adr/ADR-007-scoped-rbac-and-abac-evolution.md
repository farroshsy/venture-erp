# ADR-007: Scoped RBAC Now, Policy-Ready ABAC Evolution Later

**Status:** Accepted  
**Date:** 2026-08-23  
**Decision owner:** Platform Engineering and Enterprise Architecture

## Context

Venture membership protects tenant boundaries, but it cannot represent a narrow module operator, an architecture reviewer, or an approved delegated administrator. The platform needs granular authority without replacing the existing identity authority or claiming a mature ABAC engine before attribute lifecycle, policy language, and decision telemetry are available.

## Decision

The platform uses RBAC with explicit portfolio, venture, and module scope. Roles grant stable dotted permissions; assignments apply those roles to an authenticated user only within an active scope. Access changes are created as reviewable records and only applied by an authorized venture or portfolio administrator. Existing venture membership remains necessary for all venture-scoped reads and writes.

| Choice | Benefit | Cost | Rejected alternative |
|---|---|---|---|
| Scoped RBAC | Auditable, explainable, and testable role/permission grants. | Requires role catalog maintenance and access-review process. | A broad `admin` bypass. |
| Preserve scope attributes | Allows later policies for organization, business unit, environment, service identity, time, and risk. | Does not yet evaluate all ABAC attributes. | Pretending module scope alone is complete ABAC. |
| Reviewable change records | Makes grants and revocations governance artifacts. | Adds approval workflow overhead. | Direct user-table permission mutation. |

## Consequences

The current implementation is a production-minded authorization foundation, not a complete enterprise IAM product. Service accounts, API clients, organizational hierarchy, delegated policies, separation of duties, and ABAC evaluation are planned extensions. NIST describes ABAC as evaluating subject, object, operation, and environment attributes, which requires a governed attribute model. [1]

## References

[1] [NIST SP 800-162 — Guide to Attribute Based Access Control](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
