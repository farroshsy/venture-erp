# Disabled Asset-Accounting Event Seam

**Status:** Design only. No asset accounting event, capitalization, depreciation, valuation, calculation, journal, posting, or financial-statement effect is implemented.

## Intent

The asset register now retains direct acquisition context as tenant-scoped source facts. That is operational attribution, not a recognition conclusion. An asset draft or in-service transition cannot by itself establish ownership, availability for use, capitalization eligibility, cost basis, useful life, residual value, impairment, componentization, depreciation method, or accounting period treatment.

This design defines a fail-closed seam for a future asset source module to expose a candidate immutable event to the controlled accounting architecture without enabling any financial outcome.

| Existing retained context | Future prerequisite | Not established today |
| --- | --- | --- |
| Asset master, tag, name, lifecycle status | Tenant-scoped immutable source key and controlled source state | Ownership, title, or availability-for-use conclusion |
| Optional acquisition, supplier, warehouse, cost-center, project, evidence references | Source-fact semantic and evidence-authenticity policy | Capitalization basis or dimension allocation |
| Jurisdiction-neutral internal input | Finance-owned valuation/depreciation policy revision | Cost, useful life, residual value, depreciation, impairment |
| Existing immutable accounting architecture | New explicit asset event type and approved effective-dated rule | Journal proposal, journal conversion, posting, balance mutation |

## Candidate event discipline

A future event must have a tenant-scoped, idempotent source key based on one immutable asset lifecycle fact. It must retain immutable source, dimension, and evidence snapshots without rereading mutable asset attributes. Replaying the same source key must return the same event and cannot duplicate events, calculation records, proposals, or journals.

Asset-accounting event types must remain separated by business assertion. Potential **asset acquisition candidate**, **availability-for-use candidate**, **retirement candidate**, **impairment-review candidate**, and **maintenance evidence candidate** are not interchangeable. No type may be emitted merely because an asset row exists.

## Mandatory refusal gates

The future service must refuse emission or evaluation whenever a required element is missing, ambiguous, cross-tenant, inactive, expired, conflicting, or lacks controlled review.

| Gate | Fail-closed reason |
| --- | --- |
| Source identity and lifecycle | Asset/master/source fact is absent, cross-tenant, not immutable, or not in the separately approved source state. |
| Acquisition/ownership evidence | Required contract, acceptance, ownership, custody, or availability-for-use evidence is unavailable. |
| Valuation and recognition policy | No finance-owned effective-dated policy establishes recognition threshold, basis, componentization, or subsequent-measurement treatment. |
| Depreciation policy | No governed useful-life, method, residual-value, convention, effective-date, and review policy exists. |
| Currency and period evidence | Cost currency, translation evidence, accounting period, close, and amendment policy are unavailable. |
| Accounting/evidence control | No approved asset-specific event rule, classification/dimension mapping, invariants, or immutable calculation-evidence policy exists. |

## Boundary

This design does not create, calculate, simulate, post, or report capitalization, depreciation, amortization, impairment, revaluation, disposal gain/loss, COGS, tax, payroll, payment, filing, integration, or external effect. It does not assert IFRS, GAAP, Indonesian, Singaporean, or other jurisdictional accounting compliance. A separately authorized implementation and qualified professional review would be required before activating any asset accounting behavior.
