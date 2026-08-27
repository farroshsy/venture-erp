# Venture ERP Documentation Hub

This directory is the durable companion to the [Venture ERP workspace](https://ventureerp-ax3cnpay.manus.space). It records **what is implemented, what is deliberately unavailable, the retained evidence model, validation outcomes, and the conditions that must be met before a future capability can be considered**. It is not a substitute for qualified legal, tax, accounting, payroll, or regulatory advice.

## Read this first

| Document | When to use it | What it establishes |
| --- | --- | --- |
| [Repository README](../README.md) | You are new to the project. | Live workspace link, architecture posture, capability summary, development commands, and operating boundaries. |
| [Workspace Guide](https://ventureerp-ax3cnpay.manus.space/guide) | You need in-product navigation and practical scenarios. | Intent, expected outcome, and active exclusion for each workspace. |
| [Validation Notes](platform/VALIDATION-NOTES.md) | You need verified change evidence. | Actual test, integration, contract, foundation, build, and responsive-review outcomes by increment. |
| [Engineering Standards](platform/ENGINEERING-STANDARDS.md) | You are preparing a contribution or release. | Quality gates, contract checks, safe database evolution, and release expectations. |
| [Service Maturity](platform/SERVICE-MATURITY.md) | You are assessing extraction or release posture. | L0–L3 maturity criteria and the evidence required for service independence. |
| [Gate 1 Production Hardening](architecture/GATE-1-PRODUCTION-HARDENING-DESIGN.md) | You are assessing whether the platform can proceed beyond its architecture freeze. | The Gate 1–5 maturity sequence, implemented request-time controls, recovery boundaries, local-test scope, and missing exit evidence. |
| [Gate 1 Operations Runbook](platform/GATE-1-OPERATIONS-RUNBOOK.md) | You are investigating a bounded observed application failure. | Safe correlation-ID triage, probe interpretation, local capacity-check limits, recovery ownership gaps, and escalation evidence. |
| [Gate 2 Adoption and Operator Validation](architecture/GATE-2-ADOPTION-VALIDATION-DESIGN.md) | You are planning or reviewing an evidence-first operator study. | Consent-aware human observation, pseudonymous participant references, role journeys, failure recovery, separate review, measured-versus-unmeasured interpretation, and Gate 2 exit evidence. |
| [Gate 3 GitHub Evidence Acquisition](architecture/GATE-3-GITHUB-EVIDENCE-ACQUISITION-DESIGN.md) | You are planning or reviewing the bounded external-source connection. | Tenant-scoped source lifecycle, server-only credential reference, filtered raw evidence, deterministic normalization, manual one-page acquisition, review/revocation/retention boundaries, and Gate 3 exit evidence. |
| [Gate 3 GitHub Evidence Runbook](platform/GATE-3-GITHUB-EVIDENCE-RUNBOOK.md) | You are operating or investigating the first GitHub evidence source. | Safe validation/authorization/activation, manual acquisition, rate-limit/refusal handling, provenance review, revocation, and deferred-capability boundaries. |

## Architecture and decision records

The architecture records describe the service-aligned modular-monolith strategy, bounded contexts, data ownership, migration readiness, and narrow evidence-first capability increments. Architecture documents explain the intended design; they do not enable a control that has not been implemented and validated.

| Area | Primary records |
| --- | --- |
| Platform strategy | [Bounded Contexts](architecture/BOUNDED-CONTEXTS.md), [Migration Roadmap](architecture/MIGRATION-ROADMAP.md), [Enterprise Platform Implementation](architecture/ENTERPRISE-PLATFORM-IMPLEMENTATION.md) |
| Governed finance evidence | [Accounting Event and Posting Control](architecture/ACCOUNTING-EVENT-POSTING-CONTROL-DESIGN.md), [Controlled Finance Reporting](architecture/CONTROLLED-FINANCE-REPORTING-DESIGN.md), [Read-Only Ledger Simulation](architecture/READ-ONLY-LEDGER-SIMULATION-DESIGN.md) |
| Canonical evidence layer | [CFOM Read Projection](architecture/CANONICAL-FINANCIAL-OBJECT-MODEL-READ-PROJECTION-DESIGN.md), [Semantic Evidence-Gap Register](architecture/SEMANTIC-EVIDENCE-GAP-READINESS-REGISTER-DESIGN.md), [CREB](architecture/CANONICAL-RESOURCE-EVIDENCE-BRIDGE-DESIGN.md), [COEB Design](architecture/CANONICAL-OBLIGATION-EVIDENCE-BRIDGE-DESIGN.md), [COEB Roadmap Decision](architecture/CANONICAL-OBLIGATION-EVIDENCE-BRIDGE-ROADMAP.md) |
| Decision intelligence | [Enterprise Decision Intelligence Layer](architecture/ENTERPRISE-DECISION-INTELLIGENCE-DESIGN.md) |
| Executive evidence cockpit | [Executive Evidence Cockpit and Metric Ledger](architecture/EXECUTIVE-EVIDENCE-COCKPIT-DESIGN.md) |
| Enterprise Operating System intelligence | [Integrated Operating System Intelligence](architecture/ENTERPRISE-OPERATING-SYSTEM-INTELLIGENCE-DESIGN.md) — Knowledge Graph, governed metric quality/readiness, human objectives/KRs/decision memory, scenario preparation, evidence links, source-contract and copilot readiness. |
| Operating System Validation Program | [Validation Program Design](architecture/OPERATING-SYSTEM-VALIDATION-PROGRAM-DESIGN.md) — structural benchmark posture, human-recorded validation, reviewed snapshots, metric trust, replay, explicit paths, collection/privacy gates, and no-effect boundary. |
| Production hardening maturity program | [Gate 1 Production Hardening](architecture/GATE-1-PRODUCTION-HARDENING-DESIGN.md) and [Gate 1 Operations Runbook](platform/GATE-1-OPERATIONS-RUNBOOK.md) — successive gates, liveness/readiness, request correlation, bounded logs, rate-limit limits, security headers, safe failure triage, recovery ownership, capacity-test scope, and exit criteria. |
| Adoption and operator validation maturity program | [Gate 2 Adoption and Operator Validation](architecture/GATE-2-ADOPTION-VALIDATION-DESIGN.md) — role-aware onboarding, bounded task journeys, consent/pseudonym rules, facilitator/verifier separation, recovery guidance, limited observations, and Gate 2 exit evidence. |
| External evidence acquisition maturity program | [Gate 3 GitHub Evidence Acquisition](architecture/GATE-3-GITHUB-EVIDENCE-ACQUISITION-DESIGN.md), [Gate 3 GitHub Evidence Runbook](platform/GATE-3-GITHUB-EVIDENCE-RUNBOOK.md), and [GitHub Source Notes](research/GITHUB-EVIDENCE-ACQUISITION-SOURCE-NOTES.md) — tenant-scoped connection lifecycle, one bounded read-only source, filtered raw/versioned evidence, human review, revocation/retention boundary, provider behavior, and deferred webhook/scheduling/deletion controls. |
| Inventory and costing | [Costing Engine Foundation](architecture/COSTING-ENGINE-FOUNDATION-DESIGN.md), [Valuation Review](architecture/READ-ONLY-INVENTORY-VALUATION-REVIEW-DESIGN.md), [Canonical Item Profile](architecture/CANONICAL-ITEM-MASTER-PROFILE-DESIGN.md) |
| Operating controls | [Invoice-to-Payment Control](architecture/INVOICE-TO-PAYMENT-CONTROL-DESIGN.md), [Visual Automation Workbench](architecture/VISUAL-AUTOMATION-WORKBENCH-DESIGN.md), [Asia Operating Coverage](architecture/ASIA-OPERATING-COVERAGE-AND-ROLLOUT.md) |
| Decisions | [Architecture Decision Records](adr/) |

## Capability truth register

| Capability | Current posture | Do not infer |
| --- | --- | --- |
| Inventory operations and CREB | Tenant-scoped retained operational evidence and a read-only Resource projection. | A second inventory ledger, automatic correction, unit conversion, inventory valuation, or COGS. |
| Procurement, sales, invoices, aging, three-way match, and internal payment records | Controlled internal records and evidence; matching/aging are retained-evidence views. | Payment execution, collections, supplier communication, shipment, or external settlement. |
| Accounting evidence, journal proposals, and reporting | Immutable evidence and controlled read/proposal paths are present. | Automatic posting, an authoritative general ledger, formal financial statements, or statutory reporting. |
| Costing Engine | Immutable layers and deterministic, read-only evidence/preview controls are present. | Financial valuation, layer consumption, COGS, or accounting effects. |
| Payroll and tax | Indonesia candidate-source evidence pack is retained. | Qualified review, calculated payroll, compliance validation, filing, or production use. |
| COEB | Tenant-scoped, read-only retained-evidence projection for invoices and commitments in Cash Control. | A payable/receivable/commitment system of record, automatic correction, payment execution, journal/posting, treasury function, or external settlement. |
| Enterprise Decision Intelligence | Tenant-scoped, request-time, read-only metric catalog with 219 visible definitions, observed evidence-backed values, lineage, and data-gap collection paths. | A data warehouse, third-party collector, telemetry pipeline, scheduled refresh, financial statement, valuation, recommendation engine, autonomous action, or external transmission. |
| Enterprise Operating System intelligence | Tenant-scoped Knowledge Graph plus human-governed planning, decision-memory, scenario, explicit evidence-link, and source-contract readiness records. | Inferred relationships or causality, forecast/scenario computation, AI invocation, external collection, recommendation/decision execution, capital allocation, posting, payment, payroll, tax, filing, or external effects. |
| Operating System Validation Program | Tenant-scoped structural benchmark posture, human-recorded/reviewed validation observations, metric-trust disclosure, decision replay, explicit evidence paths, strategy linkage, and engineering/source-collection readiness. | Automatic telemetry, adoption/ROI claims, causal inference, forecast/scenario calculation, business-quality certification, recommendation, decision execution, financial/payroll effect, external collection, or external action. |
| Gate 1 Operations Reliability | Tenant-gated request-time liveness/readiness, correlation IDs, bounded completion logs, browser-facing hardening headers, per-process API rate-limit refusal, local-only capacity harness, and explicit maturity gaps. | A telemetry/alerting/tracing service, distributed edge protection, uptime/SLO/error-budget result, backup/restore service, recovery drill, production capacity result, financial/payroll effect, or external action. |
| Gate 2 Adoption & Operator Validation | Tenant-scoped role-aware orientation, bounded journeys/recovery guidance, consent-confirmed human study protocols, pseudonymous facilitator-recorded task observations, and separate leader review. | Automatic behavior telemetry, clickstream/session replay, identity profiling, adoption/satisfaction/ROI claim, production readiness, payroll activation, financial effect, AI, integration, or external action. |
| Gate 3 GitHub External Evidence | Tenant-scoped GitHub source lifecycle, server-only credential reference, human-triggered bounded metadata acquisition, filtered raw/versioned evidence, normalized read projection, explicit graph/readiness linkage, and separate review/revocation. | Credential exposure, webhook, scheduler, polling/retry worker, GitHub mutation, source completeness/quality claim, automatic ERP-truth/metric conversion, recommendation, financial/payroll effect, or external action beyond the human-triggered read-only request. |

## Contribution and review path

Read the related architecture record before changing a bounded context. Make additive, tenant-scoped, evidence-backed changes; write focused tests; run `pnpm check`, `pnpm test`, `pnpm test:integration`, `pnpm contracts:validate`, `pnpm verify:foundation`, and `pnpm build`; record actual results in Validation Notes; then save a reviewable checkpoint. Schema changes require a Drizzle migration, reviewed TiDB-safe SQL, application, and physical verification before any capability may claim persistence support.

## Payroll gate

The Indonesian payroll evidence pack is **draft-only, inactive, unreviewed, unselected, and blocked**. No payroll calculation, rehearsal, activation, production use, payment, compliance assertion, or statutory filing can be represented until a qualified Indonesian payroll/tax reviewer provides a written, effective-dated review identifying the exact source versions, approved worker scope, supported payroll cadence, limitations, and explicit authorization. See [Indonesia Payroll Draft Evidence Pack](compliance/INDONESIA-PAYROLL-DRAFT-EVIDENCE-PACK.md).
