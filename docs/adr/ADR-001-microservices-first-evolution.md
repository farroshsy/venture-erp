# ADR-001: Service-Aligned Microservices-First Evolution

**Status:** Accepted  
**Date:** 2026-08-23  
**Decision owner:** Enterprise Architecture Council

## Context

Venture ERP must let a portfolio operate several ventures without forcing a finance, procurement, inventory, people, or project release to move in lockstep. It must keep data ownership explicit, allow bounded contexts to evolve behind stable interfaces, and make future independent deployment a deliberate operational decision rather than a repository rewrite.

## Decision

The target architecture is **microservices-first**, with a gateway, owned data stores, versioned contracts, asynchronous domain events, and independent release trains. The executable foundation remains a **service-aligned control plane** because the managed runtime hosts one web process. This is not a shared-domain monolith: each module has a declared owner, contract, persistence boundary, maturity profile, release record, and extraction path. No module may read another module's persistence directly.

The platform begins with a deliberately small **Platform Kernel** containing venture identity, membership, authorization, contract registration, audit intent, and routing metadata. All commercial and operational capabilities are represented as bounded contexts. A context is physically extracted only after it has earned the operational cost through the criteria below.

| Option | Advantages | Disadvantages | Decision |
|---|---|---|---|
| Fully distributed services on day one | Maximum fault and deployment isolation | Requires orchestration, observability, service discovery, runbooks, test environments, and mature operations before product learning | Rejected for the managed foundation |
| Unbounded modular monolith | Fastest initial coding path | Weak governance makes cross-domain imports and shared database access likely; later extraction is expensive | Rejected |
| Service-aligned microservices-first foundation | Stable contracts and data ownership now; independent extraction later; lower initial operational burden | Requires architectural discipline and automated boundary checks | **Accepted** |

## Extraction Criteria

A bounded context becomes an independently deployed service when at least three conditions hold: it has a distinct release cadence; it has a dedicated owning team or operational responsibility; it introduces a material scale, security, or availability profile; it has contract-tested consumers; and its synchronous dependencies can be reduced to gateway calls or events. Extraction must preserve the public contract, migrate data via replicated projections or backfill, and leave a rollback path to the prior adapter for at least one release window.

## Consequences

Independent release is a product of compatible contracts, data ownership, automation, and observability—not merely separate folders or containers. Each context must therefore publish semantically versioned APIs, compatibility windows, change notes, health probes, ownership metadata, SLOs, and operational runbooks. The gateway remains policy and routing only; business decisions remain inside their owning context. This aligns with guidance that a service should map to a business capability and own its data, while avoiding overly granular services that create excessive distributed-system cost.[1]

## References

[1]: https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices "Microsoft Learn — Microservices architecture style"
