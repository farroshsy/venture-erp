import { createHash } from "node:crypto";

export const GITHUB_API_VERSION = "2026-03-10";
export const GITHUB_EVIDENCE_NORMALIZER_VERSION = "0.1-github-metadata";
export const githubResourceTypes = ["repository", "issue", "pull_request", "commit", "release"] as const;
export type GitHubResourceType = (typeof githubResourceTypes)[number];

type ProviderFetch = typeof fetch;

export type GitHubRateLimitSnapshot = {
  limit: number | null;
  remaining: number | null;
  used: number | null;
  resetAt: string | null;
  resource: string | null;
  retryAfterSeconds: number | null;
};

export type GitHubPage = {
  resourceType: GitHubResourceType;
  objects: Array<Record<string, unknown>>;
  nextCursor: string | null;
  rateLimit: GitHubRateLimitSnapshot;
};

export class GitHubEvidenceError extends Error {
  constructor(
    message: string,
    public readonly code: "missing_credential" | "provider_rate_limited" | "provider_access_refused" | "provider_unavailable" | "provider_invalid_response",
    public readonly rateLimit: GitHubRateLimitSnapshot,
    public readonly retryNotBefore: Date | null,
  ) {
    super(message);
  }
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function parseRateLimit(headers: Headers): GitHubRateLimitSnapshot {
  const toInteger = (value: string | null) => value && /^\d+$/.test(value) ? Number(value) : null;
  const resetSeconds = toInteger(headers.get("x-ratelimit-reset"));
  return {
    limit: toInteger(headers.get("x-ratelimit-limit")),
    remaining: toInteger(headers.get("x-ratelimit-remaining")),
    used: toInteger(headers.get("x-ratelimit-used")),
    resetAt: resetSeconds ? new Date(resetSeconds * 1000).toISOString() : null,
    resource: headers.get("x-ratelimit-resource"),
    retryAfterSeconds: toInteger(headers.get("retry-after")),
  };
}

function retryAt(rateLimit: GitHubRateLimitSnapshot): Date | null {
  if (rateLimit.retryAfterSeconds !== null) return new Date(Date.now() + rateLimit.retryAfterSeconds * 1000);
  return rateLimit.remaining === 0 && rateLimit.resetAt ? new Date(rateLimit.resetAt) : null;
}

function providerPath(owner: string, repository: string, resourceType: GitHubResourceType, limit: number) {
  const root = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  if (resourceType === "repository") return root;
  if (resourceType === "issue") return `${root}/issues?state=all&sort=updated&direction=desc&per_page=${limit}`;
  if (resourceType === "pull_request") return `${root}/pulls?state=all&sort=updated&direction=desc&per_page=${limit}`;
  if (resourceType === "commit") return `${root}/commits?per_page=${limit}`;
  return `${root}/releases?per_page=${limit}`;
}

function parseNextCursor(link: string | null) {
  if (!link) return null;
  const next = link.split(",").find(part => /rel="next"/.test(part));
  return next?.match(/<([^>]+)>/)?.[1] ?? null;
}

export function filterGitHubPayload(resourceType: GitHubResourceType, payload: Record<string, unknown>): Record<string, unknown> {
  const omit = new Set(["body", "body_html", "body_text", "patch", "content", "email", "diff_url", "patch_url"]);
  const copy = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(copy);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !omit.has(key))
      .map(([key, child]) => [key, copy(child)]));
  };
  return { resourceType, payload: copy(payload) as Record<string, unknown> };
}

export function normalizeGitHubPayload(resourceType: GitHubResourceType, payload: Record<string, unknown>) {
  const actor = (value: unknown) => {
    const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return typeof record.login === "string" ? record.login : null;
  };
  const string = (key: string) => typeof payload[key] === "string" ? payload[key] : null;
  const number = (key: string) => typeof payload[key] === "number" ? payload[key] : null;
  const labels = Array.isArray(payload.labels) ? payload.labels.map(item => item && typeof item === "object" && typeof (item as Record<string, unknown>).name === "string" ? (item as Record<string, unknown>).name : null).filter((item): item is string => Boolean(item)) : [];
  if (resourceType === "repository") return { resourceType, providerObjectId: String(payload.id ?? payload.full_name ?? ""), name: string("name"), fullName: string("full_name"), visibility: typeof payload.private === "boolean" ? (payload.private ? "private" : "public") : null, defaultBranch: string("default_branch"), sourceUpdatedAt: string("updated_at"), sourceUrl: string("html_url") ?? string("url") };
  if (resourceType === "issue") return { resourceType, providerObjectId: String(payload.id ?? payload.number ?? ""), number: number("number"), state: string("state"), title: string("title"), author: actor(payload.user), labels, sourceCreatedAt: string("created_at"), sourceUpdatedAt: string("updated_at"), sourceUrl: string("html_url") ?? string("url") };
  if (resourceType === "pull_request") return { resourceType, providerObjectId: String(payload.id ?? payload.number ?? ""), number: number("number"), state: string("state"), title: string("title"), author: actor(payload.user), sourceCreatedAt: string("created_at"), sourceUpdatedAt: string("updated_at"), mergedAt: string("merged_at"), sourceUrl: string("html_url") ?? string("url") };
  if (resourceType === "commit") {
    const commit = payload.commit && typeof payload.commit === "object" ? payload.commit as Record<string, unknown> : {};
    const author = commit.author && typeof commit.author === "object" ? commit.author as Record<string, unknown> : {};
    return { resourceType, providerObjectId: String(payload.sha ?? payload.id ?? ""), sha: string("sha"), message: typeof commit.message === "string" ? commit.message : null, author: actor(payload.author), sourceCreatedAt: typeof author.date === "string" ? author.date : null, sourceUpdatedAt: typeof author.date === "string" ? author.date : null, sourceUrl: string("html_url") ?? string("url") };
  }
  return { resourceType, providerObjectId: String(payload.id ?? payload.tag_name ?? ""), name: string("name"), tagName: string("tag_name"), draft: typeof payload.draft === "boolean" ? payload.draft : null, prerelease: typeof payload.prerelease === "boolean" ? payload.prerelease : null, sourceCreatedAt: string("created_at"), sourceUpdatedAt: string("published_at") ?? string("created_at"), sourceUrl: string("html_url") ?? string("url") };
}

export async function fetchGitHubEvidencePage(input: { token: string | undefined; owner: string; repository: string; resourceType: GitHubResourceType; perPage: number }, fetcher: ProviderFetch = fetch): Promise<GitHubPage> {
  if (!input.token) throw new GitHubEvidenceError("The server-only GitHub evidence credential is not configured.", "missing_credential", { limit: null, remaining: null, used: null, resetAt: null, resource: null, retryAfterSeconds: null }, null);
  const response = await fetcher(`https://api.github.com${providerPath(input.owner, input.repository, input.resourceType, input.perPage)}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${input.token}`, "User-Agent": "venture-erp-github-evidence", "X-GitHub-Api-Version": GITHUB_API_VERSION },
  });
  const rateLimit = parseRateLimit(response.headers);
  if (!response.ok) {
    const code = response.status === 403 || response.status === 429 ? "provider_rate_limited" : response.status === 401 || response.status === 404 ? "provider_access_refused" : "provider_unavailable";
    throw new GitHubEvidenceError(`GitHub source request was not accepted (${response.status}).`, code, rateLimit, retryAt(rateLimit));
  }
  const decoded = await response.json() as unknown;
  const values = input.resourceType === "repository" ? [decoded] : decoded;
  if (!Array.isArray(values) || values.some(value => !value || typeof value !== "object")) throw new GitHubEvidenceError("GitHub returned an unexpected evidence payload.", "provider_invalid_response", rateLimit, null);
  const objects = values
    .filter(value => input.resourceType !== "issue" || !(value as Record<string, unknown>).pull_request)
    .map(value => filterGitHubPayload(input.resourceType, value as Record<string, unknown>));
  return { resourceType: input.resourceType, objects, nextCursor: parseNextCursor(response.headers.get("link")), rateLimit };
}
