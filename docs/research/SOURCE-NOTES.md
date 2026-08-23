# Architecture and ERP Source Notes

## Microservices Architecture Style — Microsoft Learn

Source: [Microsoft Learn — Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)

The source describes microservices as autonomous services mapped to a business capability within a bounded context. It identifies the API gateway, asynchronous messaging, observability, service-owned data, and independent deployment as common elements. It also identifies the associated costs: distributed-system complexity, integration and test difficulty, versioning, data consistency, governance, management maturity, and skill requirements. These findings informed ADR-001, the gateway rules, contract registry, maturity model, and extraction criteria.

## Microservice Trade-Offs — Martin Fowler

Source: [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html)

The source distinguishes benefits such as stronger module boundaries, independent deployment, and technology diversity from costs such as distribution, eventual consistency, and operational complexity. It argues that services add a “microservice premium” that only complex systems can justify. These findings informed the service-aligned foundation: preserve bounded contexts, data ownership, and contracts now, but extract a physical service only after operational evidence demonstrates a distinct release, risk, scale, or ownership profile.

## SAP Clean Core Extensibility

Source: [SAP — Clean core extensibility for SAP S/4HANA Cloud](https://www.sap.com/documents/2024/09/20aece06-d87e-0010-bca6-c68f7e60039b.html)

SAP positions clean-core extensibility as a way to extend where necessary while enabling smoother system upgrades. This informed the build-versus-buy workbench: standardized capabilities and compliance-heavy processes may favor SAP or an alternative suite, while genuinely differentiating capabilities should be assessed for a contract-isolated custom service rather than deeply modifying a vendor core.
