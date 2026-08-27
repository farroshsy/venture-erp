import { describe, expect, it } from "vitest";
import { fetchGitHubEvidencePage, filterGitHubPayload, normalizeGitHubPayload, parseRateLimit, sha256, stableJson, GitHubEvidenceError } from "./githubEvidence";

describe("GitHub evidence adapter", () => {
  it("filters high-risk body/content fields before retention while preserving deterministic identity evidence", () => {
    const filtered = filterGitHubPayload("issue", { id: 17, number: 4, title: "Evidence scope", body: "do not retain", patch: "do not retain", user: { login: "maintainer", email: "private@example.com" }, html_url: "https://github.com/example/repo/issues/4", updated_at: "2026-08-27T00:00:00Z" });
    expect(filtered).toEqual({ resourceType: "issue", payload: { id: 17, number: 4, title: "Evidence scope", user: { login: "maintainer" }, html_url: "https://github.com/example/repo/issues/4", updated_at: "2026-08-27T00:00:00Z" } });
    expect(normalizeGitHubPayload("issue", filtered.payload as Record<string, unknown>)).toMatchObject({ providerObjectId: "17", number: 4, author: "maintainer" });
    expect(sha256({ b: 2, a: 1 })).toBe(sha256({ a: 1, b: 2 }));
    expect(stableJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("retains one requested page and reports the documented next-page boundary without following it", async () => {
    const response = new Response(JSON.stringify([{ id: 7, number: 3, title: "Bounded acquisition", body: "redacted", html_url: "https://github.com/example/repo/issues/3", updated_at: "2026-08-27T00:00:00Z" }]), { status: 200, headers: { Link: '<https://api.github.com/repos/example/repo/issues?page=2>; rel="next"', "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "4990", "x-ratelimit-reset": "1787838000", "x-ratelimit-resource": "core" } });
    const page = await fetchGitHubEvidencePage({ token: "test-token", owner: "example", repository: "repo", resourceType: "issue", perPage: 5 }, async () => response);
    expect(page.objects).toHaveLength(1);
    expect(page.objects[0].payload).not.toHaveProperty("body");
    expect(page.nextCursor).toContain("page=2");
    expect(page.rateLimit).toMatchObject({ limit: 5000, remaining: 4990, resource: "core" });
  });

  it("turns provider rate-limit responses into a bounded retry-not-before refusal", async () => {
    const response = new Response(JSON.stringify({ message: "API rate limit exceeded" }), { status: 429, headers: { "retry-after": "60", "x-ratelimit-remaining": "0" } });
    await expect(fetchGitHubEvidencePage({ token: "test-token", owner: "example", repository: "repo", resourceType: "repository", perPage: 1 }, async () => response)).rejects.toMatchObject<Partial<GitHubEvidenceError>>({ code: "provider_rate_limited" });
    expect(parseRateLimit(response.headers).retryAfterSeconds).toBe(60);
  });
});
