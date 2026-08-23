import { describe, expect, it } from "vitest";
import { getModuleCatalog } from "./catalog";

describe("platform catalog integration", () => {
  it("exposes a contract, data authority, owner, and maturity result for every bounded context", () => {
    const catalog = getModuleCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(8);
    for (const module of catalog) {
      expect(module.contract).toMatch(/\.v1$/);
      expect(module.businessOwner).not.toHaveLength(0);
      expect(module.engineeringOwner).not.toHaveLength(0);
      expect(module.dataAuthority).not.toHaveLength(0);
      expect(module.maturity.level).toMatch(/^L[0-4]$/);
    }
  });
});
