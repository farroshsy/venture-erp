# Read-Only Ledger Simulation Design

> **Status:** Architecture design only. A simulation is an explainable preview over retained internal accounting evidence. It cannot create a journal, assign a journal number, alter balances, update inventory valuation, initiate payment, calculate tax or payroll, file, transmit externally, or modify source records.

## Purpose

The Accounting Event → Posting Rule → Journal Proposal control can now generate deterministic, proposal-only lines. The next safe capability is to let a finance user inspect what an event or a selected set of proposals **would** produce under an explicitly selected approved rule revision. The simulator is a pure read model: it consumes immutable snapshots and returns an ephemeral result to the caller.

| Concern | Simulation behavior | Prohibited behavior |
|---|---|---|
| Inputs | Immutable event, proposal, rule, dimension, currency, and evidence snapshots | Reading mutable live source values as a substitute for a snapshot |
| Execution | Deterministic evaluation in request memory | Writes to journals, ledger entries, balances, inventory, or workflow state |
| Explainability | Rule/revision, selector, allocation, rounding, dimensions, and refusal reasons | Unexplained defaults or AI-generated accounting treatments |
| Scope | One tenant and one declared scenario at a time | Cross-venture aggregation or external connector access |
| Result | Ephemeral preview response with a content hash | Journal number assignment, posting readiness, or external confirmation |

## Contract draft

```ts
type LedgerSimulationRequest = {
  ventureId: number;
  scenario: "event_preview" | "proposal_preview" | "proposal_set_preview";
  accountingEventId?: number;
  journalProposalIds?: number[];
  ruleRevisionOverrideId?: number;
  asOfDate: string;
  rationale: string;
};

type LedgerSimulationResult = {
  simulationVersion: 1;
  contentHash: string;
  immutableInputReferences: Array<{ type: string; id: number; snapshotHash?: string }>;
  evaluatedRule: { ruleCode: string; revision: number; effectiveDate: string } | null;
  lines: Array<{
    entrySide: "debit" | "credit";
    accountMasterId: number;
    currency: string;
    amount: string;
    frozenDimensions: Record<string, unknown>;
    derivation: Record<string, unknown>;
  }>;
  balancing: { debitTotal: string; creditTotal: string; isBalanced: boolean };
  refusalReasons: string[];
  boundary: {
    journalCreated: false;
    journalNumberAssigned: false;
    balanceMutated: false;
    integrationTriggered: false;
    externalEffect: false;
  };
};
```

The simulator must refuse an input that crosses the caller's active venture, refers to an unapproved rule override, combines currencies without approved reporting-currency evidence, uses an event or proposal missing its immutable snapshot, or produces an unbalanced output. A refusal is a response object; it is not a fallback accounting treatment.

## Explainability record

The user interface should show the retained source event or proposal first, then the selected rule revision, frozen dimensions, allocation basis points, rounding residual, output lines, totals, and refusal evidence. A visible boundary banner must state:

> **Preview only. This simulation does not create a journal, update a ledger, affect inventory value, initiate a payment, calculate tax or payroll, or send information outside Venture ERP.**

If audit retention is later required, the platform may store an immutable **simulation request/evidence record** that contains the request hash and output hash, but never a posting effect. That storage must be separately approved; initial delivery should remain ephemeral.

## Phased adoption

| Phase | Capability | Entry gate |
|---|---|---|
| 1 | Single immutable event against its approved rule | Existing proposal evaluator parity, finance authorization, tenant scope |
| 2 | Selected existing proposal preview and allocation explainability | Frozen dimension and derivation snapshot validation |
| 3 | Same-currency proposal-set trial-balance preview | Explicit aggregation rules and durable validation suite |
| Deferred | Costing-method comparison, landed cost, driver allocations, reporting-currency projection, or hypothetical tax/payroll | Separate finance policy, source contracts, review, and tests |

## Non-goals

This design does not model FIFO, LIFO, weighted average, manufacturing cost pools, tax, statutory payroll, cash forecasting, a general-ledger posting engine, or an accounting opinion. Any production accounting conclusion remains subject to the venture's finance governance and qualified professional review.
