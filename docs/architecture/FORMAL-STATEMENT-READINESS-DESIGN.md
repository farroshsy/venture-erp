# Formal Statement Readiness Register

**Status:** Implemented as a read-only control disclosure. Formal statements remain unavailable.

## Purpose

The controlled finance-reporting workspace already restricts amounts to completed, hash-chain-valid immutable calculation evidence. It must not imply that an evidence-backed Trial Balance activity projection is a Balance Sheet, Income Statement, cash-flow statement, statutory report, or posted general ledger.

This design introduces a **read-only readiness register**. It evaluates whether known governance and canonical-evidence prerequisites are present and exposes why a future statement is still blocked. It creates no accounting output and saves no policy configuration.

| Capability | Readiness register does | Readiness register does not do |
| --- | --- | --- |
| Evidence integrity | Discloses hash-chain and invariant inclusion posture | Recalculate evidence, repair hashes, or change inclusion |
| Classification | Discloses exact effective-date classification coverage | Reclassify an account, select a revision, or rewrite history |
| Formal statements | Lists mandatory policy gates and blockers by statement family | Aggregate, calculate, label, approve, or publish statement amounts |
| Journal lifecycle | Reports no statement-posting path | Create, approve, convert, post, reverse, or balance a journal |
| Regulatory scope | Makes the absence of jurisdictional/statutory policy explicit | Determine tax, payroll, local accounting, filing, or compliance outcomes |

## Gates

The register derives only two present-state gates from retained data: eligible immutable evidence has a valid chain/invariants, and every eligible evidence line has exactly one finance-owned approved classification revision effective on its immutable event date. All other required capabilities are deliberately represented as **not configured** or **not implemented**; no defaults or assumptions are introduced.

| Gate | Source | Current behavior when unmet |
| --- | --- | --- |
| Immutable evidence integrity | Existing calculation-evidence chain/invariant verification | Reports an evidence-integrity blocker; no amount is promoted. |
| Effective-dated classification coverage | Account-classification revision read model | Reports unclassified or ambiguous line counts; no line is assigned a fallback category. |
| Opening-balance policy and canonical opening evidence | Not implemented | Remains blocked; no balance is inferred from activity. |
| Period-close/presentation policy | Not implemented | Remains blocked; open or closed period state is not treated as statement readiness. |
| Statement projection evidence and reconciliation | Not implemented | Remains blocked; no formal statement is generated. |
| Currency translation policy/evidence | Not implemented | Remains blocked; currencies remain separated. |
| Cash-flow, valuation, and profitability policies | Not implemented | Remain blocked; no cash-flow, COGS/margin, investment, or profitability view is calculated. |

> A “ready” individual gate means only that its limited prerequisite is observable. It does **not** mean a statement is ready, compliant, reconciled, approved, or fit for external use.

## Security and state boundary

The readiness register is returned only through the existing finance-authorized, tenant-scoped controlled-reporting route. It receives no mutation endpoint, table, workflow, job, integration, or external transmission. Its output carries explicit no-journal, no-posting, no-balance-mutation, no-tax, no-payroll, no-payment, no-filing, and no-external-effect boundaries.

## Path to future formal statement work

A separate authorization would be required before any statement projection. That effort must first define finance-owned policy revisions, approved account-to-statement mapping, opening/closing balance evidence, period-close and adjustment treatment, multi-currency translation evidence, canonical reconciliation procedures, statement-specific invariant checks, reviewer/approver responsibilities, and jurisdiction-specific professional review. The statement projection would then need its own immutable evidence record and a strict separation from journal posting.
