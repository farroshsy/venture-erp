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

> A posted internal payment record is **evidence of a controlled accounting event**, not proof that a bank, processor, or government authority accepted or executed a transaction.

## Deferred integration boundary

Real collection, disbursement, reconciliation feeds, invoice clearance, and bank-status polling require a separately configured sandbox adapter, credentials, provider contract, legal review where applicable, and explicit user confirmation before any external action. The existing sandbox integration layer remains the only permitted path for provider simulations.
