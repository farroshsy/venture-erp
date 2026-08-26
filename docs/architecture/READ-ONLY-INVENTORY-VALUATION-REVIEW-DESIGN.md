# Read-Only Inventory Valuation Review Design

**Status:** Implemented evidence-review increment. This design describes immutable calculation evidence and user explainability only. It does not authorize inventory mutation, COGS, capitalization, journal proposals or posting, General Ledger impact, financial-statement updates, tax, payroll, payment, filing, integration, or external effects.

## Purpose

The Costing Engine’s valuation-review capability answers a bounded question: given an approved effective-dated inventory costing policy and immutable eligible receipt-layer evidence, how would a supplied quantity be valued **for review only**? The answer is retained as append-only calculation evidence and does not consume an inventory layer or create a movement.

| Review question | Retained answer |
| --- | --- |
| Which policy applies? | The policy identifier, code, revision, effective date, and declared valuation method are snapshotted in the immutable calculation input. |
| Which layers were eligible? | Each eligible layer’s identifier, source movement, source hash, retained remaining quantity/value, and currency are snapshotted. |
| Why was a layer selected? | FIFO/LIFO selection order or average-method pooling rationale is retained with the output. |
| How was unit cost determined? | The remaining-value numerator, remaining-quantity denominator, unrounded unit cost, and rounded unit cost are retained per line or pooled method. |
| How are remaining balances explained? | Before quantity/value, preview consumption/value, and projected remaining quantity/value are retained without writing them back to the layer. |
| How is rounding explained? | Quantity scale, money scale, unrounded line value, rounded line value, deterministic residual, and aggregate rounded-line total are retained. |

## Calculation evidence contract

Each preview creates or deterministically reuses a tenant-scoped `valuation_preview` evidence record keyed by canonical immutable inputs. The enriched record retains a `valuationRunId`, calculation version, policy selection rationale, source-layer evidence, calculated lines, deterministic rounding evidence, and independently disclosed invariant results.

| Invariant | Current evidence posture |
| --- | --- |
| Inventory quantity conservation | Completed previews verify that consumed preview quantity equals the requested quantity and does not exceed selected-layer availability. |
| Layer integrity | Completed previews require positive retained source-layer quantities, non-negative retained values, and source hashes. |
| Cost conservation | Completed previews reconcile the total to the rounded values of retained calculation lines. |
| Reproducibility | Canonical input hashes include the effective policy and eligible-layer source hashes; repeating identical input returns the same immutable calculation record. |
| Currency consistency | The review records a single output currency only when all eligible layers retain one currency; otherwise the invariant is false and output currency is unavailable. |
| Unit-of-measure compatibility | Receipt quantity units are not yet modeled as a canonical source field. The preview explicitly retains `not_modeled_in_receipt_quantity_evidence`, performs no unit inference/conversion, and future unit-sensitive valuation must be separately governed. |
| Deterministic residual handling | Every calculated line retains its rounding residual and the aggregate retains the difference between rounded-line total and displayed total. |

## Method boundary

FIFO, LIFO, moving average, and weighted average use only the current immutable receipt-layer evidence. Standard cost and specific identification remain declared policy methods but produce immutable **refusal evidence** until a separately governed canonical standard-cost or lot/serial identification source is available. A refusal does not rewrite a layer, fill a missing cost, or imply that the method is implemented.

## Non-effects and future compatibility

The output is a valuation **preview**. It does not consume quantity, change remaining quantity/value, create an issue movement, calculate COGS, select a journal rule, create a journal proposal, post a journal, or alter any balance. The evidence model remains suitable as a shared future foundation because all new domains must supply their own immutable source facts, effective-dated policy, canonical calculation inputs, independent invariants, and explicit authorization before they can rely on valuation behavior.

> **Fail-closed rule:** Missing standard-cost, lot/serial, canonical quantity-unit, policy, source hash, available quantity, or currency evidence is a reason to refuse or disclose a limitation—not a reason to infer a value or enable a financial effect.
