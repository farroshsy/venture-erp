# Canonical Obligation Evidence Bridge Roadmap

## Status and decision

The **Canonical Obligation Evidence Bridge (COEB)** is an **authorized future roadmap increment**. This document records the intended read-only evidence scope for the complement of the Canonical Resource Evidence Bridge (CREB): things the enterprise is retained to owe, be owed, or be committed to provide/receive.

> **Not implemented.** COEB currently has no database schema, migration, service, router, interface, scheduled reconciliation, automatic correction, payment execution, invoice mutation, journal, general-ledger effect, valuation, tax/payroll calculation, filing, integration, or external transmission. This roadmap does not authorize any of those actions.

COEB must be implemented only as a tenant-scoped, read-only projection over already-retained evidence. It must not invent a new payable, receivable, commitment, counterparty, currency, amount, due date, dimension, approval, match, settlement, or relationship.

## Intended initial scope

The first increment is expected to reconcile the retained evidence for accounts payable, accounts receivable, purchase-order commitments, sales-order commitments, supplier invoices, customer invoices, internal payment records, three-way-match outcomes, aging evidence, finance dimensions, and relevant immutable accounting/calculation evidence. The implementation must use only concrete, same-tenant relationships and represent a missing link as a gap rather than a default or inference.

| Candidate obligation family | Candidate retained evidence | Mandatory initial interpretation |
| --- | --- | --- |
| Payable | Approved purchase order, receipt movement/document, supplier invoice, three-way-match evidence, internal payment record, aging evidence. | Explain why the liability/commitment is represented, which source supports it, and whether matching/settlement evidence is absent, partial, or conflicting. |
| Receivable | Sales order, fulfillment movement/document, customer invoice, internal payment record, aging evidence. | Explain the retained customer claim and source state without recognizing revenue, creating a receivable, or initiating collection. |
| Procurement commitment | Purchase order plus approval and receipt status. | Surface retained commitment context only; do not calculate a liability or execute procurement. |
| Sales commitment | Sales order plus approval, reservation, and fulfillment status. | Surface retained commitment context only; do not recognize revenue, create an invoice, ship goods, or create a financial position. |

## Target projection contract

COEB should expose a canonical obligation view with the fields below only when they are explicitly supported by retained same-tenant evidence. The future implementation must decide and document stable canonical-identifier rules before it creates a projection.

| Field | Required treatment |
| --- | --- |
| Canonical obligation ID and tenant | Use a stable, source-traceable identifier; do not merge multiple source records by heuristic. |
| Counterparty and obligation type | Resolve from the retained source document or invoice only; retain a gap when unavailable. |
| Original amount, open amount, currency, and due date | Surface retained values and provenance; do not aggregate or translate across currencies, calculate settlement, or infer a due date. |
| Supporting documents and approval state | Retain document IDs, record numbers/types/statuses, and exact approval evidence where stored. |
| Matching state | Project retained three-way-match/other matching outcome without recalculation or override. |
| Evidence completeness and reconciliation state | Use `reconciled`, `exception`, and `insufficient_evidence` with a plain-language rationale. |
| Traceability score and gaps | Publish a transparent coverage method and all missing/conﬂicting relationships. |

## Intended reconciliation model

COEB will verify consistency between retained sources only. A payable evidence path may include the following trace; each arrow must be proven from an explicit same-tenant key, not guessed by date, counterparty, description, or amount similarity.

```text
Approved purchase order
        │ explicit retained source link
Goods receipt evidence
        │ explicit retained source link
Supplier invoice
        │ retained three-way-match evidence
Internal payable evidence
        │ retained internal payment evidence (if any)
Canonical Obligation Evidence Bridge
```

| Status | Future meaning |
| --- | --- |
| `reconciled` | Required retained evidence exists for the obligation family and the documented checks agree. This is evidence consistency, not payment, accounting, legal, or compliance approval. |
| `exception` | Required retained sources exist but reveal a documented inconsistency. The response is a reviewable exception only—never an automatic correction. |
| `insufficient_evidence` | One or more required retained sources or explicit relationships are absent. Default zeroes, missing payment records, or unlinked documents cannot be treated as proof. |

The future design must specify per-family required sources, numerical comparison rules, currency boundary, settlement semantics, rounding, partial-settlement behavior, and idempotent read-run logic before implementing this projection. It must preserve the existing invoice-aging rule that prohibits cross-currency amount aggregation without approved FX/reporting evidence.

## Explainability and future reuse

Reviewers should be able to answer why an obligation is present, which document and receipt support it, which invoice/match/payment evidence applies, why it is unmatched or blocked, and exactly what evidence is missing. The bridge should retain source identifiers, hashes/statuses where immutable evidence exists, response-time projection timestamp, and a declared traceability-score method.

COEB may later become a read-only semantic input to separately governed treasury, cash forecasting, liquidity planning, credit/vendor/customer exposure, working-capital, financial-risk, and investment-settlement obligations. It does **not** implement or authorize those capabilities today.

## Non-negotiable boundaries

| COEB must not | Rationale |
| --- | --- |
| Execute, transmit, schedule, or simulate a payment. | Internal payment records are evidence only and do not authorize settlement. |
| Create, modify, approve, or correct an invoice, purchase order, sales order, receipt, match, or aging record. | The bridge is a projection, not an operational or correction system. |
| Create/post a journal, mutate the GL, calculate valuation/COGS, or produce a formal statement. | Financial effects require separate finance-owned authorization and control design. |
| Calculate tax or payroll, change payroll pack status, file a return, or make a compliance claim. | Payroll/tax governance remains independently blocked pending qualified review. |
| Call an external provider, bank, government system, or integration adapter. | The roadmap has no external-effect path. |

## Preconditions for an implementation proposal

Before a code increment begins, the implementation proposal must define the canonical identity and non-heuristic linkage rules; map each retained source/table and tenant guard; list required/optional evidence per obligation family; document numeric/currency/due-date/partial-settlement semantics; define transparent traceability scoring and gaps; preserve immutable evidence links; add tenant-isolation/no-effect tests; and include responsive read-only UI validation. Any schema change must follow the project’s additive Drizzle/TiDB-safe migration and physical-verification process.
