# Canonical Item-Master Profile Design

**Status:** Implemented as a tenant-scoped, controlled master-data profile. It records declared item classification and base-unit identity only. It does not create inventory, pricing, supplier terms, unit conversion, valuation, COGS, accounting, tax, payroll, payment, filing, integration, or external effects.

## Purpose

The existing tenant-scoped `erp_master_records` item is the business identifier. `erp_item_master_profiles` is an additive one-to-one profile that supplies a minimal canonical vocabulary for evidence interpretation without rewriting the item master or historical source facts. The profile is deliberately separate from Costing Engine layers: older immutable receipt and layer evidence remains unchanged.

| Profile field | Evidence meaning | Guardrail |
| --- | --- | --- |
| Item master | Active tenant-scoped item identity | Must be an active `item` master in the same venture. |
| Item type | `stock_item`, `non_stock_item`, or `service` | `stock_item` must explicitly declare inventory tracking; `service` cannot declare it. |
| Base UOM code | Declared unit identity, such as `EA`, `KG`, or `HOUR` | Uppercase bounded identifier only; no conversion factor, compatibility claim, or default unit is stored. |
| Unit evidence reference | Bounded source/approval reference for the declared unit | Required; a label is not treated as operational or external proof. |
| Costing eligibility | `not_assessed`, `evidence_only_eligible`, or `blocked` | A label only; it cannot select a costing policy, run a valuation, or alter a layer. |
| Lifecycle | `draft`, `active`, or `retired` | Activation records audit evidence only and cannot rewrite a retained profile. |

## Control flow

```text
Active tenant item master
  → finance-authorized draft profile with declared type + base UOM + evidence reference
  → finance-authorized activation
  → tenant audit evidence
  → stop
```

The profile key is unique per venture and item master. A second profile request is refused. This preserves a stable identity profile and deliberately defers revision/supersession behavior to a separately governed future design rather than silently overwriting a declared unit or classification.

## Authorization and audit

Any active venture member may read profiles. Only `portfolio_admin`, `venture_lead`, or `finance_lead` may create or activate a profile. Creation and activation retain audit evidence with the declared UOM, classification, costing posture, and explicit no-effect flags. The API and workspace also disclose that an active profile does not change stock balances or financial evidence.

## Explicit exclusions

> **Fail-closed boundary:** A base UOM is a declared source identity, not a conversion engine. It cannot reconcile mixed units, normalize historical movement quantities, or make an incompatible Costing Engine allocation permissible.

The profile does not backfill historic source facts, bind a profile automatically to a receipt or cost layer, introduce inventory availability, calculate cost, consume a layer, calculate COGS, create a journal/proposal/entry, mutate a ledger/balance/statement, determine tax or payroll, execute payments, file, integrate, or act externally.

## Deferred evolution

Future canonical product, supplier, warehouse, UOM-conversion, site/location, costing-category, pricing, BOM/routing, and revision/supersession capabilities each require their own tenant, evidence, effective-dating, compatibility, and financial-effect control design. They are not implied by the current profile.
