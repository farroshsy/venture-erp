# Invoice-to-Payment Control Design

**Status:** Implementation design  
**Scope:** Venture-scoped receivable, payable, and payment-record lifecycle controls.  
**Non-scope:** Bank execution, card processing, settlement, treasury movement, tax filing, and external payment-provider connectivity.

## Control objective

Venture ERP treats invoices and payment records as **internal accounting and operational evidence**, not as authority to move funds. A receivable invoice represents an approved claim against a customer; a payable invoice represents an approved obligation to a supplier; a payment record represents a reconciled or proposed internal status event. Each record remains tenant-scoped, auditable, and explicitly stateful.

| Record type | Allowed origin | Required linkage | Lifecycle | Prohibited interpretation |
|---|---|---|---|---|
| `receivable_invoice` | Finance or sales operator | Customer master when supplied; open accounting period when supplied | draft → approval → posted → fulfilled/closed | Not a card charge, collection instruction, or tax filing. |
| `payable_invoice` | Finance or procurement operator | Supplier master when supplied; purchase-order or receipt reference when supplied | draft → approval → posted → fulfilled/closed | Not a supplier payment instruction or bank transfer. |
| `payment_record` | Finance lead or approved reconciliation process | Existing receivable/payable invoice in the same venture | draft → approval → posted → fulfilled/closed | Not a payment rail request, ACH/SWIFT file, or settlement confirmation. |

## Invariants

The server validates that invoice counterparties belong to the active venture and match their expected master domain. Payment records must reference an existing invoice in the same venture, must not exceed its internal open balance, and cannot be created against an unpaid invoice outside the defined invoice types. The service records an immutable audit event and adjusts an internal settlement accumulator only after the payment record passes its controlled lifecycle.

For a payable invoice, approval now additionally requires a successful **internal three-way match**. A finance-authorized reviewer compares the venture-scoped payable invoice to an approved, posted, or fulfilled purchase order and its recorded inventory receipt evidence. The control verifies supplier identity, transaction currency, invoice total against the purchase-order total, and the presence of at least one positive receipt quantity. It persists either a `matched` or `mismatch` evidence object on the payable invoice and writes `payable_invoice.three_way_match_evaluated` audit evidence. A mismatch is durable evidence, not a bypass: the generic approval transition refuses a payable invoice until the stored match status is `matched`.

The Cash Control workspace also exposes a dedicated `approveMatchedPayable` action. It is limited to portfolio administrators, venture leads, and finance leads; it accepts only a `pending_approval` payable invoice whose retained match result is `matched`, then applies the ordinary tenant-scoped `approved` transition. The action therefore does not create a second lifecycle or bypass the underlying guard. Its approval note explicitly records that the result is internal evidence only and carries no payment or external effect.

For payable intake, the workspace requires a supplier invoice reference. The server normalizes that reference for comparison and rejects a second payable invoice in the same venture for the same supplier with the same normalized reference. It persists both the entered value in internal evidence and the normalized value in a dedicated nullable operational-record column. The database enforces the normalized value through `erp_payable_supplier_reference_unique` across `ventureId`, `counterpartyMasterId`, and `supplierInvoiceReferenceNormalized`, protecting the invariant even if concurrent requests pass an application-level precheck. Migration `0016_married_rawhide_kid.sql` backfills legacy JSON-held normalized values before adding that constraint. The constraint deliberately has no cross-venture effect and does not send a supplier message, inspect a supplier portal, execute a payment, or make a tax or compliance determination.

When the platform rejects a duplicate reference through the application path, it emits `payable_invoice.duplicate_supplier_reference_rejected` in the same venture. The audit includes the supplier identity, retained duplicate record identifier when available, attempted-reference presence, an explicit statement that no raw attempted reference was stored, and no-external-effect flags. A database-constraint race is also auditable without storing the attempted raw reference. The audit is internal control evidence; it does not notify a supplier or trigger payment, filing, tax, or external processing.

The invoice register also provides an internal aging view. As of a supplied calendar date, it groups only invoices with a retained positive internal open balance into `not_due`, `1_30`, `31_60`, `61_90`, `over_90`, and `undated` buckets, separately for receivables and payables **and separately for each retained transaction currency**. It never adds distinct currencies together. A cross-currency aging report would require separately governed reporting-currency and approved-FX evidence. This is a read-only exposure view based on retained due-date and settlement evidence; it is not a collection workflow, credit decision, disbursement decision, credit-loss determination, or external action.

> A posted internal payment record is **evidence of a controlled accounting event**, not proof that a bank, processor, or government authority accepted or executed a transaction.

> A matched payable invoice is **approval eligibility evidence only**. It is not a payment instruction, bank-transfer request, supplier communication, tax determination, tax filing, or confirmation that goods or services were accepted outside the retained internal receipt record.

## Deferred integration boundary

Real collection, disbursement, reconciliation feeds, invoice clearance, and bank-status polling require a separately configured sandbox adapter, credentials, provider contract, legal review where applicable, and explicit user confirmation before any external action. The existing sandbox integration layer remains the only permitted path for provider simulations.
