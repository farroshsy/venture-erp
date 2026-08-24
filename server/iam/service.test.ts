import { describe, expect, it } from "vitest";
import { resolveAccessAssignmentEffect } from "./service";

describe("scoped assignment action policy", () => {
  it("keeps suspend reversible while making revoke remove the assignment", () => {
    expect(resolveAccessAssignmentEffect("suspend")).toEqual({ operation: "suspend", status: "suspended" });
    expect(resolveAccessAssignmentEffect("revoke")).toEqual({ operation: "delete" });
    expect(resolveAccessAssignmentEffect("grant")).toEqual({ operation: "grant", status: "active" });
  });
});
