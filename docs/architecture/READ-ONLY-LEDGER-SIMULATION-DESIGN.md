# Read-Only Ledger Simulation Design

> **Status:** The bounded single-event simulation is implemented as an explainable preview over retained internal accounting evidence. It cannot create a journal, assign a journal number, alter balances, update inventory valuation, initiate payment, calculate tax or payroll, file, transmit externally, or modify source records.

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

Simulation remains ephemeral apart from its existing metadata-only audit event. A separately authorized **Calculate immutable evidence** operation may retain an append-only calculation record with canonical input/output hashes, an independent invariant snapshot, and a predecessor record hash. This explicit operation is distinct from **Simulate only**: it never creates a proposal, journal, journal number, ledger balance, payment, tax/payroll result, filing, workflow, integration, or external effect. Read-only chain verification rehashes retained evidence and checks predecessor continuity without mutating it.

## Phased adoption

| Phase | Capability | Entry gate |
|---|---|---|
| 1 | Single immutable event against its approved rule | Existing proposal evaluator parity, finance authorization, tenant scope |
| 2 | Selected existing proposal preview and allocation explainability | Frozen dimension and derivation snapshot validation |
| 3 | Same-currency proposal-set trial-balance preview | Explicit aggregation rules and durable validation suite |
| Deferred | Costing-method comparison, landed cost, driver allocations, reporting-currency projection, or hypothetical tax/payroll | Separate finance policy, source contracts, review, and tests |

## Non-goals

This design does not model FIFO, LIFO, weighted average, manufacturing cost pools, tax, statutory payroll, cash forecasting, a general-ledger posting engine, or an accounting opinion. Any production accounting conclusion remains subject to the venture's finance governance and qualified professional review.

## First implementation status

The first bounded implementation is available through the finance-authorized `accountingControl.simulateEvent` contract and the Journal Control **Simulate only** action. It reads a single immutable accounting event and one matching approved effective-dated rule revision, freezes the active dimension catalog and event context, executes the same deterministic percentage-allocation preview logic in memory, and returns explainable debit/credit lines, derivations, balancing, and refusal reasons.

It writes only `ledger_simulation.executed` or `ledger_simulation.refused` metadata audit evidence. The audit contains request identity, source/rule identifiers, result status, and non-mutation flags; it does not persist simulated lines, journal entries, balances, or a simulation ledger. The returned report is visibly labelled **Simulation only — no accounting impact** and contains no journal-creation, numbering, posting, balance, inventory, payment, payroll/tax, filing, workflow, integration, or external-effect path.

The finance-authorized `accountingControl.createCalculationEvidence` contract is the separately controlled retention path. It stores completed and refused procurement-receipt calculations, calculates canonical input/output/record hashes, links each record to the predecessor hash for the same venture, and stores independently recomputed double-entry, allocation-total, source-cent, and residual checks. `accountingControl.verifyCalculationEvidenceChain` is read-only and exposes a per-record validation posture to Journal Control. Neither contract can create, convert, post, or number a journal.
