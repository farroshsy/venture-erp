# Controlled Finance Reporting Design

> **Status: IMPLEMENTATION FOUNDATION AUTHORIZED.** Reporting is read-only and may consume only retained, canonical accounting calculation evidence. It must not create a second accounting-calculation engine, a journal, a balance mutation, a posting, a payment, a tax/payroll result, a filing, an integration call, or an external effect.

## Reporting truth model

The reporting layer is an aggregation and traceability projection over **completed immutable calculation-evidence records**. It may sum retained debit and credit line amounts by the retained account identifier, currency, accounting period, and frozen dimensions. It must never derive financial amounts from invoices, purchase orders, inventory balances, sales orders, or operational records independently.

```text
Controlled report
  → retained evidence line
  → calculation-evidence record hash + invariant snapshot
  → immutable accounting event
  → frozen source/evidence/dimension snapshots
  → effective-dated posting-rule revision
```

| Data source | Permitted reporting use | Explicitly prohibited use |
|---|---|---|
| `erp_accounting_calculation_evidence` | Inclusion gate, canonical lines, record hash, calculation status, invariant evidence | Regeneration or mutation of calculation output |
| `erp_accounting_events` | Accounting date, period reference, event type, frozen source/dimension/evidence context | Recalculation from mutable source tables |
| `erp_posting_rule_revisions` | Rule identity and effective-dated explainability | Selecting an alternative revision after evidence exists |
| Account master records | Account code/name display only | Inventing a classification when a retained classification is absent |
| Journal proposals/journals | Drill-through status context only | Treating proposals or drafts as posted truth |

## Inclusion and exclusion policy

The first controlled reporting increment includes only evidence records where all of the following are true:

1. The record belongs to the active venture.
2. The record status is `completed`.
3. Its evidence-chain verification is valid for the report query.
4. Its independent invariant snapshot confirms balanced output.
5. It has retained calculation lines with a single retained reporting currency for the requested aggregation.

The report must disclose excluded evidence records with a reason. A `refused` record remains traceable and visible in the evidence register but contributes **zero** to financial amount aggregates. A pending proposal, an approved proposal, a journal draft, or a journal that exists outside the evidence chain is never silently included in an evidence-backed report.

## Current available reports

The implemented foundation can safely provide the following controlled views when canonical evidence exists:

| View | Status | Canonical grouping | Traceability |
|---|---|---|---|
| Evidence-backed trial-balance activity | Available as evidence activity, not posted GL | Account and retained currency | Evidence record → event → rule/source snapshots |
| General-ledger activity | Available as immutable calculation-line activity | Account, period, date, debit/credit | Line → evidence hash → event/rule |
| Period comparison | Available for selected evidence-backed periods | Account/currency/current vs comparison period | Each period retains separate evidence line references |
| Account drill-through | Available | Account → evidence lines | Record hash and source event references |
| Frozen dimension drill-through | Available only where retained in evidence | Dimension code/value from frozen context | Line-level frozen dimension context |
| Source and calculation-evidence drill-through | Available | Evidence record and immutable event | Hashes, invariants, rule revision, frozen snapshots |

## Deliberately unavailable statements

Balance Sheet, Income Statement/P&L, cash-flow statement, COGS, gross margin, project profitability, supplier/customer profitability, and formal multi-currency translated presentation require policy-controlled classifications and sources that are not yet canonically retained for every report line. The reporting UI must show these as **not available from canonical evidence yet**, rather than inventing classifications or deriving competing figures from operational data.

Before a formal statement becomes available, an approved governed extension must provide: tenant-scoped account classification taxonomy, mapping version/effective dates, explicit source evidence eligibility, valuation and FX policy where applicable, comparative-period policy, and report-line evidence references.

## Currency policy

No cross-currency aggregation is allowed. Every evidence-backed aggregate is partitioned by its retained calculation-line currency. A future translated presentation requires an approved FX source, a retained translation snapshot, and a separately reviewed reporting policy. The first foundation never converts amounts for display.

## Read-only contract boundary

Future reporting procedures must return explicit boundaries:

```ts
{
  source: "immutable_calculation_evidence";
  reportMode: "evidence_activity_not_posted_gl";
  noJournalCreated: true;
  noAutomaticPosting: true;
  noBalanceMutation: true;
  noTaxCalculation: true;
  noPayrollCalculation: true;
  noPaymentExecution: true;
  noFiling: true;
  noExternalEffect: true;
}
```

Finance authorization and active venture membership remain mandatory. Filters must be declarative and restricted to venture, retained period, account, evidence status, and retained dimension context. The report service must not accept free-form amount overrides, line edits, account mappings, or adjustment inputs.

## Disabled journal-lifecycle follow-on

After controlled reporting, the future journal lifecycle remains disabled until separately authorized. It must preserve maker/checker separation, proposal review evidence, period/account/dimension/rule/invariant validation, duplicate prevention, amendment/reprocessing controls, and immutable reversal design. It must not post, update balances, or trigger external effects.

## Investment Book of Record seam

The future Investment Book of Record will not be a separate accounting universe. Positions, lots, cost basis, realized/unrealized performance, corporate actions, NAV, and performance attribution must ultimately emit attributable immutable events and canonical calculation evidence that reconcile into this same reporting truth model. No IBOR schema, calculation, valuation, market-data integration, or position processing is implemented by this reporting increment.
