# ADR-004: Contract Versioning and Eventing for Independent Service Evolution

**Status:** Accepted  
**Date:** 2026-08-23  
**Decision owner:** Platform Engineering

## Context

Bounded contexts cannot evolve independently if consumers call private endpoints, read private tables, or rely on undocumented message shapes. Versioning must establish a predictable consumer-migration path while preserving the possibility of event-driven portfolio projections and service extraction.

## Decision

Every external synchronous contract and published domain event is versioned by context. Additive, backward-compatible fields may remain within a compatible contract version. Removing meaning, changing semantics, or changing a required field creates a new major contract and a documented consumer migration window. The context that publishes the contract owns the compatibility test and release notes.

| Rule | Decision | Rejected alternative |
|---|---|---|
| Data access | Consumers use a public API or event projection. | Cross-context reads from a shared table. |
| Event ownership | The source context emits a past-tense domain event after it owns the state transition. | A central event service inventing business events it does not own. |
| Delivery | Contract compatibility tests run before a context can publish. | Coordinated deployment as the default integration mechanism. |
| Recovery | Consumers are idempotent and use correlation IDs; failed side effects use compensation or reconciliation. | Assuming distributed transactions across services. |

## Consequences

Contract stewardship creates intentional release work, but it turns implicit coupling into visible migration cost. The current repository contains the first public contract and validator. Before first physical extraction, each candidate must publish its API/event schema, consumer list, deprecation policy, and compatible-release test suite.

## References

[1] [Microsoft Learn — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)
