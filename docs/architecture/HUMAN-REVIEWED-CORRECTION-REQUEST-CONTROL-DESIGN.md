# Human-Reviewed Costing Correction Request Control

**Status:** Implemented only as an append-only, tenant-scoped **evidence-only request and human-review control**. It does not execute correction, source remediation, reprocessing, successor calculation evidence, valuation adjustment, COGS, journal, posting, balance change, tax/payroll calculation, payment, filing, integration, or external action.

## Implemented scope

| Control | Implemented behavior | Explicit non-effect |
| --- | --- | --- |
| Correction request | Finance-authorized user retains a bounded assertion against an exact immutable Costing Engine calculation record and, optionally, an exact layer/source hash referenced by its frozen snapshots. | No replacement number, unit, rate, policy, account, or posting instruction is accepted. |
| Readiness disclosure | A full Semantic Evidence-Gap and Readiness Register snapshot is frozen with the request and again at review. | The register cannot authorize activation or change state. |
| Human review | A different finance-authorized user may retain one immutable `blocked` or `rejected` decision. | Review cannot approve, execute, or queue reprocessing. |
| Refusal reasons | Review retains bounded reason codes including absent correction policy/remediation contract/successor authority and disabled posting readiness. | It does not repair any prerequisite or infer missing evidence. |
| Audit | Request and review events record immutable identifiers and no-effect flags. | No source, layer, inventory, accounting, or external artifact is changed. |

## Exact-target and segregation controls

The request key is unique per venture. The request verifies that the original Costing Engine calculation belongs to the active venture and that the supplied record hash equals the retained immutable hash. When an explicit layer is selected, it must be directly linked from the calculation record or listed in its frozen eligible-layer, source-layer, or calculation-line evidence. When an original source hash is supplied, it must equal the retained immutable layer source hash.

The original requester cannot review their own request. A review by the same user is refused before review evidence is retained. A request also cannot receive duplicate review evidence, preserving a single durable review conclusion for this bounded control.

## Readiness-gated review outcome

The current Semantic Evidence-Gap and Readiness Register reports no activation-eligible object. Accordingly, implemented reviews retain only `blocked` or `rejected` evidence with the current prerequisite gaps. The design intentionally does not expose an approval, successor, reprocess, or financial-effect decision.

```text
Immutable costing calculation + optional linked immutable layer
  → correction request with exact hashes + readiness snapshot
  → separate human reviewer
  → blocked / rejected evidence with reason codes
  → stop
```

## Durable boundary

Every request and review returns and audits `evidenceOnlyRequest`, `noSourceMutation`, `noLayerMutation`, `noReprocessingExecuted`, `noValuationPosting`, `noCogsCalculation`, `noJournalCreated`, `noAutomaticPosting`, `noLedgerMutation`, `noBalanceMutation`, `noTaxCalculation`, `noPayrollCalculation`, `noPaymentExecution`, `noFiling`, `noIntegrationTriggered`, and `noExternalEffect` flags.

> **Fail-closed rule:** A retained request or blocked/rejected review is not a corrected source assertion and must never be treated as reprocessing authorization, valuation adjustment, or posting authority.

## Deferred follow-on

Actual source remediation, correction policy revision, reprocessing, successor evidence, supersession, valuation consequence, COGS, accounting, reporting, or period-close effect each need a separate authorization, design, test plan, and migration review. The original disabled correction/reprocessing design remains the reference for those still-unimplemented capabilities.
