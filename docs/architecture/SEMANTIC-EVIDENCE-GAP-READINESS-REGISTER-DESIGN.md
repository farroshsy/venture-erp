# Semantic Evidence-Gap and Readiness Register Design

**Status:** Implemented as a tenant-scoped, read-only governance projection. The register describes evidence and blockers; it does **not** activate an object, change source data, authorize a financial effect, or claim production/compliance readiness.

## Purpose

The register makes Canonical Financial Object Model (CFOM) maturity explicit before additional finance behavior is considered. Each registered object is self-describing in terms of retained evidence, effective policy posture, invariant coverage, traceability, audit observations, missing dependencies, and durable activation blockers. It favors an explicit `missing`, `blocked`, or `not implemented` state over an inferred relationship.

| Readiness dimension | Current meaning |
| --- | --- |
| Data completeness | Whether a tenant-scoped governed source object/evidence set is currently retained. |
| Evidence integrity | Whether the available source has the applicable immutable/hash/invariant posture. It does not validate evidence that does not exist. |
| Governance approval | Whether an effective finance-owned policy revision is observable; object-specific activation can still require additional approval. |
| Deterministic calculation | Whether completed deterministic calculation evidence is retained for the object’s current bounded use. |
| Accounting and reporting readiness | A descriptive constrained status. Neither value means a journal, GL, financial statement, or external report is available. |
| Posting readiness | Always `disabled` in this register. |
| External integration readiness | Always `not implemented` in this register. |
| Compliance readiness | Always `external review pending` unless a separately governed qualified-review path exists. |

## Registered object coverage

| Object | Current source posture | Primary blocker disclosed |
| --- | --- | --- |
| Economic Event | Immutable accounting-event evidence where retained | Event evidence does not authorize journal creation/posting. |
| Resource | Inventory balance/movement observations | Canonical resource identity and quantity-unit source contract are not modeled. |
| Asset | Asset source records where retained | Capitalization, depreciation, and valuation remain disabled. |
| Liability / Position | Future semantic objects | Canonical source, recognition/valuation policy, and invariant contracts are absent. |
| Cost Layer / Valuation Layer / Allocation | Costing Engine immutable layers and evidence previews/allocations | No layer consumption, valuation posting, COGS, or mutable value change. |
| Financial Dimension | Finance-owned definitions and values | No statutory meaning or inferred source value. |
| Accounting Evidence / Calculation Evidence | Immutable accounting and Costing Engine calculation records | Evidence alone does not create a journal or balance. |
| Policy Revision | Effective-dated posting/costing policies | Approval does not activate posting or external behavior. |
| Journal Proposal / Future Journal | Existing proposal evidence and an explicit future seam | Proposal-to-journal conversion/posting remains separately governed and disabled here. |
| Investment Position / Manufacturing Work Order | Future semantic objects | No authorized domain implementation or canonical evidence source. |

## Evidence graph

The graph currently renders only explicit edges:

```text
Economic Event ──present/missing──> Accounting Evidence
Accounting Evidence ──present/missing──> Calculation Evidence
Calculation Evidence ──present/missing──> Valuation Layer
Valuation Layer ──missing──> Journal Proposal
Journal Proposal ──blocked──> Future Journal
```

The `Valuation Layer → Journal Proposal` link is deliberately **missing** because valuation review does not calculate COGS or emit a posting candidate. The `Journal Proposal → Future Journal` link is deliberately **blocked** because proposal-to-journal conversion and posting require separately authorized maker/checker and financial-control implementation.

## No-effect contract

The register returns `readOnlyRegister`, `noStateChange`, `noValuationPosting`, `noJournalCreated`, `noAutomaticPosting`, `noLedgerMutation`, `noBalanceMutation`, `noTaxCalculation`, `noPayrollCalculation`, `noPaymentExecution`, `noFiling`, `noIntegrationTriggered`, and `noExternalEffect` flags. It does not write audit evidence merely for being viewed, as that would violate its no-state-change posture.

> **Fail-closed rule:** A status of `partial`, `missing`, `warning`, `blocked`, `disabled`, or `not implemented` must be read as a disclosed prerequisite gap—not an invitation to infer the missing evidence or bypass governance.

## Follow-on dependency

The next human-reviewed correction/reprocessing control may use this register as a prerequisite disclosure source only after a separate authorization defines the correction evidence, authority, segregation, idempotency, successor-evidence, and refusal contracts. The register itself cannot approve or initiate correction/reprocessing.
