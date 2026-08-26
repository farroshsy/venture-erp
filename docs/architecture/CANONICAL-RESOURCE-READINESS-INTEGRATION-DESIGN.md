# Canonical Resource Readiness Integration

**Status:** Implemented as a read-only projection from active canonical item-master profiles into the Canonical Financial Object Model and Semantic Evidence-Gap Register. It does not normalize quantities, convert units, mutate inventory, calculate valuation or COGS, create accounting artifacts, or cause external effects.

## Source mapping

| CFOM element | Source | Projected evidence | Excluded interpretation |
| --- | --- | --- | --- |
| `Resource:{itemMasterId}` | `erp_item_master_profiles` plus the tenant item master | Item classification, inventory-tracked declaration, base UOM code, unit-evidence reference, product family, costing-evidence posture, lifecycle, and source identifiers | It is not a live inventory position, price, valuation result, or financial asset. |
| Resource readiness | Active Resource projections plus observed inventory balances and audit evidence | Active profile count, complete declared-unit evidence count, current unit/quantity linkage gaps, governance condition, future dependencies, and blockers | It cannot make a resource activation-eligible or permit posting. |

The projection uses the profile identifier as the source record and the item-master identifier as the stable Resource identity. Draft profiles are visible in the CFOM projection but only active profiles contribute to the declared-unit readiness posture.

## Readiness interpretation

An active Resource profile with a base UOM and evidence reference makes **identity-level** Resource evidence complete for that profile. The register continues to disclose that resource quantities are not normalized or bound to every inventory balance. It also retains the missing dependencies for unit compatibility/conversion governance and Costing Engine policy source-requirement selection.

> **Important:** A `pass` for Resource validation means the retained item-profile identity and declared unit evidence are present. It does **not** mean quantities are reconciled, units are interchangeable, stock is valued, or accounting/posting readiness exists.

## Explicit boundary

Every projected Resource records `noUnitConversion`, `noInventoryMutation`, `noValuationCalculation`, `noJournalCreated`, and `noExternalEffect`. The CFOM projection version is `0.2-read-projection`; it remains an internal vocabulary/read-model, not a standards-conformance claim or a replacement system of record.

## Deferred capabilities

Unit conversions, compatible-unit checking beyond the existing landed-cost refusal control, quantity normalization, inventory-balance-to-resource binding, item revision/supersession, warehouse/site and supplier qualification, pricing, costing-policy selection, valuation, COGS, accounting, reporting, tax, payroll, payment, filing, integration, and external effects remain separately governed work.
