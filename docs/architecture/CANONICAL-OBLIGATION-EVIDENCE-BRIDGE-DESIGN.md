# Canonical Obligation Evidence Bridge Design

## Purpose and scope

The **Canonical Obligation Evidence Bridge (COEB)** is a tenant-scoped, response-time, read-only projection of retained evidence for things a venture owes, is owed, or has explicitly committed to supply or receive. It complements the Canonical Resource Evidence Bridge (CREB) without creating an accounts-payable, accounts-receivable, commitment, treasury, or payment system of record.

The initial contract projects a canonical obligation for every same-tenant retained payable invoice, receivable invoice, purchase order, and sales order. Invoice identifiers use `Obligation:Invoice:{id}`. Commitment identifiers use `Obligation:PurchaseOrder:{id}` and `Obligation:SalesOrder:{id}`. There is no heuristic merge of source records: a purchase/sales commitment and an invoice may both be visible when retained evidence does not contain a concrete authorized relationship.

> **Projection boundary.** A COEB response is generated from currently retained rows. Its timestamp identifies when that read-only response was assembled; it is not a persisted reconciliation run, close, approval, accounting position, payment instruction, or external event.

| Included retained evidence | COEB treatment | Explicitly excluded |
| --- | --- | --- |
| Payable and receivable invoices; purchase and sales orders. | Preserves canonical identity, source-document references, counterparty, original amount, currency, retained due date, and source approval status. | Creating, modifying, approving, or correcting an invoice, order, commitment, or counterparty. |
| Internal payment records and invoice-settlement/aging views. | Reports retained payment evidence, settled amount, open amount, and due-date context. | Bank payment, collection, settlement execution, cash movement, credit decision, or external message. |
| Payable three-way-match record, approved purchase order, and linked receipt movements. | Shows the exact retained match result, reason codes, order link, receipt count, and receipt movements. | Re-evaluating or overriding a match, treating a match as payment approval, or adjusting a receipt. |
| Declared scalar source facts and active finance-dimension values. | Matches a finance-dimension value only when an explicit source-fact code equals a retained dimension code. | Inferring a dimension, interpreting a label as a posting instruction, or assigning statutory meaning. |
| Immutable accounting events and calculation evidence. | Resolves same-tenant evidence only through exact source operational-record/event identifiers, preserving IDs, status, and hashes. | Creating events/evidence, journal proposals, journals, posting, GL mutation, formal statements, valuation, or COGS. |

## Retained source model

COEB queries the source tables in the active tenant only. The bridge follows a document relationship only when a stored ID provides that relationship. In particular, three-way-match links come from the invoice's retained `threeWayMatch.purchaseOrderRecordId`; explicit order links can be represented by `purchaseOrderRecordId` or `salesOrderRecordId` in retained invoice data. A date, counterparty, amount, title, currency, description, or other resemblance never establishes a linkage.

| Evidence category | Retained source | Projection rule |
| --- | --- | --- |
| Obligation/commitment document | `erp_operational_records` | Uses invoices and purchase/sales orders in the active tenant only. |
| Counterparty | `erp_master_records` | Resolves only the document's retained `counterpartyMasterId` in the active tenant. |
| Settlement and aging | Existing `listInvoiceSettlements` and retained invoice fields | Reuses existing settled/open-balance semantics and returns retained currency/due-date data without cross-currency aggregation. |
| Internal payment evidence | `erp_operational_records` payment-record rows | Includes records only when their retained `data.invoiceRecordId` exactly equals the invoice ID. Only posted/fulfilled/closed records contribute to the separately disclosed posted internal payment evidence amount. |
| Three-way match/receipt | Invoice data and `erp_inventory_movements` | Uses the invoice's retained match state and receipt movements whose `operationalRecordId` equals the matched purchase-order ID. |
| Dimension evidence | `erp_finance_dimension_definitions`, `erp_finance_dimension_values`, declared document/movement facts | Returns a match only for an exact code equality against a declared dimension-like fact. |
| Immutable accounting evidence | `erp_accounting_events`, `erp_accounting_calculation_evidence` | Resolves accounting events by exact linked operational-document ID, then calculations by exact event ID. |

## Reconciliation semantics

COEB does not compute a financial position or payment instruction. For invoices, it compares the existing retained settlement-view amount with the sum of same-tenant **posted** internal payment-evidence records and verifies that the retained settled amount does not exceed the invoice total. For a payable, it additionally requires retained three-way-match evidence, a resolvable retained purchase order, and at least one retained receipt movement for a `reconciled` state. A recorded three-way mismatch is an exception, never a correction candidate.

| Reconciliation status | Meaning |
| --- | --- |
| `reconciled` | The documented required retained evidence exists and the observed checks agree. This is an evidence-consistency result, not payment, accounting, credit, legal, or compliance approval. |
| `exception` | Retained settlement/payment evidence differs, retained settlement exceeds original amount, or retained match evidence records one or more mismatch reason codes. No record is changed. |
| `insufficient_evidence` | A required payable match, matched purchase order, or receipt relationship is absent/unresolvable. Missing records and default values are never treated as proof. |

Purchase and sales commitments require their retained counterparty, due date, and an explicit linked invoice; purchase commitments also require retained receipt evidence. When those prerequisites are absent, COEB reports `insufficient_evidence`. COEB deliberately does **not** calculate a commitment's open amount, so that field is `null` rather than an invented exposure calculation.

## Evidence completeness and traceability

Evidence is `complete` only when no observed core or supporting gap remains. It is `incomplete` when a core document, counterparty, due-date, explicit invoice relationship, applicable receipt, or payable-match prerequisite is missing; it is `partial` when core evidence exists but supporting immutable/dimension evidence is absent. The traceability score is a transparent coverage indicator, not a maturity, accounting, compliance, credit, or payment determination.

For invoices, COEB evaluates ten categories: counterparty, due date, settlement view, applicable match, applicable purchase order, applicable receipt, payment/open-status evidence, immutable accounting event, immutable accounting calculation evidence, and exact declared finance-dimension match. For commitments it evaluates seven categories: counterparty, due date, explicit linked invoice, applicable receipt/fulfillment movement, immutable accounting event, immutable accounting calculation evidence, and exact declared finance-dimension match.

## Explainability and readiness

The Cash Control review surface exposes each obligation's canonical identifier, counterparty, original/settled/open retained amounts, currency, due date, source documents, retained match state, internal payment-evidence count, immutable evidence counts, explicit finance-dimension matches, reconciliation rationale, exceptions, gaps, and response timestamp. It offers no correction button, invoice-action button, payment-execution button, posting control, or external action.

All future treasury, cash-forecasting, and accounting readiness flags remain `false`. A reconciled read projection does not authorize treasury, cash forecasting, a payment, settlement, journal, posting, financial statement, valuation, COGS, tax, payroll, statutory filing, integration, or external effect. Any gap or exception remains visible as a blocked readiness state.

## Reuse seam

COEB may later supply read-only semantic inputs to separately governed treasury, liquidity planning, credit/vendor/customer exposure, working-capital analysis, financial-risk controls, and investment-settlement obligations. Each such capability needs its own canonical identity, retained source contract, currency and FX policy, effective-dated governance, invariants, authorization model, tests, and explicit financial/external-effect decision. This initial bridge creates none of those capabilities.
