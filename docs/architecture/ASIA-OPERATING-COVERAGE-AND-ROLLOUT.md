# Asia Operating Coverage and Rollout Standard

**Status:** Implementation and control boundary, August 2026  
**Owner:** Venture ERP Platform Engineering  
**Scope:** Indonesia, Singapore, Malaysia, Japan, South Korea, China, Taiwan, and Hong Kong

> **Tax and payroll notice:** Venture ERP supplies configurable records, calculation proposals, evidence, approval controls, and sandbox seams. It is **not** a tax determination, remittance, filing, or statutory-reporting engine. **I’m an AI, not a tax professional — verify anything consequential with a CPA or tax professional before filing.** A named local reviewer must approve the effective-dated country pack, and an authorized operator must separately approve any production filing or payment integration.

## 1. Current operating surface

The current release is a usable operational platform, rather than a read-only dashboard. It stores venture-scoped master and operational records, controlled transaction-to-functional-currency conversion, public-budget nodes, payroll calendars and runs, workflow tasks, audit evidence, country-pack selections, sandbox connections, and sandbox-job evidence. The tables below deliberately separate what is executable now from what depends on review, provider credentials, or jurisdiction-specific implementation.

| Operating area | Executable in this release | Control boundary before production use |
|---|---|---|
| Currency and FX | Persists transaction currency, functional currency, approved exchange-rate reference, calculated functional amount, and audit history. The supported initial reference set is IDR, SGD, MYR, JPY, KRW, CNY, TWD, and HKD. | Finance must approve each exchange-rate source and effective rate. No browser-locale inference or automatic market-rate posting occurs. |
| Cross-border finance | Creates a venture-scoped draft record only when its FX evidence is approved and its optional public-budget node belongs to the same venture. | Accounting policy, ledger posting authority, reporting-currency policy, and any payment method remain organization-specific decisions. |
| Public-sector budget | Represents national, state/provincial, municipal/local, agency, fund, program, project, and cost-center nodes, with draft/active/closed state and audit events. | A legal appropriation rule, treasury release path, procurement threshold, and signatory delegation are pack-specific. A selected public-budget pack is required where the node names one. |
| Payroll | Creates payroll calendars for weekly, biweekly, semimonthly, monthly, ad hoc, and off-cycle cadence across employee, director, contractor, temporary, apprentice, expatriate, and public-servant categories. Runs have calculated, pending-approval, approved, rejected, and cancelled controls. | The calculator produces a proposal from explicit components and withholding input. Local tax, contribution, leave, attendance, and payslip rules require an approved and actively selected payroll pack. No payment execution is available. |
| Jurisdiction packs | Stages, reviews, approves, retires, and selects packs by venture and purpose. Pack-dependent payroll and public-budget use requires an approved pack plus an **active selection in the same venture**. | Source links, effective dates, reviewer identity, scenario tests, data-residency assessment, rollback plan, and local finance/compliance approval are mandatory. |
| BPMN-style workflow | Stores definitions, starts instances, creates tasks, records completion, and can link a sandbox job to an approval workflow. | The present implementation is a bounded BPMN-style approval subset. Complex orchestration, timers, human task inboxes, and cross-service events need separately versioned contracts. |
| Sandbox integrations | Registers sandbox contracts for banking, attendance, e-invoicing, POS, tax filing, statutory reporting, HRIS, and procurement; records health simulations; queues and simulates evidence-only jobs. | No live endpoint, credential, fund transfer, government filing, or statutory submission is enabled. Production requires security, provider, legal, and operational readiness review. |

## 2. Country-pack rollout sequencing

The eight-country scope is intentionally **not** a one-switch launch. Shared capabilities are released once, while country behavior is activated only through a reviewed, purpose-specific pack. This approach avoids the false precision of generic tax percentages, but still enables the finance, payroll, budget, workflow, and sandbox work to proceed in parallel.

| Wave | Jurisdictions and purpose | Entry criterion | Exit criterion |
|---|---|---|---|
| 0 — Platform baseline | All eight jurisdictions | Shared operational controls, currency profiles, FX evidence, public-budget hierarchy, payroll lifecycle, and sandbox job registry are tested. | Tenant isolation, role gates, audit trail, migration state, and no-external-transmission policy are verified. |
| 1 — Controlled pilot | One venture and one purpose at a time, selected by the operator | Local finance owner nominates a country and purpose: payroll, public budget, tax calculation rehearsal, or statutory-reporting sandbox. | Draft pack has source links, test scenarios, reviewer, effective date, and rollback path. Only sandbox/rehearsal use is permitted. |
| 2 — Reviewed operating pack | Jurisdiction-purpose pair with local reviewer | The pack passes review; the venture activates the selection for the exact purpose. | Payroll/calendar or public-budget control rejects an unselected or wrong-venture pack; reconciliation evidence is retained. |
| 3 — Production calculation | Explicitly approved country-purpose pair | Finance/compliance owner approves a reviewed pack, control owner, error handling, and reporting policy. | Production calculation may be used, but filing and payment remain separate authorization decisions. |
| 4 — External submission or payment | Provider-specific, jurisdiction-specific adapter | Credential vaulting, sandbox contract test, security review, legal approval, provider acceptance, data-residency review, and cutover/rollback plan are complete. | A separate explicit release approval enables the adapter. This release does **not** include that capability. |

## 3. Country pack minimum source register

Each row identifies an official starting authority for the local reviewer. It is not a claim that the platform encodes every rule from that authority. The reviewer owns the precise scope, effective date, interpretation, evidence, and change history for the pack.

| Jurisdiction | Currency | Official authority starting points | Required local pack domains |
|---|---:|---|---|
| Indonesia | IDR | Directorate General of Taxes (DGT) [1] | Payroll withholding, social contributions, e-invoicing, statutory reporting, local-government budget controls where applicable. |
| Singapore | SGD | Inland Revenue Authority of Singapore (IRAS) and CPF guidance [2] | Employment tax treatment, CPF eligibility, reporting, worker classification, and e-invoice/report integrations where adopted. |
| Malaysia | MYR | Employees Provident Fund (EPF) [3] | EPF, SOCSO/PCB, worker eligibility, payroll schedule, and statutory-reporting evidence. |
| Japan | JPY | National Tax Agency (NTA) [4] | Withholding, social-insurance inputs, pay calendar, local reporting, and data-retention requirements. |
| South Korea | KRW | National Tax Service (NTS) [5] | Year-end settlement inputs, insurance interfaces, reporting, and worker eligibility. |
| China | CNY | State Taxation Administration [6] | Locality-specific tax, social insurance, e-invoicing, data residency, and reporting. |
| Taiwan | TWD | Ministry of Finance eTax service [7] | Withholding, labor/insurance interfaces, e-invoice, employer reporting, and retention. |
| Hong Kong | HKD | Inland Revenue Department (IRD) [8] | Salaries tax, MPF inputs, employer returns, and reporting. |

## 4. Non-negotiable operational controls

An approved pack is not globally portable. Payroll and public-budget flows require an active selection in the same venture and for the matching purpose. This prevents a jurisdiction pack approved for one venture, or selected for tax rehearsal, from silently governing another venture’s payroll or public-budget data.

The following evidence must be retained for every pack-dependent operational decision: the pack version, source links, effective date, reviewer and approver, venture selection, input snapshot or immutable reference, policy result, actor, workflow decision where required, and rollback/supersession relationship. The platform already records core audit and workflow evidence; long-term statutory retention and disclosure rules remain part of each pack’s local operating standard.

## 5. Production readiness gate

Before a country-purpose pair leaves rehearsal, the owner must confirm the following statement in the change record:

> The country pack has been reviewed by a qualified local finance or compliance owner; its legal source links, effective dates, test cases, worker eligibility, payroll/public-budget policy, filing status, provider contract, credentials, data-residency assessment, incident playbook, and rollback path are current. The requested use is limited to the authorized venture and purpose.

This gate protects against a common ERP failure mode: configuring an appealing regional interface before its policy, authority, evidence, and operating responsibility actually exist.

## References

[1] [Directorate General of Taxes, Indonesia — official English portal](https://www.pajak.go.id/en)  
[2] [Inland Revenue Authority of Singapore — CPF contribution tax treatment](https://www.iras.gov.sg/taxes/individual-income-tax/employers/understanding-the-tax-treatment/central-provident-fund-(cpf)-contributions)  
[3] [Employees Provident Fund Malaysia — mandatory employer contribution responsibility](https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution)  
[4] [National Tax Agency Japan — official English information](https://www.nta.go.jp/english/)  
[5] [National Tax Service Korea — official English portal](https://www.nts.go.kr/english/main.do)  
[6] [State Taxation Administration, China — official English portal](https://www.chinatax.gov.cn/eng/)  
[7] [Ministry of Finance, Taiwan — eTax service](https://www.etax.nat.gov.tw/etwmain/etw113w1/eng/ETWmain)  
[8] [Inland Revenue Department, Hong Kong — official portal](https://www.ird.gov.hk/eng/)  
