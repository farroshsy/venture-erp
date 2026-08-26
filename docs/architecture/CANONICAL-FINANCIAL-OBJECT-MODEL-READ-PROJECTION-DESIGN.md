# Canonical Financial Object Model Read Projection Design

**Status:** Implemented as a bounded tenant-scoped read projection. It is an internal vocabulary and discovery surface, **not** an external-standard conformance claim, a replacement ledger, or a new financial system of record.

## Purpose

The Canonical Financial Object Model (CFOM) reduces vocabulary fragmentation across the existing finance-control and Costing Engine evidence stores. It projects selected already-retained objects into stable canonical identifiers while preserving each source table, primary key, state, effective date, currency, and traceability reference. The projection reads source records only; it neither migrates nor rewrites them.

| Canonical object | Current source projection | Traceability retained |
| --- | --- | --- |
| `LedgerAccount` | Tenant-scoped account master | Source master identifier and account domain |
| `AccountingEvent` | Immutable accounting event | Event key, source operational record/movement, source snapshot, dimensions, and evidence snapshot |
| `FinancialDimension` / `FinancialDimensionValue` | Finance-owned dimension catalog | Required-for-proposal posture, definition linkage, and retained attributes |
| `PolicyRevision` | Effective-dated posting-rule and costing-policy revisions | Revision, status, effective range, declared method/event type, source requirements, and line configuration |
| `CostLayer` | Immutable Costing Engine receipt layer | Source movement, costing-policy revision, source hash, retained quantity/value, currency, and attribution snapshot |
| `CalculationEvidence` | Immutable accounting and costing calculation records | Kind, policy/event/layer linkages, input/output/predecessor/record hashes, and retained status |

## Boundary contract

The projection is available only through a tenant-scoped finance-authorized read procedure. Each object retains its source entity and identifier so a reviewer can distinguish the canonical vocabulary from the actual system of record.

| Included in this increment | Explicitly excluded |
| --- | --- |
| Read-only account, event, dimension, policy, cost-layer, and calculation-evidence discovery | Resource, obligation, position, journal entry, external transaction, tax, payroll, formal-statement, or payment objects |
| Source traceability and bounded object counts | Source-table migration, cross-tenant aggregation, data synchronization, external-standard claim, or integration |
| Finance Reporting workspace discovery panel | Mutation, correction, posting, GL/balance/statement update, COGS, valuation recalculation, external effect |

## Relationship posture

The projection provides stable `CanonicalType:SourceId` identifiers and existing foreign-key-style references inside a source object's traceability payload. It does not introduce a generic polymorphic table or abstract a new persistence layer over financial evidence. Future use must be separately authorized and must continue to preserve tenant isolation, immutable evidence, effective-dated policy semantics, and source-level auditability.

> **Fail-closed rule:** If a future object lacks a governed immutable source, policy, tenant boundary, or traceability contract, it is not added to this projection merely to make the vocabulary appear complete.

## Non-effects

The projection has `readOnlyProjection`, `noSourceRewrite`, `noJournalCreated`, `noAutomaticPosting`, `noBalanceMutation`, `noFinancialStatementMutation`, `noTaxCalculation`, `noPayrollCalculation`, `noPaymentExecution`, `noFiling`, `noIntegrationTriggered`, and `noExternalEffect` boundaries. It does not authorize any currently deferred finance, payroll, tax, payment, filing, integration, manufacturing, asset, project, service, or investment behavior.
