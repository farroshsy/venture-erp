# Finance-Owned Account Classification Revisions

**Status:** Implemented control foundation; formal statements remain unavailable.

## Purpose and decision

Venture ERP's controlled finance reporting intentionally aggregates **only completed, hash-chain-valid immutable calculation evidence**. Those evidence lines retain account identifiers and debit/credit activity but, by themselves, do not provide governed presentation categories. This design adds a tenant-scoped, finance-owned classification-revision control so a finance reviewer can establish the intended presentation family for a chart-of-accounts master over a defined effective period.

It is a **classification governance layer**, not an accounting calculator, journal workflow, tax engine, valuation model, or statutory-reporting assertion. It is deliberately narrower than a general ledger chart-of-account redesign: existing account masters remain the operational identity; revisions retain a point-in-time presentation decision separately.

| Decision | Selected design | Reason | Explicitly rejected here |
| --- | --- | --- | --- |
| Account identity | Existing tenant-scoped `erp_master_records` account master | Avoids duplicate account catalogs and preserves existing posting-rule references | Replacing or mutating account master codes/types |
| Classification history | Append-only revision rows with effective dates | Retains who made a presentation decision, why, and when it applies | Updating a mutable category field on the account master |
| Lifecycle | Draft → approved; no inline edit or delete | Keeps approval evidence and lets a later revision supersede through date ranges | Silent recategorization of history |
| Presentation vocabulary | Bounded generic family and statement section values | Supports future governed reporting without pretending a universal statutory taxonomy | Country-specific statutory chart labels or tax meaning |
| Reporting impact | Exposes classification coverage and match state only | Avoids creating a competing accounting calculator | Balance Sheet, P&L, cash-flow, COGS, profitability, translated, or statutory statements |

## Data model

Each revision belongs to one venture and one existing `account` master in that same venture. It retains:

| Field | Meaning |
| --- | --- |
| `accountMasterId` | The account master being classified; this is validated as a same-venture `account` domain record. |
| `classificationFamily` | Generic presentation family: `asset`, `liability`, `equity`, `revenue`, `expense`, or `memo`. |
| `statementSection` | Generic presentation section such as `current_assets`, `noncurrent_assets`, `current_liabilities`, `noncurrent_liabilities`, `equity`, `operating_revenue`, `other_income`, `operating_expense`, `other_expense`, or `memo`. |
| `normalBalance` | Finance-owned expected debit or credit orientation for later presentation validation; it does not alter stored evidence-line sides. |
| `effectiveFrom` / `effectiveTo` | Inclusive date interval evaluated against an immutable event's accounting date. |
| `status` | `draft`, `approved`, `superseded`, or `retired`; only approved revisions are eligible for coverage. |
| `rationale` / `adrReference` | Human-reviewable reason and optional architecture-decision reference. |
| Author and approver fields | Distinct retained actors and timestamps for review evidence. |

The database enforces tenant-scoped account linkage and revision uniqueness. The service independently rejects cross-venture or non-account references, inverted date ranges, and overlapping approved ranges for one account. A revision cannot change evidence, journal proposals, journal lines, journal status, ledger entries, balances, source records, or prior classifications.

## Evaluation and historical boundary

Classification selection uses the immutable accounting event's `accountingDate`, not the current date. For every evidence line, the reporting read model finds **exactly one approved effective revision** for that account and date. Zero or multiple matches result in a visible unclassified/ambiguous coverage state; the line remains in evidence-backed Trial Balance and general-ledger activity, but it cannot be represented as a formal-statement line.

> A classification revision is an explanation of how to present retained evidence. It is not evidence that an amount has posted to a general ledger, been valued, translated, settled, taxed, filed, or legally reported.

For this first increment, classification metadata is attached dynamically by the read model rather than rewritten into existing immutable calculation evidence. This avoids historical modification. Any future production statement projection must freeze the applicable classification revision identifiers and policy versions in its own immutable calculation evidence before presentation.

## Authorization and audit

Only a `portfolio_admin`, `venture_lead`, or `finance_lead` with active membership may create or approve a revision. Reads require active venture membership, while the controlled reporting endpoint retains finance authorization. Creation and approval emit tenant-scoped finance audit events that retain identifiers, effective dates, lifecycle state, and no-side-effect markers.

## Non-goals and required future gates

This increment intentionally does not add statements, cumulative balances, retained earnings roll-forward, cash-flow classification, revenue recognition, inventory valuation, COGS, FX translation, consolidation, statutory taxonomy, tax determination, payroll, payments, filing, external transmission, journal creation, journal conversion, automatic posting, or balance mutation.

Formal statements remain unavailable until a separately governed policy package defines classifications, retained account mapping/versioning, opening and closing balance policy, period-close treatment, currency translation evidence, account-to-statement validation, reviewer approval, and independent reconciliation to authoritative ledger evidence. Any jurisdiction-specific presentation requires qualified local accounting/legal review; no such compliance claim is made here.
