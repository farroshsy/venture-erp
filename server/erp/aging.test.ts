import { describe, expect, it } from "vitest";
import { classifyInvoiceAge } from "./service";

describe("internal invoice aging buckets", () => {
  it("classifies retained due dates without making a collection or credit decision", () => {
    expect(classifyInvoiceAge(undefined, "2026-08-25")).toEqual({ bucket: "undated", daysPastDue: null });
    expect(classifyInvoiceAge("2026-08-25", "2026-08-25")).toEqual({ bucket: "not_due", daysPastDue: 0 });
    expect(classifyInvoiceAge("2026-08-24", "2026-08-25")).toEqual({ bucket: "1_30", daysPastDue: 1 });
    expect(classifyInvoiceAge("2026-07-01", "2026-08-25")).toEqual({ bucket: "31_60", daysPastDue: 55 });
    expect(classifyInvoiceAge("2026-05-01", "2026-08-25")).toEqual({ bucket: "over_90", daysPastDue: 116 });
  });
});
