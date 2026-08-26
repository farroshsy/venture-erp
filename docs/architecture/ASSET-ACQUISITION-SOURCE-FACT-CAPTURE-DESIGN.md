# Asset-Acquisition Source-Fact Capture

**Status:** Implemented as tenant-scoped operational attribution only. No asset accounting is enabled.

## Purpose

The asset register now carries a separate nullable `sourceFacts` object alongside existing generic attributes and jurisdiction-neutral internal inputs. This keeps directly observed acquisition context attributable without implying financial recognition or transforming it into a calculated accounting result.

| Optional fact | Retained attribution | Explicit non-meaning |
| --- | --- | --- |
| Internal acquisition reference | Internal operational traceability | Capitalization decision or ownership proof |
| Supplier reference | Supplier-provided reference retention | Invoice approval, payment authorization, or external supplier contact |
| Warehouse, cost-center, and project codes | Directly entered operating context | Inferred accounting dimensions, allocation, or depreciation basis |
| Evidence reference | Internal evidence lookup context | Evidence authenticity/compliance conclusion or external transmission |

## Control behavior

Migration `0022_cynical_morg.sql` adds a nullable JSON column to `erp_assets`. The asset-create contract accepts bounded optional facts; the service trims values, rejects blank/overlength supplied values, omits absent fields, and writes only normalized facts to the new column. The audit record retains captured key names rather than full source values, plus explicit non-capitalization, non-depreciation, non-valuation, no-journal, and no-external-effect flags.

Asset facts remain attached to the tenant-scoped asset row and are never copied into maintenance, calculation inputs, generic attributes, journals, accounting events, evidence calculations, or financial reports.

> Retained acquisition context is not an asset valuation, capitalization conclusion, depreciation schedule, ownership assertion, tax determination, invoice, payment instruction, or external system action.

## Deferred accounting boundary

Any future asset accounting event requires separately authorized finance-owned policy, canonical acquisition evidence, asset availability/ownership criteria, effective dates, valuation/depreciation methods, accounting periods, classification/dimension policy, immutable event/evidence treatment, independent invariants, and professional review where relevant. No such behavior is implemented by this increment.
