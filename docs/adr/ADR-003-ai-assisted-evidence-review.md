# ADR-003: AI-Assisted Evidence Review Requires Human Approval

**Status:** Accepted  
**Date:** 2026-08-23  
**Decision owner:** Enterprise Architecture and Risk

## Context

ERP build-versus-buy decisions involve cost, controls, contractual exposure, and operating capacity. An assistant can improve review quality by summarizing supplied evidence, naming assumptions, and identifying gaps, but it must not create a binding procurement, architectural, or investment decision.

## Decision

The Decision Governance context uses a server-side model call with strict structured output. The input includes only the user-supplied decision case: venture scope, declared scorecard, evidence, and assumptions. The system prompt prohibits unsupported external claims and requires a neutral draft. The server then **overrides** any model-provided approval flag and stores the result with `humanApprovalRequired = true`.

| Control | Rationale |
|---|---|
| Server-side invocation only | Keeps credentials and review logic out of the browser. |
| Strict structured output | Makes summaries, assumptions, evidence gaps, and risks explicit and reviewable. |
| Human-approval flag enforced by code | The model cannot promote a draft to an approved record. |
| Role-restricted approval | Only portfolio administrators and venture leads can approve a review. |
| Stored criteria and evidence | The decision remains auditable after a model or prompt changes. |

## Consequences

AI is a review accelerator, not a decision maker. A case can remain a low-confidence draft when evidence is incomplete, and approval is a separate auditable action. This protects the governance process from both automation bias and undocumented model behavior.
