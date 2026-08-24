# Operational ERP Target and Delivery Roadmap

**Status:** Accepted implementation target  
**Scope:** Multi-venture transactional ERP, not a static module showcase

**Current capability inventory:** See [Operational Feature Coverage Matrix](./OPERATIONAL-FEATURE-COVERAGE-MATRIX.md) for the implemented, shared-core, prerequisite-bound, and roadmap classification across each ERP domain.

## Product position

Venture ERP will become a **configurable operational core** rather than claim that every country-specific regulatory, banking, biometric, IoT, or government connector already exists. The product owns business records, state transitions, formula inputs, approvals, audit events, and integration contracts. It does not hardcode legal tax rates, submit statutory filings, execute bank payments, or fabricate device telemetry when no configured adapter is available.

> A module is considered functional only when it has venture-scoped master data, a transaction record, explicit lifecycle transitions, authorization, audit evidence, and an operational view. A page of metrics without those records is not ERP functionality.

## Functional coverage target

| Domain | Release-1 functional core | Automation and controls | Integration or regulatory boundary |
|---|---|---|---|
| Finance | Chart of accounts, accounting periods, journals, journal lines, invoice/payment status records, budget envelopes. | Period controls, budget checks, approval-required posting, audit ledger. | Banking, statutory ledgers, and filing require adapters and jurisdiction configuration. |
| Tax | Effective-dated tax policies, rates, inclusive/exclusive methods, taxable amount calculation, tax line snapshots. | Policy selection by transaction date and venture; approval when a policy changes. | Rates, returns, and filings must be configured and reviewed by an appropriate tax professional. |
| Sales and CRM | Customers, opportunities, sales orders, invoice records, payment-status tracking. | Quote-to-order workflow, credit/approval exceptions. | E-commerce, POS, payment gateways, and tax clearance require connectors. |
| Procurement | Suppliers, requisitions, purchase orders, receipt state, payables handoff. | Requisition-to-order approvals, budget reservation and exception queue. | Supplier portals, e-invoicing, and bank disbursement require adapters. |
| Inventory and supply | Items, stock movements, reservations, warehouse/location attributes, reorder policy records. | Reservation lifecycle, low-stock exception workflow, receipt/issue audit trail. | Barcode/RFID/WMS/IoT devices are connector-backed rather than simulated. |
| People and payroll | Employees, compensation components, attendance inputs, payroll runs, immutable payslip snapshots. | Formula-driven gross-to-net proposal, review/approval, journal proposal. | Statutory withholding, benefits, payment files, and employee identity verification need jurisdiction packs or integrations. |
| Projects | Projects, tasks, milestones, work state, cost references. | Stage approvals, budget alerts, project-health reporting. | Time tracking and customer billing integrations remain adapter-backed. |
| Assets and service | Assets, maintenance plans, service requests, work state, cost references. | Maintenance due alerts, service approval and completion trail. | Field devices, telemetry, and external ticketing need connectors. |
| Workflow/BPMN | Versioned definitions, nodes, transitions, assignees, process instances, task/approval events. | Event-driven task creation, approval policies, SLA timers when a scheduler is enabled. | Full BPMN 2.0 interchange and asynchronous workers are later platform integrations. |
| Analytics | Operational KPI projection over actual venture records and audit events. | Drill-through to source records, not synthetic benchmark data. | Data lake, BI semantic layer, and streaming analytics are future integrations. |

## Implementation phases

| Phase | Outcome | Non-negotiable acceptance evidence |
|---|---|---|
| **A — Shared operational core** | Tenant-scoped master data, tax policies, periods, budgets, audit events, workflow records, and shared approval policy. | Additive schema; every write scoped to a venture; tests prove cross-venture rejection. |
| **B — Transactional loop** | Customers, suppliers, items, employees, accounts, invoices, orders, purchase orders, stock moves, payroll runs, projects, assets, and service cases. | Each module supports create, state transition, and operational list; transitions produce audit evidence. |
| **C — Automation and policy** | Workflow builder, event/task queue, conditional approvals, budget/tax checks, and exception management. | An administrator can configure and run an approval flow without changing code. |
| **D — Integration hardening** | Connector contracts, idempotency, reconciliation, error queue, and observability. | No adapter is shown as “connected” without recorded synchronization evidence. |
| **E — Jurisdiction packs** | Country-specific tax/payroll/public-sector rules, reporting formats, and filing/banking adapters. | Policy provenance, effective dates, specialist review, and release compatibility are recorded. |

## BPMN-style execution model

The release uses a practical subset of BPMN concepts: start event, task, approval, gateway, end event, transition, assignee policy, SLA, and exception. The definition is versioned per venture; each execution instance retains the version used at start. This enables approval automation for purchases, invoices, payroll, stock adjustment, budget exception, service work, and access change without embedding each process in frontend code.

## Tax, payroll, and public-sector boundary

> I’m an AI, not a tax professional — verify anything consequential with a CPA or tax professional before filing.

The system will calculate from **user-configured, effective-dated policy inputs** and preserve the input/output snapshot in the transaction record. It will not imply that an unconfigured tax engine is legally compliant, nor will it file returns or remit funds. Payroll support follows the same design: it calculates configurable compensation components and deductions, while statutory packs, banking files, and filing integrations require jurisdiction-specific rollout.

## References

[1] [Total ERP — 22 Software Payroll Terbaik Indonesia 2026](https://www.total-erp.com/blog/software-payroll-terbaik/)  
[2] [NIST — Role Based Access Control project](https://csrc.nist.gov/projects/role-based-access-control)
