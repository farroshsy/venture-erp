# Gate 3 GitHub Evidence Runbook

**Status:** Operational guidance for the implemented, manual, bounded, read-only GitHub evidence connector. It does not certify source completeness, credential security, provider availability, retention compliance, engineering performance, business value, or Gate 3 exit readiness.

## Before a source request

Use only an active venture and a repository the venture is authorized to inspect. The selected credential is server-only, repository-scoped, read-only, and referenced as `GITHUB_EVIDENCE_TOKEN`; it must never appear in a form field, evidence reference, issue title, note, log, screenshot, document, or chat message. The first source scope supports only GitHub repository metadata, issue metadata, pull-request metadata, commit metadata, and release metadata. Issue bodies, patches, file contents, email fields, and similar high-risk payload fields are removed before raw evidence retention.

| Required record | Owner | What to inspect | Do not infer |
|---|---|---|---|
| Draft source connection | Portfolio administrator or venture lead | Exact owner/repository, selected resource types, classification, authorization reference, retention statement, deletion procedure, revocation procedure, limitations. | A configured server credential is authorization to collect. |
| Validation snapshot | Authorized connection creator/validator | A bounded repository metadata response, provider API version, returned rate-limit facts, source identity, timestamp, and absence of credential material. | A successful instant check proves ongoing access or source completeness. |
| Separate authorization | A different portfolio administrator or venture lead | The validation snapshot and every declared source/policy field. | A creator may self-authorize, or one tenant’s approval applies to another tenant. |
| Explicit activation | Authorized leader | Status is `authorized`, scope remains unchanged, and the intended source is still correct. | Activation starts a background sync, webhook, or scheduled refresh. |

## Safe manual acquisition

In **External Evidence**, select one active connection and request only selected resources within that connection’s declared scope. Enter a per-resource limit of 1–25. The service makes at most one page request for each selected class in that single human-triggered action. It records the requested scope, page limit, provider API version, rate-limit headers, retained/refused/duplicate counts, and a next-page cursor boundary. It does not automatically follow the cursor.

> **A partial result is evidence of an incomplete bounded request, not a source-completeness failure or success.**

If the provider returns a rate-limit result or `Retry-After`, retain the run’s failure/partial posture and retry-not-before fact. Do not repeatedly press the action, start a manual loop, or create an ad-hoc schedule. GitHub documents rate-limit and retry guidance for the REST API; the connector follows that evidence boundary but does not operate an automatic retry system.[1]

## Review, reconciliation, and revocation

Each retained evidence version includes provider object ID/URL, source timestamp when supplied, received time, provider API version, raw-payload hash, source-version hash, filtered raw payload, and a deterministic normalized projection. A reviewer who did **not** request the acquisition may record one `reviewed` or `rejected` decision with rationale. That review preserves the raw evidence; it does not correct GitHub, edit an ERP record, calculate a metric, create a recommendation, or establish a causal claim.

Reconciliation is limited to the retained source-connection/run/evidence foreign-key path and deterministic projection identity/version checks. It is not financial reconciliation, cannot repair source data, and does not confer ERP-truth status.

To stop collection, use **Revoke future acquisition**. Revocation prevents later validation/acquisition under that connection and retains the reason/audit state. It does not delete data automatically. A deletion request must follow the connection’s declared deletion procedure and a separately approved destructive-workflow design; this increment has no automatic or user-facing evidence-purge function.

## Incident and refusal handling

| Observed condition | Safe response | Boundary |
|---|---|---|
| `404` or access refusal | Confirm the exact repository and fine-grained token scope with the source owner. Retain/inspect the bounded run error; do not disclose private repository details to an unaffiliated user. | GitHub can use `404` for inaccessible private resources; it is not proof that the repository was deleted.[2] |
| Rate limited | Observe `retryNotBefore` and returned rate-limit facts. Wait until the stated time and seek source-owner guidance for any future frequency policy. | No automatic retry, fan-out, polling, or schedule exists. |
| Source scope is wrong | Revoke/suspend the connection, retain the limitation, and use a separately reviewed new connection configuration. | Do not widen selected resource scope in an active connection by inference. |
| Evidence has sensitive/unwanted content | Stop new acquisition through revocation, preserve only the required audit path, and follow the declared deletion/retention procedure with governance approval. | Do not use console/database access as a casual purge or edit raw evidence. |
| Reviewer rejects evidence | Preserve the review and its rationale, then investigate the original provider object only through a separately authorized bounded request if needed. | Do not overwrite/relabel the raw evidence or treat rejection as a source correction. |

## Deferred operating capabilities

Webhooks, scheduled/incremental polling, automatic retry, dead-letter handling, alerting, GitHub App/OAuth installation, source-content/artifact ingestion, deletion workflows, multi-provider sources, and metric/ERP mappings are **not enabled**. A webhook phase must have a verified listener, signature verification, delivery idempotency, explicit retry/dead-letter retention, operating ownership, and hosting suitable for inbound provider delivery. GitHub’s webhook documentation notes that failed deliveries are not automatically redelivered.[3]

The Indonesian payroll pack remains draft-only, inactive, unreviewed, unselected, and unavailable for calculation, rehearsal, activation, or production until a qualified Indonesian payroll/tax reviewer supplies the required written, effective-dated approval.

## References

[1] [GitHub Docs — Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

[2] [GitHub Docs — Troubleshooting the REST API: 404 Not Found for an existing resource](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#404-not-found-for-an-existing-resource)

[3] [GitHub Docs — Webhooks documentation](https://docs.github.com/en/webhooks)
