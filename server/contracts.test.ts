import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("public contract registry", () => {
  it("declares a tenant-aware gateway contract with the required public operations", async () => {
    const raw = await readFile(resolve(process.cwd(), "contracts/public/erp-platform.v1.json"), "utf8");
    const contract = JSON.parse(raw) as { contractId: string; version: string; compatibility: string; tenantContext: { required: boolean }; operations: Array<{ name: string }> };
    expect(contract.contractId).toBe("erp-platform.v1");
    expect(contract.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(contract.compatibility).toBe("backward-compatible");
    expect(contract.tenantContext.required).toBe(true);
    expect(contract.operations.map(operation => operation.name)).toContain("governance.reviewEvidence");
  });
});
