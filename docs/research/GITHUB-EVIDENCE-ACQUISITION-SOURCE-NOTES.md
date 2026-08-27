# GitHub Evidence Acquisition — Source Notes

**Purpose:** This record preserves provider documentation consulted for the Gate 3 GitHub evidence-acquisition design. It is not authorization to connect a repository, ingest data, retain data, configure a webhook, or convert GitHub records into ERP truth.

## Retained provider facts

| Topic | Provider guidance retained for the design | Gate 3 consequence |
|---|---|---|
| REST interface and versioning | GitHub documents a REST API, an OpenAPI description, authentication guidance, pagination, rate-limit guidance, and a documented API-version header.[1] | The connector must be server-side, include a documented API version/User-Agent, retain the applied source schema/API version, and treat unknown payload fields as unmodeled—not inferred. |
| Incremental retrieval | GitHub cautions that list endpoints paginate and commonly return 30 results by default unless callers follow pagination.[2] | An acquisition run must retain its cursor/page boundary, page count, and incomplete/failed status; it must never label one default page as a complete repository history. |
| Rate limits and retry | GitHub publishes authenticated REST primary limits, response headers, secondary-limit constraints, and `Retry-After`/reset guidance. It advises callers to pause rather than continuing when limited.[3] | The first connector stays small and read-only, captures returned rate-limit metadata, refuses concurrent/background refresh, and retains a visible retry-not-before fact instead of immediate blind retries. |
| Authentication failures | GitHub notes that private resources may return `404` when authentication is absent/insufficient and identifies permission/repository-access checks as the remedy.[4] | Connection validation must return a bounded status; it must not disclose a private repository to unaffiliated users or treat `404` as “source deleted.” |
| Webhooks | GitHub documents repository/organization/app webhook delivery, webhook secrets for delivery validation, and short-lived delivery history. It states GitHub does not automatically redeliver failed deliveries.[5] | Webhook ingestion is a deferred, separately approved follow-up. The first Gate 3 checkpoint uses a human-triggered bounded pull; it must not create a webhook or background listener. |

## Explicitly deferred provider capabilities

No GitHub App, OAuth app, webhook, repository write, issue/PR/commit/release mutation, polling, scheduled refresh, automatic retry runner, external notification, or data-deletion claim is enabled by these notes. A future webhook phase requires provider-secret validation, idempotency on delivery identity, explicit retry/dead-letter policy, operating ownership, and a hosting posture appropriate for an internet-facing listener.

## References

[1] [GitHub Docs — REST API documentation](https://docs.github.com/en/rest)

[2] [GitHub Docs — Troubleshooting the REST API: Missing results](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#missing-results)

[3] [GitHub Docs — Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

[4] [GitHub Docs — Troubleshooting the REST API: 404 Not Found for an existing resource](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#404-not-found-for-an-existing-resource)

[5] [GitHub Docs — Webhooks documentation](https://docs.github.com/en/webhooks)
