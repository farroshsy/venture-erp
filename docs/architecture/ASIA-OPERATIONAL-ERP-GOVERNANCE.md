# Asia Operational ERP Governance Model

**Status:** Architecture baseline  
**Scope:** Indonesia, Singapore, Malaysia, Japan, South Korea, China, Taiwan, and Hong Kong

> **Tax and payroll notice:** This platform provides configurable calculation and workflow infrastructure. It is not a tax filing engine or legal determination. A qualified local tax, payroll, and public-sector finance reviewer must approve a jurisdiction pack before any production calculation, remittance, filing, or statutory report relies on it.

## Operating model

Venture ERP will support Asia through **versioned jurisdiction packs**, not by placing country law into generic application code. A pack owns effective-dated tax and contribution tables, worker eligibility rules, pay-item treatment, report mappings, filing-adapter credentials, test cases, local reviewer identity, approval date, and withdrawal/rollback version. The shared ERP provides ledger, workflow, audit, currency, and policy execution primitives; a jurisdiction pack supplies reviewed data and local rules.

| Jurisdiction | Operating currency | Pack status at this release | Required production gate |
|---|---:|---|---|
| Indonesia | IDR | Framework only | Local PPh 21, social security, e-invoicing, and reporting pack review. |
| Singapore | SGD | Framework only | CPF, tax treatment, worker eligibility, and IRAS/reporting review. |
| Malaysia | MYR | Framework only | EPF, SOCSO/PCB, payroll schedule, and reporting review. |
| Japan | JPY | Framework only | Withholding, social insurance, payroll calendar, and local reporting review. |
| South Korea | KRW | Framework only | NTS, insurance, year-end settlement, and reporting review. |
| China | CNY | Framework only | Locality-specific tax, social insurance, e-invoicing, and data-residency review. |
| Taiwan | TWD | Framework only | Withholding, labor/insurance, e-invoice, and reporting review. |
| Hong Kong | HKD | Framework only | Salaries tax, MPF, employer return, and reporting review. |

The Singapore tax authority distinguishes compulsory and voluntary CPF treatment and notes different rules for particular worker statuses, demonstrating why eligibility and effective dating belong in a local pack rather than a global percentage field. [1] Malaysia’s EPF authority similarly publishes contribution responsibilities, rate schedules, worker categories, payment timing, and rounding rules; its examples show why a generic percentage calculator cannot represent every jurisdiction safely. [2] Japan’s NTA and South Korea’s NTS both maintain separate withholding and taxpayer guidance, reinforcing the need for country-owned tax operations. [3] [4]

## Jurisdiction-pack lifecycle

| Stage | Required evidence | Permitted use |
|---|---|---|
| Draft | Configured inputs and author. | Design and local sandbox tests only. |
| Reviewed | Local reviewer, source links, effective dates, test results, and change log. | Non-production calculation rehearsal. |
| Approved | Finance owner, compliance owner, integration security review, and rollback plan. | Production calculation only; filing remains separately authorized. |
| Retired | Superseding pack and remediation path. | Historical reproduction and audit only. |

Every pack change requires an audit event and an effective date. There is no “auto-update legal rate” switch: an automation can stage a change from an authoritative source, but a named reviewer must approve its release.

## Multi-currency policy

The platform separates **transaction currency**, **functional currency**, and **reporting currency**. Amounts are stored with ISO 4217-style currency codes and the source rate, rate date, rate source, and rate approval reference used for conversion. Exchange rates are never silently inferred from a browser locale. A controlled source or sandbox adapter may stage rates; an approved finance policy chooses which source can post entries.

The initial reference scope contains the primary operating currencies in the requested rollout: IDR, SGD, MYR, JPY, KRW, CNY, TWD, and HKD. The design accepts additional ISO currency codes for other Asian operations without creating a claim of country-pack readiness.

## Public-sector budgeting model

The budgeting engine is hierarchical and jurisdiction-neutral. It can represent **national**, **state/provincial**, **municipal/local**, **agency**, **fund**, **program**, **project**, and **cost-center** envelopes. An envelope has an appropriation version, fiscal period, currency, commitment threshold, workflow policy, and audit trail. It does not encode a country’s appropriation law, procurement threshold, or treasury release process until a reviewed public-sector pack supplies it.

| Shared capability | What it does | What remains pack-specific |
|---|---|---|
| Budget hierarchy | Relates appropriations, programs, projects, and cost centers. | Legal classification and appropriation authority. |
| Commitment control | Tests a proposed record against an approved envelope. | Commitment definition, exemptions, and control threshold. |
| Workflow | Routes appropriation, transfer, and exception approvals. | Delegation and legal signatory requirements. |
| Audit evidence | Captures actor, policy version, and decision. | Retention, disclosure, and government-reporting rules. |

## Payroll model

Payroll supports all operating cadences—weekly, biweekly, semimonthly, monthly, ad hoc, and off-cycle—and worker categories such as employee, director, contract worker, temporary worker, apprentice, expatriate, and public servant. Compensation components declare their earning/deduction nature, taxable treatment, eligibility, effective date, and pack ownership. The current calculator produces a transparent **proposal** from supplied components and configurable withholding input; it does not claim statutory payroll compliance until an approved pack is selected.

## Sandbox integration strategy

The integration registry will operate in **sandbox mode by default**. Banking, attendance, e-invoicing, POS, tax filing, statutory reporting, HRIS, and procurement adapters expose the same explicit lifecycle: configured, sandbox-connected, reviewed, approved, suspended, or retired. Credentials will not be embedded in code; a later adapter needs an approved sandbox account, provider contract, IP/data-residency assessment, secret configuration, response schema, error/rollback playbook, and owner.

No action in the current release transfers funds, sends a tax filing, submits a statutory report, or calls a government or banking production endpoint.

## References

[1] [Inland Revenue Authority of Singapore — Central Provident Fund contributions](https://www.iras.gov.sg/taxes/individual-income-tax/employers/understanding-the-tax-treatment/central-provident-fund-(cpf)-contributions)  
[2] [Employees Provident Fund Malaysia — Mandatory employer contributions](https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution)  
[3] [National Tax Agency Japan — Information for taxpayers](https://www.nta.go.jp/english/)  
[4] [National Tax Service Korea — English service portal](https://www.nts.go.kr/english/main.do)
