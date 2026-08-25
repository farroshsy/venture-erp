# Indonesia Payroll Draft Evidence Pack

> **Status: DRAFT — NOT REVIEWED, NOT APPROVED, NOT ACTIVE, AND NOT ELIGIBLE FOR PAYROLL CALCULATION.**
>
> This is a research handoff for a **qualified Indonesian payroll or tax reviewer**. It does not contain derived rates, thresholds, wage caps, tax tables, or an opinion on compliance. It must not be selected for the payroll purpose, used to calculate a payroll run, used to make a payment, or used to submit a filing until the reviewer completes the approval fields below.

## Scope and proposed use

| Field | Draft value |
|---|---|
| Jurisdiction | Indonesia (`ID`) |
| Proposed pack key | `ID-PAYROLL-DRAFT-EVIDENCE-2026` |
| Proposed effective date | **Unassigned — reviewer must set** |
| Worker/cadence applicability | **Unassigned — reviewer must specify** |
| Intended system purpose | Evidence review only; not payroll calculation or statutory operation |
| Pack status | Draft only |

## Official-source register

| Topic | Official source | What it supports | Reviewer validation still required |
|---|---|---|---|
| Income-tax withholding process | [Directorate General of Taxes — Withholding Article 21 Tax][1] | Identifies employers as Article 21 withholding agents and describes withholding, receipt, payment, and filing responsibilities. | Current governing regulation, effective period, employee/worker classification treatment, withholding method, tax tables, thresholds, forms, and filing cadence. |
| Employment social-security coverage | [BPJS Ketenagakerjaan — Wage Recipient Workers Benefit][2] | Identifies wage-recipient worker programs, contribution calculation, payment, registration, and participation evidence as official topics. | Program applicability, employer/worker allocations, risk categories, rate and wage-base tables, caps, registration dependencies, and payment deadline. |
| National health social security | [BPJS Kesehatan — official service portal][3] | Identifies BPJS Kesehatan as the official JKN administrator and distinguishes wage-recipient worker participation categories. | Employer-specific participation scope, current contribution basis, caps, family/member treatment, enrollment state, and remittance process. |

## Required reviewer decisions

The reviewer must resolve the following points in writing before the pack can move from draft to reviewed or approved. Every decision must cite the effective legal or administrator source, identify the applicable worker population, and record the reviewer’s name, credentials, date, and review basis.

| Decision area | Reviewer must supply |
|---|---|
| Legal effective period | Effective-from and effective-to dates, including transition handling. |
| Worker classification | Included and excluded worker categories, resident/non-resident handling, and public/private-sector applicability. |
| Earnings basis | Included earnings, exclusions, taxable treatment, social-security basis, caps, floors, and proration rules. |
| PPh Article 21 | Current calculation method, parameters, withholding records, payment and filing workflow, and exception handling. |
| BPJS Ketenagakerjaan | Applicable programs, contribution allocation, risk classifications, wage bases, caps, registration, and remittance evidence. |
| BPJS Kesehatan | Participation category, contribution basis/allocation, caps, enrollment dependencies, and remittance evidence. |
| Payroll calendar | Cadence, period cut-off, pay date, holiday handling, correction/reversal procedure, and evidence retention. |
| System mapping | Approved input fields, validation rules, audit events, and test cases. No live payment or filing integration is authorized by this draft. |

## Approval record — intentionally blank

| Field | Required reviewer entry |
|---|---|
| Qualified reviewer name and organization |  |
| Credentials / local payroll qualification |  |
| Review date |  |
| Legal source versions verified |  |
| Effective date range approved |  |
| Worker/cadence scope approved |  |
| Explicit approval for system pack selection |  |
| Test evidence reference |  |
| Reviewer signature / attestation reference |  |

## System-control boundary

Until all approval fields are completed and the pack is explicitly reviewed, approved, and selected for the payroll purpose in an authorized venture, Venture ERP must retain the payroll rehearsal block. The implemented preflight may display missing evidence, but it cannot create a payroll run, calculate compensation, execute payment, submit a tax/statutory filing, or assert compliance.

## References

[1]: https://www.pajak.go.id/en/withholding-article-21-tax "Direktorat Jenderal Pajak — Withholding Article 21 Tax"
[2]: https://www.bpjsketenagakerjaan.go.id/en/penerima-upah.html "BPJS Ketenagakerjaan — Wage Recipient Workers Benefit"
[3]: https://www.bpjs-kesehatan.go.id/ "BPJS Kesehatan — Official Portal"
