# Disabled Sales-Fulfillment Accounting-Event Seam

**Status:** Design only. No sales accounting event, calculation, proposal, journal, posting, or financial statement effect is implemented.

## Intent

Venture ERP now retains explicitly supplied operational context on internal sales-fulfillment inventory issue evidence. That evidence is valuable input for a future controlled accounting workflow, but an inventory issue alone does not establish revenue recognition, transfer of control, billability, collectability, cost recognition, inventory valuation, or a legal/statutory accounting conclusion.

This seam defines how a future source module could expose a **candidate** immutable sales-fulfillment event into the existing accounting-control architecture while failing closed until separately governed policies and canonical evidence exist.

| Area | Retained now | Required before a future event | Explicitly absent |
| --- | --- | --- | --- |
| Operational source | Approved sales order, item, reservation release, inventory issue, narrative | Verified source lifecycle and immutability/idempotency key | Shipping confirmation or legal transfer-of-control conclusion |
| Attributable context | Optional fulfillment, warehouse, cost center, project, customer-delivery, and evidence references | Field semantics, permitted dimension mapping, evidence authenticity policy | Inferred dimensions or assumed delivery status |
| Revenue | None | Finance-owned revenue policy, obligation/transfer evidence, effective-date rules, reviewer approval | Revenue calculation, proposal, journal, posting, receivable mutation |
| Cost/valuation | Quantity issue only | Governed valuation method, cost-layer evidence, cut-off policy, reviewer approval | COGS calculation, inventory valuation, margin or profitability |
| Accounting output | None | Approved event schema, posting rule revisions, independent invariants, calculation evidence | Journal conversion, journal posting, balance mutation |

## Candidate event contract

Any future event would use a new event type rather than overloading the procurement-receipt event. Its immutable source snapshot would retain the order, issue movement, item, quantity, status, accounting date, original source facts, and evidence-reference posture. Its dimensions snapshot would copy only directly supplied permissible values. Its evidence snapshot would state the absence or presence of independently governed delivery/acceptance/valuation evidence.

The source-event key must be idempotent by the issue movement identifier and tenant-scoped. Retrying emission must return the same retained event; it must not duplicate an event, calculation, proposal, or journal.

## Fail-closed prerequisites

The future service must refuse emission or evaluation when any prerequisite is missing, conflicting, cross-tenant, unapproved, expired, ambiguous, or unverified. Refusal evidence must retain the reason category without copying sensitive customer data unnecessarily.

| Prerequisite | Refusal condition |
| --- | --- |
| Tenant and source identity | Sales order, item, or issue movement is absent or belongs to another tenant. |
| Operational state | Order is not in the separately approved state or the issue is not a final attributable internal fulfillment. |
| Source-fact integrity | Supplied facts fail bounds/semantics or required governed dimensions lack direct retained values. |
| Revenue policy | No approved effective-dated finance-owned revenue-recognition policy exists. |
| Delivery/acceptance evidence | Required contract, delivery, customer acceptance, and cut-off evidence is unavailable. |
| Valuation policy | No approved valuation/cost-layer policy and canonical evidence exists. |
| Accounting policy | No single approved effective-dated posting rule and required classification/dimension policy exists. |
| Period/currency controls | Accounting period, currency, translation, or close policy is unavailable. |

## Boundary

This design does not authorize revenue, COGS, margin, valuation, expense, receivable, invoice, payment, tax, payroll, journal, posting, balance, filing, integration, or external effect. It also does not make any assertion about IFRS, GAAP, Indonesian, Singaporean, or other jurisdictional accounting compliance. A qualified accounting professional and separately authorized implementation are required before any future activation.
