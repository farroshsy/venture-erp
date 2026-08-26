# Sales-Fulfillment Source-Fact Capture

**Status:** Implemented as retained internal fulfillment evidence; no sales accounting engine is enabled.

## Purpose

An internal sales fulfillment consumes reserved inventory and records an inventory `issue`. The fulfillment record previously retained quantity, narrative, item, sales-order link, and resulting inventory balances. This increment allows the operator to attach explicitly observed fulfillment context to **that issue movement only**:

| Optional fact | Intended attribution purpose | Not used for |
| --- | --- | --- |
| Internal fulfillment reference | Internal operational traceability | Shipment execution or legal delivery proof |
| Warehouse code | Explicit operator-entered location context | Inventory valuation or inferred location |
| Cost-center and project codes | Explicit operating context | Allocation, profitability, or accounting classification |
| Customer delivery reference | Retained customer-provided reference | Customer communication or external portal action |
| Evidence reference | Linkable internal evidence identifier | Document transmission or compliance claim |

## Control behavior

Inputs are optional. When supplied, each value is trimmed, must be non-empty, and has a bounded length; blank values are omitted. The server writes the normalized object only to the final inventory `issue` movement. The paired reservation-release movement intentionally receives no copied source facts, preserving the distinction between reserve release and evidence of fulfillment.

The tenant-scoped audit event retains only the list of captured fact keys, together with explicit flags that revenue recognition, COGS/valuation calculation, external shipment/billing, and external effect did not occur.

> Sales source facts are attributable context, not evidence that goods were shipped, revenue was earned, cost was recognized, an invoice was issued, a customer was notified, or a logistics provider was called.

## Non-goals

This increment does not create an accounting event, proposal, calculation evidence, journal, ledger entry, GL balance, revenue recognition result, COGS result, inventory valuation, invoice, payment, collection, tax result, payroll result, filing, integration, or external transmission. Any future sales accounting event must be separately authorized and must use governed immutable source/evidence snapshots without inferring facts from this capture surface.
