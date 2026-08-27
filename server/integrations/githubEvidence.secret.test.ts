import { describe, expect, it } from "vitest";

describe("GitHub evidence credential", () => {
  it("authenticates with the server-only token against GitHub's user endpoint", async () => {
    const token = process.env.GITHUB_EVIDENCE_TOKEN;
    expect(token, "GITHUB_EVIDENCE_TOKEN must be configured for the Gate 3 source connection").toBeTruthy();

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "venture-erp-evidence-credential-check",
        "X-GitHub-Api-Version": "2026-03-10",
      },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { login?: unknown };
    expect(typeof body.login).toBe("string");
    expect(body.login).not.toHaveLength(0);
  });
});
