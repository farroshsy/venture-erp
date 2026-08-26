# Costing Engine Foundation

**Status:** Authorized non-payroll foundation. The first increment is policy, immutable cost-layer, allocation-evidence, preview, and validation infrastructure only. It does not post journals, mutate GL balances, calculate tax/payroll, execute payments, file, transmit, recognize revenue, produce formal statements, or contact external systems.

## Intent and shared-engine seam

The Costing Engine is a bounded calculation/evidence context, not an inventory-only helper. Its common concepts are designed to serve future inventory valuation, manufacturing, project/service cost attribution, asset cost evidence, and investment cost basis **without** making any of those future calculations active today.

| Concept | First implemented use | Shared future use | Boundary |
| --- | --- | --- | --- |
| Effective-dated costing policy revision | Inventory valuation method selection | Manufacturing, project/service cost, asset cost basis, investment lots | Finance-owned and append-only; never silently changes history. |
| Immutable cost layer | Inventory receipt/issue source evidence | WIP, project/service consumption, asset acquisition, investment lot | Layer source and facts are snapshotted; no mutable source reread. |
| Allocation evidence | Landed-cost allocation | Overhead, activity, project/service allocation | Deterministic driver, rounded results, residual, and refusal evidence. |
| Calculation evidence | Valuation preview/result chain link | Future cost engines | Evidence is reproducible and hash-linked; not a journal or GL entry. |

## First increment scope

The engine will support six declared inventory valuation **policy methods**: `fifo`, `lifo`, `moving_average`, `weighted_average`, `standard_cost`, and `specific_identification`. A policy is only eligible when finance approves an effective-dated tenant-scoped revision. The first increment may preview only the methods with canonical source inputs available; it must refuse rather than infer missing standard-cost, lot/serial, FX, quantity, or unit-cost evidence.

The layer model records receipt, issue, and allocated landed-cost context separately. Every layer retains an immutable source movement reference/key, quantity/value facts, remaining quantity/value, currency, policy revision, direct source facts, attribution snapshot, and created-by/audit evidence. Issues consume layers only inside a deterministic calculation record; no movement, on-hand quantity, financial statement, proposal, journal, ledger, or balance is changed by a preview.

## Landed cost and attribution

Allowed landed-charge categories are freight, insurance, customs, duty, handling, and miscellaneous. Allowed allocation drivers are quantity, weight, value, volume, and a finance-approved manual driver. The service must preserve the selected driver values, eligible target set, declared measure unit when used, exact rounding, deterministic residual recipient, policy revision, and explanatory narrative. Weight and volume drivers use only explicitly captured immutable receipt source facts. Every selected target must retain the same declared unit for the selected measure; missing or mixed units refuse and retain refusal evidence. No unit conversion, default, equivalence assumption, or inferred measure is implemented. The service must refuse empty target sets, negative/zero driver totals, currency mismatch, cross-tenant targets, incomplete source facts, incompatible declared measurement units, unapproved manual drivers, and any allocation that does not reconcile exactly to the supplied charge amount.

Cost-center, profit-center, and internal-order attribution are explicit source facts, not inferred accounting dimensions. Their codes are snapshotted on the cost-layer/evidence record and may later be mapped through separately governed finance dimensions. A missing code remains missing; no default is assigned.

## Evidence chain and invariants

Costing calculations produce canonical input/output payloads with SHA-256 hashes and predecessor links compatible with the existing immutable accounting calculation-evidence architecture. The first increment must maintain a separate costing calculation record and, where a matching immutable accounting event exists and an approved policy allows the relationship, retain a non-mutating link to existing accounting calculation evidence. It cannot fabricate or emit an accounting event merely to obtain a link.

| Invariant group | Required assertion |
| --- | --- |
| Quantity | Layer receipt quantity is positive; consumed quantity never exceeds remaining quantity; remaining equals original plus allocations’ quantity-neutral state minus consumption. |
| Value | Layer value, allocation total, and consumption value round deterministically to currency precision; allocation outputs sum exactly to the supplied charge. |
| Measurement | Weight/volume drivers use retained explicit values and declared units only; selected targets retain one identical declared unit, otherwise evidence is refused without conversion or inference. |
| Policy | Exactly one approved effective policy matches an accounting date; ambiguous/no-match selections refuse. |
| Tenant/source | Every source movement, master, attribution, policy, and target belongs to one active venture. |
| Immutability | Completed/refused calculation, layer snapshots, input/output hashes, and predecessor relation are never updated. |
| No financial effect | Journal, journal-line, ledger-entry, accounting-event, payable/payment, tax, payroll, and external-effect counts remain unchanged. |

## Preview and reporting boundary

Finance-authorized users may request read-only valuation previews and validation reports. A preview returns selected policy revision, eligible immutable layers, deterministic consumption/allocation lines, residual treatment, source/evidence identifiers, warnings/refusals, and invariant results. It may write only immutable calculation/audit evidence as explicitly documented; it cannot create an issue movement, change `remainingQuantity`, change `remainingValue`, create a journal proposal, or create/post a journal.

Formal COGS, gross profit, inventory valuation, margin, and financial-statement presentation remain unavailable. Future activation requires finance policy, canonical measurement/FX/standard-cost/lot evidence, statement policy, independent review, provenance, correction/reprocessing, reconciliation, and separately authorized accounting integration.

The future correction and reprocessing control seam is documented separately in [`DISABLED-COSTING-CORRECTION-REPROCESSING-DESIGN.md`](./DISABLED-COSTING-CORRECTION-REPROCESSING-DESIGN.md). It is documentation only: no correction or reprocessing command, persistence, migration, route, UI control, layer change, valuation output, COGS result, posting, or financial effect is implemented.

## Explicit exclusions

This design does not implement manufacturing BOM/routing/WIP/variance; project or service costing; asset capitalization/depreciation; investment calculation/valuation; revenue recognition; COGS; tax/payroll; payment; bank/custody/logistics integration; posting; GL mutation; statutory or financial-statement reporting. Each needs a separate bounded design and activation decision.
