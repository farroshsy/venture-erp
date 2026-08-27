# Canonical Resource Evidence Bridge

## Purpose and scope

The **Canonical Resource Evidence Bridge (CREB)** is a tenant-scoped, read-only projection that makes already-retained inventory evidence reviewable against the Canonical Financial Object Model Resource vocabulary. Its initial canonical identifier is `Resource:{itemMasterId}` and it deliberately creates Resource objects only from **active canonical item-master profiles**. An item without such an active profile is not silently represented as a canonical Resource.

CREB is not an inventory subledger, valuation engine, or posting path. It projects retained evidence for review and future, separately governed semantic reuse. The response-time reconciliation timestamp identifies when the read-only projection was generated; it is not a persisted reconciliation run or an accounting-period close.

| Included initial scope | Explicitly excluded |
| --- | --- |
| Active item profiles, item masters, retained inventory movements, and retained balance snapshots. | Creating, rewriting, or adjusting inventory balances or movements. |
| Same-tenant linked procurement/sales/other operational documents where a movement has an `operationalRecordId`. | A replacement ledger, warehouse device connection, or inferred warehouse/location model. |
| Explicit scalar source facts, with warehouse/location-like facts displayed as declared values only. | Unit conversion, compatibility inference, normalization, pricing, valuation, cost, or COGS. |
| Same-tenant immutable accounting events/evidence by source movement; Costing Engine layers/evidence by item/layer. | Journal proposal, journal, posting, GL, financial-statement, tax, payroll, payment, filing, integration, or external effects. |

## Retained evidence model

For each active profile, CREB reads the following sources in the active tenant only. It never follows a reference across a tenant boundary, and it does not infer missing relationships.

| Evidence category | Retained source | CREB treatment |
| --- | --- | --- |
| Canonical identity | `erp_item_master_profiles`, `erp_master_records` | Retains profile and item reference, declared base UOM, and declared unit-evidence reference. The UOM remains identity metadata, never a conversion factor. |
| Quantity snapshot | `erp_inventory_balances` | Reports retained on-hand, reserved, and available quantities. |
| Quantity history | `erp_inventory_movements` | Retains IDs, types, quantities, source-fact keys, and operational-record IDs. |
| Supporting document | `erp_operational_records` | Resolves only a movement's retained same-tenant `operationalRecordId`, exposing record number, type, domain, status, and effective date. |
| Immutable accounting evidence | `erp_accounting_events`, `erp_accounting_calculation_evidence` | Resolves events only when their retained `sourceInventoryMovementId` matches a projected movement, then evidence only by exact accounting-event ID. |
| Costing evidence | `erp_cost_layers`, `erp_costing_calculation_evidence` | Retains layer IDs/keys/source movement/hash and calculation IDs/type/status/hash. It makes no value or COGS determination. |
| Finance dimension context | `erp_finance_dimension_values`, `erp_finance_dimension_definitions` | Exposes a dimension only when an explicit scalar source-fact value exactly matches a retained dimension-value code. A label such as `costCenterCode` without an exact match remains a declared source fact; no mapping is inferred. |

## Reconciliation semantics

CREB derives quantity from retained movements at three decimal places: on-hand is receipts plus `adjust_in` minus issues minus `adjust_out`; reserved is reserves minus releases. It compares each derived quantity to the retained balance snapshot after the same rounding. The retained `available` value is simply on-hand minus reserved from that snapshot.

| Reconciliation status | Meaning |
| --- | --- |
| `reconciled` | A retained balance snapshot and movement history both exist, and rounded movement-derived on-hand and reserved quantities agree with the snapshot. |
| `exception` | A retained balance snapshot and movement history both exist, but at least one rounded quantity differs. The exception is observational only and never triggers an adjustment. |
| `insufficient_evidence` | A retained balance snapshot or movement history is absent. Matching zero defaults are never accepted as proof of reconciliation. |

Evidence completeness is **complete** only when no observed core or supporting gap remains, **partial** when identity/quantity evidence exists but supporting references are missing, and **incomplete** when a core source is absent. The traceability score is a transparent evidence-coverage indicator across ten categories—master, balance, movement, declared unit evidence, document, accounting event, accounting calculation evidence, cost layer, costing calculation evidence, and exact finance-dimension match. It is not a valuation, accounting, compliance, or approval determination.

## Explainability and readiness

Each resource reports quantity origin, contributing movements, resolved documents, declared source facts/location values, immutable evidence IDs/hashes/statuses, gaps, reconciliation rationale, and a non-persisted projection timestamp. It also reports whether the retained evidence is complete, whether quantities reconcile, and whether the traceability score is complete.

> **All future valuation, future costing, and future accounting eligibility fields remain `false` in CREB.** A read projection cannot authorize a financial consequence. Missing links and mismatches remain explicit blockers for review; CREB supplies no correction control and no operational button.

## Reuse seam

The projection shape may later be reused for assets, manufacturing WIP, projects, services, or investment cost basis, but each domain requires a separately authorized canonical identity, retained quantity/position contract, effective-dated policy semantics, invariant set, evidence chain, and explicit financial-effect authorization. The inventory-only CREB contract does not imply that any of those objects exist or are ready.
