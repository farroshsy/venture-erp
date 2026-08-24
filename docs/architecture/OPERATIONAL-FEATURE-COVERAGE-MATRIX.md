# Operational Feature Coverage Matrix

**Status:** Delivery baseline and accountable roadmap  
**Purpose:** Prevent unsupported parity claims while showing how Venture ERP’s shared operational core can mature into a multi-venture ERP platform.

## Coverage interpretation

“Implemented” means the capability is backed by tenant-scoped persistence, typed API contracts, role checks, audit evidence, and an operational UI or verified service workflow. “Shared-core ready” means the generic operational-record and workflow foundation supports the domain but does not yet provide its specialized transactions, state machine, or reporting. “Prerequisite-bound” means the capability additionally needs a reviewed jurisdiction pack, provider adapter, local policy owner, or other explicit production gate.

| Domain | Current capability | Status | Next accountable increment | Production boundary |
|---|---|---|---|---|
| General ledger | Account-master and journal-entry primitives, accounting periods, operational records, audit events. | Shared-core ready | Balanced journal validation, posting batches, close checklist, AR/AP aging. | Chart-of-accounts policy, close authority, and accounting standards remain venture-owned. |
| Tax | Effective-dated configurable tax policy inputs, proposal calculation, policy activation, audit evidence. | Implemented control layer | Jurisdiction-pack mappings, return evidence, reconciliation, filing adapter sandbox. | No legal determination, payment, or filing without reviewed local pack and explicit authorization. |
| Budgeting | Flat envelopes, hierarchical public-budget nodes, commitment/availability helpers, role controls, audit evidence. | Implemented control layer | Transfers, amendments, delegated authority, appropriation reports. | Legal classification and treasury/appropriation rules are pack-specific. |
| Sales and receivables | Venture-scoped master records and generic sales operational records with safe lifecycle transition. | Shared-core ready | Quotes, sales orders, shipment/invoice, receivables, credit control, collections. | Customer tax and e-invoice rules require a reviewed pack/adapter. |
| Procurement and payables | Vendor master, procurement records, budget context, workflow primitives. | Shared-core ready | Requisition, sourcing, PO, receipt, three-way match, payable approval. | Supplier onboarding, tender rules, and payment integration are controlled separately. |
| Inventory and supply | Item-style master/record support and inventory domain classification. | Shared-core ready | Stock ledger, reservation, receipt/issue, valuation, replenishment, traceability. | Warehouse, costing, customs, and regulated product rules are configuration or pack work. |
| People and payroll | Worker categories, compensation inputs, calendars, payroll runs, separate reviewer approval transitions, country-pack guard. | Implemented control layer | Employee profile, attendance import, payslip rendering, payroll reconciliation, ESS. | Statutory calculations/remittance require locally reviewed active payroll pack. |
| Projects and delivery | Project/task record types, workflow and audit primitives. | Shared-core ready | Project structure, milestones, capacity, time/expense, cost-to-complete. | Billing and labor rules follow the relevant financial and payroll controls. |
| Assets and maintenance | Asset/maintenance record types, task and workflow primitives. | Shared-core ready | Asset register, depreciation policy, work orders, preventive maintenance, parts links. | Depreciation and safety obligations require venture policy and jurisdiction review. |
| Service | Service-request record type, approvals, audit evidence. | Shared-core ready | SLA timers, case queues, entitlement, dispatch, knowledge links. | SLA and customer/privacy policy are venture-owned. |
| CRM | Opportunity/customer master/record types and audit path. | Shared-core ready | Pipeline stages, forecast, account plans, activities, consent controls. | Marketing consent and retention need applicable privacy governance. |
| Analytics | Portfolio and operational dashboards, audit feed, financial/budget counts. | Implemented control layer | Domain-specific measures, exports, semantic model, governed BI contract. | KPI definitions and reporting access must follow venture RBAC. |
| Supply chain and manufacturing | Catalog boundaries and generic workflow/record core. | Roadmap | BOM, routing, MRP, quality, supplier collaboration, demand/supply plans. | Requires explicit product, quality, costing, and plant-control design. |
| Integrations | Sandbox registry, health simulation, contract version, job evidence, direct and approval-gated simulation. | Implemented sandbox layer | Provider adapters, schema mapping, retry/rollback, secrets, monitoring. | No live connection, credential, payment, or filing is enabled. |
| IoT-adjacent telemetry | Architecture boundary and event/record seams. | Roadmap | Device registry, telemetry ingestion, retention, alerting, asset linkage. | Requires data-volume, security, and device-identity design. |

## Recommended sequencing

The next engineering increments should prioritize transaction integrity over visual breadth: journal balancing and close; procurement receipt-to-invoice controls; stock-movement invariants; payroll run rehearsal with a reviewed pack; then provider-specific sandbox adapters. This sequence reuses the shared core while keeping regulatory and money-movement surfaces explicitly gated.
