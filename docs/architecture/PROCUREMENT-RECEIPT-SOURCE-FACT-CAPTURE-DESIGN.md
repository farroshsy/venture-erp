# Procurement Receipt Source-Fact Capture Design

> **Scope: non-payroll, non-tax, non-valuation source facts for the existing final internal procurement-receipt event.** The capture layer records attributable operational facts before immutable event emission. It does not calculate COGS, inventory valuation, tax, payroll, payments, filings, journals, balances, integrations, or external effects.

## Objective

Accounting calculation evidence is only as explainable as its immutable source facts. The procurement-receipt source-fact increment therefore captures controlled receipt context at the same time as the internal receipt operation and propagates that retained context into the emitted accounting event.

| Fact | Purpose | Validation posture |
|---|---|---|
| Internal receipt reference | Trace receipt operation to a human-attributable internal reference | Required, unique only within the receipt record context |
| Warehouse code | Retained logistics/source context | Optional controlled text; never inferred |
| Cost-center code | Retained finance dimension candidate | Optional controlled text; not a financial classification by itself |
| Project code | Retained project-context candidate | Optional controlled text; not a profitability calculation |
| Supplier delivery reference | Retained source-document reference | Optional; no supplier portal lookup or transmission |
| Evidence reference | Human-held supporting-evidence reference | Optional; no file upload or external fetch in this increment |
| Capture actor/time | Attribution | Retained from internal operation/audit context |

## Immutable propagation

The source facts are retained on the receipt record and copied exactly into the `sourceSnapshot`, `dimensionsSnapshot`, and evidence references when the final receipt emits an accounting event. After event emission, reports, proposals, simulations, and calculation evidence consume the event snapshot; they never replace it with a live receipt source value.

The following rules apply:

1. A blank optional source fact stays absent. The system must not fill it from master data, a live finance-dimension catalog, a prior receipt, or a heuristic.
2. A required future dimension without a retained source value must refuse the proposal under the existing dimension control.
3. Source facts do not create an account, journal, proposal, value, valuation, or posting by themselves.
4. Source facts never cause a tax, payroll, payment, filing, integration, or external effect.

## Deferred source domains

Sales, projects, fixed assets, and investment transactions require separate source-fact contracts and are intentionally out of this increment. Their future events must follow the same attributable, immutable, no-inference design, but no record, calculation, or workflow for those domains is enabled here.
