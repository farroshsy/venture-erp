# Asia Jurisdiction-Pack and Integration Design

## Design decision

The platform will introduce a **shared reference-data and control layer** rather than separate country forks. Every configurable legal or integration rule has four scopes: a portfolio-wide default, a venture selection, a jurisdiction pack, and an effective date. A transaction records the chosen rule version and source reference, allowing historical reconstruction even after a pack changes.

## Shared data model

| Aggregate | Key fields | Ownership and control |
|---|---|---|
| `jurisdiction_pack` | Country/region code, pack version, status, effective dates, reviewer, source links, test evidence. | Platform Compliance. Only reviewed/approved versions can be selected by a venture. |
| `currency_profile` | ISO code, decimal precision, display symbol, active state. | Finance Platform. Reference data only; no exchange rate assumption. |
| `exchange_rate` | Source currency, target currency, rate date, rate, source, approval reference. | Finance. A posting retains its rate snapshot. |
| `budget_node` | Parent node, level, code, fund/program/project classification, appropriation amount, committed/spent values. | Public-sector Budgeting. Hierarchy is generic; authority semantics remain pack-specific. |
| `payroll_calendar` | Cadence, pay period, worker category, country pack, status. | People/Payroll. Calendars cannot use a pack outside the venture’s approved selection. |
| `payroll_run` | Calendar, period, currency, status, component input, policy versions, calculation evidence. | People/Payroll. A proposal remains unapproved until workflow approval. |
| `integration_connection` | Adapter family, provider, sandbox endpoint reference, status, owner, health, last test, contract version. | Integration Platform. No secret or production endpoint is stored in application records. |

## Currency model

Every document receives a transaction currency. A venture has a functional currency and may define one or more reporting currencies. Posting logic converts only through a selected exchange-rate record and stores both source and converted amounts. The first supported regional reference profile is IDR, SGD, MYR, JPY, KRW, CNY, TWD, and HKD, while the registry remains open to any valid ISO code.

## Public-sector model

Budget nodes model a parent-child hierarchy with levels such as national, state/provincial, municipal/local, agency, fund, program, project, and cost center. A document’s budget check walks ancestors and evaluates a generic available balance. A jurisdiction pack can add local classifications and thresholds, but it cannot bypass audit, approval, or historical policy-version capture.

## Payroll model

Payroll calendars select a cadence and worker population. A run collects input components, uses the selected legal-pack version and calculation policy, produces an evidence-rich proposal, then enters a BPMN-style approval workflow. The shared engine supports rate, table, threshold, fixed amount, capped contribution, employer contribution, employee contribution, and rounding-rule primitives. Country-specific tables stay inside reviewed pack configuration, not source code.

## Sandbox adapter model

The initial adapters are **contract-first simulations**. They record capability, configuration completeness, endpoint classification, test timestamp, response contract version, and health. They never use an account or API token until a later secret configuration and security review have approved it. Banking, attendance, e-invoicing, POS, tax filing, statutory reporting, HRIS, and procurement are all supported adapter families.

```text
Operational document
   ├── chosen jurisdiction pack + version
   ├── transaction / functional / reporting currency
   ├── policy and exchange-rate evidence
   ├── budget hierarchy check
   ├── payroll or tax calculation proposal (when applicable)
   └── BPMN approval + immutable audit event

Sandbox adapter registry
   ├── provider contract metadata
   ├── health and test evidence
   └── explicit approval gate before production connectivity
```

## Rejected alternatives

| Alternative | Why it was rejected |
|---|---|
| One global tax/payroll table | It cannot represent worker eligibility, local tables, effective dates, or rounding rules safely. |
| Country-specific code branches in the transaction service | It would create untestable divergence and prevent independent pack review. |
| Direct connection to banks or authorities during feature development | It is irreversible, cannot be safely exercised with synthetic business records, and violates the sandbox-first control posture. |
| A single public-sector budget field | It cannot represent appropriation hierarchy, program controls, or auditable transfers. |
