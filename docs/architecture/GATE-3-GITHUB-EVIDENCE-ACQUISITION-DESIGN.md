# Gate 3 GitHub Evidence Acquisition Design

**Status:** Approved implementation scope for the first Gate 3 increment. This is an evidence-acquisition capability, not a claim that the integration is operating, that source data is complete, that an external record is ERP truth, or that Gate 3 exit evidence has been achieved.

## 1. Objective and bounded source

Gate 3 introduces one deliberately narrow, read-only source: a GitHub repository explicitly authorized for one Venture ERP tenant. The initially proposed repository is `farroshsy/venture-erp`; the persisted connection still requires tenant-local draft, validation, separate human authorization, and activation before any manual acquisition is allowed. The server-only credential passed a lightweight authenticated GitHub user check and a read-only repository metadata check during setup; those checks prove credential access at that moment only. They do not prove production availability, repository completeness, future authorization, or business value.

> **External data enters as evidence first. It never becomes ERP truth automatically.**

The first manual acquisition is limited to repository metadata plus bounded pages of issues, pull requests, commits, and releases. It does not inspect repository contents, artifact bodies, code-scanning/security results, workflows, deployments, personal profile data, organization data, or GitHub administrative data. Repository `Metadata`, `Contents`, `Issues`, and `Pull requests` read permissions were selected to support that bounded scope; no write permission is required.

## 2. Lifecycle and authorization model

| State | Actor and evidence | Permitted operation | Refused operation |
|---|---|---|---|
| `draft` | A portfolio administrator or venture lead supplies exact owner/repository, declared source scope, classification, authorization reference, retention statement, deletion/revocation process, and limitation. | Retain configuration metadata without the credential. | Any acquisition, webhook creation, schedule, source projection, or external write. |
| `validated` | The connection owner requests a bounded server-side repository metadata check. The run retains only status, source identity, provider/API version, rate-limit context, and error posture. | Confirm that the credential can read the declared repository at that instant. | Treat temporary access as durable approval or expose the token. |
| `authorized` | A **different** portfolio administrator or venture lead reviews the draft and validation evidence. | Record human authorization for the declared tenant and repository. | Self-authorization, cross-tenant reuse, or scope expansion. |
| `active` | An authorized connection owner explicitly activates the reviewed connection. | Permit a human-triggered bounded read-only acquisition. | Automatic polling, webhook reception, retry loop, or repository mutation. |
| `suspended` / `revoked` | An authorized leader records a reason and review evidence. | Preserve connection/audit state and already retained evidence subject to the declared retention procedure. | New validation or acquisition. |

Connection configuration stores only a credential **reference** such as `GITHUB_EVIDENCE_TOKEN`; secret material remains server-side configuration and is never sent through tRPC, stored in a table, emitted in logs, or shown by the workspace.

## 3. Evidence-first data model

| Artifact | Required retained facts | Immutability / interpretation |
|---|---|---|
| Source connection | Tenant, provider, exact repository, normalized source URL, declared resource scope, data classification, authorization/retention/deletion/revocation statements, lifecycle, creator/reviewer/activation timestamps. | Configuration lifecycle is auditable; it is not source evidence or source truth. |
| Acquisition run | Tenant/connection, request scope and cursor/page bounds, requested-at/finished-at, provider/API version, rate-limit metadata, accepted/duplicate/refused counts, safe error/retry-not-before posture, requester. | Retained as an operational evidence record. It describes a bounded attempt, not ongoing synchronization. |
| External evidence record | Provider object identity/type/URL, source-update timestamp when supplied, received timestamp, API/schema version, exact raw JSON payload, canonical payload hash, source version hash, validation and normalization posture, run/connection linkage. | Raw payload and hashes are append-only. A changed GitHub object is a new versioned evidence record; it does not overwrite a prior observation. |
| Normalized projection | Minimal provider-neutral identity, state, title/name, actor/login, timestamps, and URL derived from one retained raw payload by a versioned deterministic normalizer. | A convenience projection is subordinate to raw evidence. It is not an ERP master, operational record, journal, metric truth, or decision. |

The service rejects a provider/repository mismatch, unapproved or inactive connection, resource type outside the declared scope, invalid owner/repository syntax, an attempt to persist a response with an unexpected canonical identity, and duplicate source version. It retains a run-level refusal rather than widening the request. No source payload is parsed into financial, payroll, inventory, HR, customer, supplier, tax, accounting, or regulatory data.

## 4. Manual acquisition and provider behavior

An authorized user explicitly starts one bounded run; the server retrieves the documented repository metadata endpoint and at most one configured page per selected resource class. The implementation sends the documented GitHub API-version and user-agent headers, follows only recognized pagination links, retains the requested and next-cursor boundary, and reports incomplete collection as partial instead of complete. GitHub's REST documentation describes versioned authenticated endpoints and pagination; its troubleshooting guidance warns that list endpoints commonly return only 30 results by default.[1] [2]

The run records provider rate-limit response metadata. It does not fan out, start a task queue, schedule follow-up pulls, or make immediate repeat calls. If the provider returns `Retry-After`, exhausted primary-rate headers, or a rate-limit response, the run becomes a retained partial/failed evidence artifact with a visible `retryNotBefore` value. GitHub advises clients to pause until the indicated retry/reset time and to use increasing delays after continuing secondary-limit failures.[3]

## 5. Review, provenance, reconciliation, and intelligence linkage

Raw evidence is visible only through tenant membership. A source reviewer can mark a normalized projection as `reviewed`, `rejected`, or `requires_review`; review never changes raw payload/hash fields. “Reconciliation” means a deterministic consistency check that the normalized projection’s provider ID/type/URL/version hash match the retained raw payload and source connection. It does not reconcile any financial or operational balance and it cannot correct GitHub data.

The Knowledge Graph may project explicit `ExternalEvidence` and `ExternalSourceConnection` nodes plus only exact connection → acquisition-run → evidence-record → normalized-projection edges. Decision Intelligence exposes source readiness/freshness/coverage and missing-data posture only. Neither layer derives a new metric value from GitHub in this increment, creates a priority signal, recommends a decision, or changes a strategic record.

## 6. Retention, revocation, deletion, and privacy

The connection form requires a plain-language retention and deletion/revocation procedure before authorization. Revocation immediately prevents future validation/acquisition requests. It does not silently purge evidence because retention may be needed for auditability and the correct retention basis is tenant-specific. A future destructive deletion feature requires an explicit, separately reviewed policy: records in scope; legal/business basis; retention expiration; owner; irreversible-delete confirmation; relationship/tombstone behavior; and verification evidence. No automatic purge or external provider deletion is included.

The initial connection retains repository engineering evidence from a private repository. It should avoid secrets, repository file contents, credentials, private issue-body content, and personal data outside the selected provider objects. A source owner must review resource selection and data classification before activation. The deployed service should use only the configured server secret; session/account GitHub credentials and local development tokens are not a substitute.

## 7. Deferred capabilities and Gate 3 exit evidence

| Deferred capability | Required future prerequisite |
|---|---|
| Webhooks or event-driven ingestion | Verified webhook endpoint, signature validation secret, idempotent delivery identity, delivery retention/retry/dead-letter handling, incident ownership, and appropriate persistent hosting. GitHub documents webhook delivery/secret validation and notes that failed deliveries are not automatically redelivered.[4] |
| Scheduled or automatic incremental refresh | Separate frequency, rate-limit budget, retry/backoff, monitoring, retention, and operating-owner approval; no hidden scheduler or process loop. |
| More repositories or providers | Separate tenant/source authorization, scoped credential, classification, field/schema review, and migration of source-specific normalizers. |
| Ingestion of code, files, artifact bodies, or sensitive source categories | A field-level data-classification/retention assessment and explicit selection; none is implied by repository metadata access. |
| Evidence deletion | Separately approved irreversible deletion/tombstone workflow and audit/retention evidence. |
| Using GitHub evidence as operational truth or for autonomous action | A separately approved canonical-model mapping, reconciliation policy, human review, authorization, and domain-specific effect control. |

Gate 3 cannot be called passed merely because a repository was connected. Exit evidence requires an authorized tenant connection, a real bounded acquisition, independently reviewed provenance/normalization/reconciliation evidence, coverage/freshness interpretation, revocation exercise, documented retention/deletion decision, and no-effect/integrity proof. The payroll pack remains draft-only, inactive, unreviewed, unselected, and unavailable for calculation, rehearsal, activation, or production until a qualified Indonesian payroll/tax reviewer supplies the required written, effective-dated approval.

## References

[1] [GitHub Docs — REST API documentation](https://docs.github.com/en/rest)

[2] [GitHub Docs — Troubleshooting the REST API: Missing results](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#missing-results)

[3] [GitHub Docs — Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

[4] [GitHub Docs — Webhooks documentation](https://docs.github.com/en/webhooks)
