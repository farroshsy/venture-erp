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

## Payroll/tax review

> **Status: Not yet approved by a qualified Indonesian payroll/tax reviewer.**
>
> **Effective date:** N/A — approval pending. **Reviewer:** N/A. **Scope:** N/A.

The venture must not represent this draft, its payroll configuration, or any calculation as legally validated. Before production use, a qualified Indonesian payroll/tax professional—such as an appropriately qualified Indonesian tax consultant, Brevet-certified practitioner, or CPA with relevant Indonesian payroll-tax expertise—must provide written review. The review must state its effective date, the rules confirmed (including PPh Article 21 and applicable BPJS obligations), authorized worker classifications, approved payroll cadence, exclusions, assumptions, and jurisdictional limitations.

### Source-placeholder note

The regulations listed in this document are authoritative government publications retained as **candidate references for the future qualified reviewer**. They do not constitute reviewer approval and do not authorize payroll calculation, payroll rehearsal, compliance use, pack activation, or payroll-purpose selection. PMK 168/2023 is the documented implementation framework candidate for PPh Article 21/26 administration and explicitly cites PP 58/2023, the government regulation concerning PPh Article 21 withholding rates.[2] [3] The reviewer must confirm the approved source versions, effective periods, worker scope, and cadence before any pack can be reviewed or approved.

### Structured current approval state

| Field | Current value |
|---|---|
| `review_status.approved` | `false` |
| Reviewer | `null` / none assigned |
| Effective date of approval | `null` / not approved |
| Written approval | Not obtained |
| Authorized worker scope | None approved |
| Authorized payroll cadence | None approved |
| Approved source versions | None approved by a reviewer |
| Authorization for payroll calculation or rehearsal | **Not granted** |

## Official-source register

| Topic | Official source | What it supports | Reviewer validation still required |
|---|---|---|---|
| Income-tax withholding process | [Directorate General of Taxes — Withholding Article 21 Tax][1] | Identifies employers as Article 21 withholding agents and describes withholding, receipt, payment, and filing responsibilities. | Current governing regulation, effective period, employee/worker classification treatment, withholding method, tax tables, thresholds, forms, and filing cadence. |
| PPh Article 21/26 technical administration | [Ministry of Finance Legal Information Network — PMK 168/2023][2] | The official JDIH page identifies PMK 168/2023 as a Ministry of Finance regulation on the implementation of income-tax withholding for work, services, or individual activities, and displays it as in force at review. | Applicability to the venture, source-version confirmation, effective period, parameter mapping, worker treatment, tax tables/thresholds, and transition handling. |
| PPh Article 21 withholding-rate framework | [Ministry of Finance Legal Information Network — PP 58/2023][3] | The official record identifies PP 58/2023 as the regulation concerning PPh Article 21 withholding rates for income related to work, services, or individual activities. | All effective-rate parameters, applicability, categories, transition handling, and configuration mapping. No rate is transcribed or made executable in this draft. |
| Employment social-security coverage | [BPJS Ketenagakerjaan — Wage Recipient Workers Benefit][4] | Identifies wage-recipient worker programs, contribution calculation, payment, registration, and participation evidence as official topics. | Program applicability, employer/worker allocations, risk categories, rate and wage-base tables, caps, registration dependencies, and payment deadline. |
| National health social security | [BPJS Kesehatan — official service portal][5] | Identifies BPJS Kesehatan as the official JKN administrator and distinguishes wage-recipient worker participation categories. | Employer-specific participation scope, current contribution basis, caps, family/member treatment, enrollment state, and remittance process. |

### Superseded-source handling

The user-supplied DJP technical regulation page for **PER-31/PJ/2009** is retained below solely as historical research context. The official DJP page identifies its status as amended/refined and **revoked**.[6] It is therefore **not** a current source for executable payroll configuration or reviewer approval; the qualified reviewer must validate the currently applicable legal source set, including PMK 168/2023 and any subsequently effective rules.

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
[2]: https://jdih.kemenkeu.go.id/dok/pmk-168-tahun-2023 "JDIH Kementerian Keuangan — PMK 168 Tahun 2023"
[3]: https://jdih.kemenkeu.go.id/dok/pp-58-tahun-2023 "JDIH Kementerian Keuangan — PP 58 Tahun 2023"
[4]: https://www.bpjsketenagakerjaan.go.id/en/penerima-upah.html "BPJS Ketenagakerjaan — Wage Recipient Workers Benefit"
[5]: https://www.bpjs-kesehatan.go.id/ "BPJS Kesehatan — Official Portal"
[6]: https://stats.pajak.go.id/id/peraturan/pedoman-teknis-tata-cara-pemotongan-penyetoran-dan-pelaporan-pajak-penghasilan-pasal-21-1 "DJP — PER-31/PJ/2009 (historical; official page marks it revoked)"
