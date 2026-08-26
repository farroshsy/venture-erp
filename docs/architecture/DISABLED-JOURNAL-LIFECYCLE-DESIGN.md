# Disabled Journal Lifecycle Design

> **Status: DESIGN ONLY — POSTING REMAINS DISABLED.** This design adds no route, schema migration, conversion action, journal creation path, posting action, balance mutation, payment, tax/payroll calculation, filing, integration, or external transmission.

## Control objective

The future journal lifecycle must preserve the existing immutable chain:

```text
Source Event → Immutable Calculation → Verification → Journal Proposal → Human Review → Approved for Posting → [POSTING DISABLED]
```

No stage may backfill, overwrite, or recalculate a historical event, calculation record, rule revision, proposal snapshot, or approval decision. A failure at any stage must produce durable refusal evidence and must not create a journal.

## Proposed state machine

| State | Meaning | Authorized transition | Forbidden behavior |
|---|---|---|---|
| `pending_review` | Deterministic proposal has not been reviewed | Maker submits; checker reviews | Journal creation or posting |
| `approved` | Proposal review accepted only | Checker can request disabled posting authorization | Treating approval as posting |
| `approved_for_posting` | Future two-person authorization evidence is complete | Future posting service, only when separately enabled | Automatic posting or external execution |
| `rejected` | Checker rejected proposal | New source event/rule revision/reprocessing creates new chain | Editing rejected snapshot |
| `refused` | Precondition/invariant/rule/dimension failure | New correctly governed input creates a new chain | Manual bypass or defaulted values |
| `superseded` | Later governed amendment/reprocessing replaces eligibility | New immutable proposal/evidence chain only | Mutating original journal/proposal |

## Maker/checker separation

A future `approved_for_posting` state must require a checker who is not the maker of the source policy decision or the proposal. The exact segregation-of-duties policy requires finance-governance approval before implementation, but the minimum check is that the actor approving for posting cannot be the proposal creator or prior reviewer.

| Required evidence | Purpose |
|---|---|
| Proposal snapshot hash | Proves the reviewed content has not changed |
| Calculation record hash | Links approved proposal to verified canonical computation |
| Rule revision ID and effective-date match | Proves policy provenance |
| Accounting-period status at authorization | Prevents authorization into a closed period |
| Account/dimension validation result | Preserves tenant and required-context control |
| Maker/checker actor IDs and timestamps | Supports accountable segregation evidence |
| Idempotency key | Prevents duplicate approval or conversion attempts |
| Approval/refusal rationale | Explains the human decision |

## Preconditions — future enforcement

The future lifecycle command must fail closed if any condition fails:

1. The proposal, evidence, event, rule, accounts, period, and actor all belong to the same active venture.
2. Evidence hashes, predecessor chain, and independent invariants are valid.
3. The proposal is in the expected state and has not already been authorized, converted, superseded, or rejected.
4. The retained calculation line set is balanced to exact cents and matches the immutable proposal snapshot exactly.
5. The retained rule revision is the exact approved effective-dated revision referenced by the evidence.
6. Required frozen dimensions are present; no dimension is inferred from the live catalog.
7. The accounting period is eligible under future finance policy.
8. The request carries a unique idempotency key.

## Refusal and rejection evidence

Every refusal or rejection should retain the proposal ID, evidence record hash, checked preconditions, reason codes, actor, timestamp, and no-side-effect flags. The record must omit unnecessary sensitive source data and must never retain raw rejected supplier-reference attempts.

## Amendment, reprocessing, and reversal

Historical records are immutable. A future correction must not edit a source event, calculation evidence record, proposal, or journal. The permitted pattern is:

```text
New attributable source fact or amended policy
  → new immutable event/evidence/proposal chain
  → optional future reversal design linked to original posting
```

Reversal design is deferred until posting is separately authorized. It must create a new inverse journal with an explicit original-journal reference, reason, actor, period eligibility result, and immutable audit evidence. It must never delete, alter, or silently re-use the original journal number.

## Investment Book of Record seam

Investment positions, tax lots, cost basis, realized/unrealized performance, corporate actions, NAV, and performance attribution must eventually reconcile through the same source-event → immutable calculation-evidence → proposal → controlled-journal path. The lifecycle must not accept an IBOR-specific hidden ledger or balance universe. Before implementation, finance governance must define valuation sources, pricing cutoffs, corporate-action attribution, FX policy, lot method, reconciliation policy, and external-data controls.

## Explicit non-goals

This design does not authorize posting, automated approval, balance mutation, FX translation, valuation, COGS, tax, payroll, payment execution, supplier/customer messaging, filing, banking, market-data integration, or external transmission.
