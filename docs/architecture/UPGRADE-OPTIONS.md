# Upgrade Options and Architecture Decision Matrix

This assessment evaluates the choices that were possible before implementing the foundation. It is intentionally critical: an ERP architecture should not use the word “enterprise” as a substitute for evidence.

## Decision

> Adopt a **service-aligned foundation** immediately, with a measurable path to independently deployed services. Do not create a physical service merely because a folder, feature, or organizational team exists.

| Option | What is good | What is risky or weak | Outcome |
|---|---|---|---|
| Immediate physical microservices | Clean runtime blast-radius boundaries and truly independent rollout potential. | Requires operational tooling, tracing, event handling, deployed contract testing, data migration, and ownership maturity that early ERP teams commonly lack. | Rejected as the initial runtime topology; retained as the destination. |
| Feature-folder monolith | Simple for a small team and minimizes early infrastructure work. | It does not protect boundaries, data authority, or release isolation. It can become a tightly coupled ERP rewrite. | Rejected. |
| Generic modular monolith | Faster deployment and local transaction handling. | Without enforced tenancy, contracts, ownership, and extraction criteria, it is only a naming convention. | Rejected as insufficient. |
| Service-aligned foundation | Creates contracts, tenant checks, data authority, maturity gates, and module ownership while avoiding unnecessary network boundaries. | Requires governance discipline, and deployment independence is not yet physical. | Selected. |
| Vendor-core customization | May deliver a familiar ERP screen or report quickly. | Creates upgrade pressure and can turn differentiated processes into vendor coupling. | Avoid for strategic differentiation; prefer supported extension seams. [3] |

## Why the selected option is the better trade

The selected design gives modules an **independent future** without pretending they already have independent infrastructure. Each capability is defined as a platform-service candidate. Its extraction must be justified by an operational condition: separate release cadence, unique scale profile, regulatory or privacy boundary, independent team ownership, external integration risk, or recovery objective.

| Extraction criterion | Evidence required before physical split | Fallback if evidence is absent |
|---|---|---|
| Release independence | Consumers pass compatible contract tests; no coordinated release is required. | Keep the module in the managed control plane. |
| Data authority | The context owns its records and can move them without joins into another context. | Remove cross-context persistence dependencies first. |
| Operational maturity | Telemetry, runbook, on-call ownership, security review, and rollback rehearsal exist. | Improve its L0–L2 maturity scorecard. |
| Scale or resilience need | The workload cannot safely share runtime or deployment capacity with the control plane. | Measure the workload before scaling architecture. |
| Organizational fit | A stable team has explicit business and engineering ownership. | Keep a shared team but retain a named context owner. |

## Build-versus-buy decision procedure

The workbench is designed to create an auditable record, not a predetermined answer. First state the business capability and choose decision weights. Then score SAP, an alternative ERP, and custom delivery consistently. Finally record evidence, assumptions, and gaps before requesting an AI-assisted draft. A named human approves or rejects the record.

| Criterion | Question for leadership | Common sign of custom opportunity |
|---|---|---|
| Process differentiation | Does the workflow materially change venture advantage? | The process is core to the venture’s operating model, not merely a local preference. |
| Compliance fit | Are regulations or controls satisfied without expensive workaround? | The custom component can remain narrow while a system of record handles controls. |
| Integration complexity | Can data flow over supported contracts and events? | The capability can be isolated behind a canonical contract. |
| Total cost | What are implementation, change, maintenance, and exit costs? | The differentiated value exceeds the lifetime operating burden. |
| Lock-in | What becomes difficult to change later? | A contract boundary protects the custom capability and vendor integration. |
| Delivery capacity | Can the team build, test, secure, and operate this service? | A durable owner and maturity plan exist. |

## References

[1] [Microsoft Learn — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)  
[2] [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html)  
[3] [SAP — Clean core extensibility for SAP S/4HANA Cloud](https://www.sap.com/documents/2024/09/20aece06-d87e-0010-bca6-c68f7e60039b.html)
