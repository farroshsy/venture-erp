import { describe, expect, it } from "vitest";
import { canPerformVentureAction } from "./tenant";

describe("tenant action boundaries", () => {
  it("allows only the declared venture roles to perform a governed action", () => {
    expect(canPerformVentureAction("portfolio_admin", ["portfolio_admin", "venture_lead"])).toBe(true);
    expect(canPerformVentureAction("finance_lead", ["portfolio_admin", "venture_lead"])).toBe(false);
    expect(canPerformVentureAction("viewer", ["portfolio_admin", "venture_lead"])).toBe(false);
  });
});
