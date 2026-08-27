# Gate 2 — Adoption and Operator Validation Design

**Status:** Authorized implementation increment; adoption readiness is not production readiness.
**Owner:** Platform Engineering with a designated human facilitator and a different human verifier.
**Scope:** Tenant-scoped, consent-aware, human-recorded observation of predefined internal Venture ERP journeys. It does not instrument every user session or create product analytics.

## Purpose

Gate 2 asks a narrower question than feature completion: can a participant who did not build the system understand the evidence posture, complete a bounded authorized task, recover safely from a refusal, and leave a reviewable observation without developer intervention? NIST characterizes usability testing as representative users performing representative tasks, with quantitative evidence such as time on task, errors, and successful completion, alongside qualitative observations.[1] This program adopts that bounded approach without claiming broad usability, adoption, satisfaction, business value, or production fitness from a small or unverified sample.

## Governing interpretation

| Term | Meaning in Gate 2 | Explicit non-meaning |
|---|---|---|
| **Adoption evidence** | A human-recorded, consent-confirmed observation for a predefined journey in a specific venture and session. | Automatic clickstream, employee monitoring, product analytics, or proof that all users can operate the product. |
| **Independent participant** | A person not involved in building the tested feature, recorded only through a pseudonymous participant reference. | A claim of demographic representativeness, statistical significance, or external certification. |
| **Unassisted completion** | A facilitator records that the participant completed the stated internal journey without task-direction assistance. | Proof of production correctness, compliance, business outcome, or user satisfaction. |
| **Duration** | A facilitator-recorded start/end interval for one stated task. | Automatically collected behavioral telemetry or a productivity benchmark without a defined comparison. |
| **Verified observation** | A different authorized reviewer accepted that the record follows the protocol and includes its stated evidence/limitations. | Attestation that the participant’s report is objectively correct or that a result is generalizable. |

> A verified adoption observation demonstrates only that a differently reviewed human record exists for the declared session and protocol. It does **not** establish product-market fit, ROI, legal compliance, data accuracy, security, SLO attainment, or a causal effect.

## Measurement protocol

The study model uses human-recorded, per-task observations rather than automatic behavior capture. Before an observation is recorded, the facilitator must confirm that participation is voluntary, the purpose and recording method were explained, the participant may stop, and a pseudonymous reference—not a name, email, manager, or free-form personal profile—is used. This follows the practical safeguards in Columbia’s usability-test guidance, including voluntary participation, ability to stop, no task demonstration before testing, time-on-task disclosure, and non-attributable reporting.[2]

| Protocol step | Required retained evidence | Guardrail |
|---|---|---|
| Define study | Purpose, role lens, allowed journey catalog, consent statement, limitations, protocol version, and draft/approved lifecycle. | A different authorized human approves the study before it is used for a verified release conclusion. |
| Recruit | Pseudonymous participant reference and declared independence posture. | Do not retain identity, manager, demographics, video, audio, screen capture, cookies, clickstream, or sensitive attributes. |
| Run task | Journey key, role lens, task statement, start/end timestamps entered by the facilitator, and observed outcome. | The participant receives the task but not a walkthrough of the target flow. The facilitator must not use the record to bypass roles, approvals, or evidence gates. |
| Record friction | Assistance count, error/retry count, help usage, evidence-gap encounter, refusal/recovery posture, optional participant feedback, and limitations. | Free text must not include credentials, personal data, confidential business content, or unsupported causal claims. |
| Verify | A different authorized human verifies or rejects the recorded observation. | Self-verification is refused. Verification is protocol/evidence review, not a usability-certification decision. |
| Interpret | Aggregates show only observed records and denominator/gap disclosure. | No adoption score or success-rate claim appears without real retained and verified observations. |

## Initial journey catalog

The catalog deliberately uses existing tenant-scoped controls. No journey creates data merely for the test, enables an external integration, posts an accounting-engine journal, calculates payroll/tax, sends a payment, files a report, or changes a regulated state.

| Journey key | Intended role lens | Bounded task and evidence path | Common safe recovery topic |
|---|---|---|---|
| `procurement_evidence` | Operator / finance lead | Review procurement request, approved PO, receipt evidence, and the guarded accounting-proposal explanation. | Required source evidence unavailable or record is not eligible. |
| `sales_fulfillment_evidence` | Operator | Review approved sales, reservation, fulfillment, and retained audit evidence. | Insufficient inventory or blocked lifecycle state. |
| `payable_match` | Finance lead / approver | Inspect payable invoice, three-way-match state, mismatch explanation, and internal approval control. | Match mismatch or finance permission refusal. |
| `work_lifecycle` | Operator | Locate and progress an authorized project, task, service, or asset record through its existing human-gated lifecycle. | Rejected workflow or stale/ineligible state. |
| `decision_lineage` | Executive / auditor | Follow a metric or priority signal through lineage, Knowledge Graph, decision memory, and explicit evidence links. | Missing evidence link or unmodeled metric. |
| `audit_traceability` | Auditor | Trace one retained operational outcome back to retained source/audit evidence without changing it. | Missing evidence or access refusal. |
| `payroll_blocker_comprehension` | Any active role | Identify why Indonesian payroll remains unavailable and the written reviewer evidence required to change that state. | Required legal-review prerequisite unavailable. |

## Role-aware orientation

The onboarding surface must show only the active venture, the person’s existing membership role, its safe starting points, how to distinguish live retained evidence from draft/simulation/blocked states, and how to open the Workspace Guide. It cannot grant roles, infer qualifications, or hide an authorization refusal. The six study lenses map to existing venture roles and responsibilities; they are guidance labels, not a new access-control system.

| Role lens | First useful route | Intended focus | Must remain visible |
|---|---|---|---|
| Operator | Operations, Procurement, Sales, Work | Authorized internal-record lifecycle and evidence. | Approval, inventory, workflow, and source-evidence limits. |
| Finance lead | Cash, Journal, Finance Reporting | Match/evidence/rule review under finance controls. | No automatic journal posting, payment, tax, payroll, or formal-statement claim. |
| Approver | Automation, Cash, Decision Governance | Human review and refusal rationale. | The approver does not obtain an automatic execution path. |
| Auditor | Knowledge Graph, Validation, Adoption | Retained source-to-outcome traceability and record verification. | Explicit gaps and absence of inferred links. |
| Executive | Intelligence, Operating System, Validation | Evidence posture, decision replay, strategic linkage, and gaps. | No causal, ROI, forecast, or recommendation conclusion. |
| Administrator | Access Administration, Reliability, Workspace Guide | Scoped access, platform evidence, and safe escalation path. | No impersonation, user monitoring, or automatic recovery action. |

## Data model and access control

Two additive tenant-scoped tables are required: `eos_adoption_studies` stores the approved protocol and consent/limitation context; `eos_adoption_observations` stores one human-entered task record. The observation is not a browser event. It includes only pseudonymous participant reference, declared role/journey, facilitator-entered start/end times, categorical outcome, bounded friction counts/flags, optional feedback/notes, evidence reference, and limitations.

All active venture members may inspect the journey/recovery guidance and aggregate read model for their selected venture. Existing `portfolio_admin` and `venture_lead` memberships may create study drafts and record a facilitator observation. The creator cannot approve the study they authored or verify their own observation; a different authorized leader must approve/verify or reject it. This reuses the Validation Program’s established maker/checker posture and does not alter business-domain roles or permissions.

## What Gate 2 does not do

Gate 2 does not activate browser telemetry, click tracking, session replay, screen/audio/video recording, performance monitoring, external analytics, automatic abandonment detection, behavioral profiling, surveys sent to users, AI interpretation, recommendations, activity scoring, workforce monitoring, identity enrichment, or an integration. It does not establish an adoption percentage until real human-recorded observations exist, and it does not create, alter, post, approve, reverse, or execute an operational, financial, inventory, payment, tax, payroll, filing, regulatory, external, or autonomous action.

The Indonesian payroll pack remains **draft, inactive, unreviewed, unselected, and blocked**. The payroll-blocker journey is an explanation test only; it cannot calculate, rehearse, activate, or validate payroll without qualified written reviewer evidence.

## Gate 2 exit evidence

The implementation checkpoint enables a governed protocol and evidence register. Passing Gate 2 later requires a separately retained release benchmark based on real independent participant observations, named scope/denominator, verified results, recorded limitations, role/journey coverage, documented unresolved friction, and explicit owner sign-off. It remains distinct from production reliability, recovery, capacity, SLO, security certification, integration, AI, and commercial-readiness gates.

## References

[1] [National Institute of Standards and Technology, “Usability Testing”](https://www.nist.gov/programs-projects/usability-testing)

[2] [Columbia University Center of Excellence for Usability and Experience Design, “How to Conduct a Usability Test”](https://usability.cuit.columbia.edu/content/how-conduct-usability-test)
