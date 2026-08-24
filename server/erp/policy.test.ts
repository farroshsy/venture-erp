import { describe, expect, it } from "vitest";
import { availableBudget, calculatePayrollProposal, calculateTax, canTransition, convertCurrency } from "./policy";

describe("operational ERP policies", () => {
  it("calculates exclusive and inclusive tax from configured policy inputs", () => {
    expect(calculateTax(100, 1_000, "exclusive", {})).toEqual({ taxableAmount: 100, taxAmount: 10, totalAmount: 110 });
    expect(calculateTax(110, 1_000, "inclusive", {})).toEqual({ taxableAmount: 100, taxAmount: 10, totalAmount: 110 });
  });
  it("creates a transparent payroll proposal from configured compensation components", () => {
    expect(calculatePayrollProposal({ components: [{ code: "BASE", name: "Base pay", kind: "earning", amount: 1000 }, { code: "BEN", name: "Benefit", kind: "earning", amount: 100, taxable: false }, { code: "LOAN", name: "Loan", kind: "deduction", amount: 50 }], withholdingRateBasisPoints: 1_000 })).toEqual({ grossPay: 1100, taxablePay: 950, withholding: 95, totalDeductions: 145, netPay: 955 });
  });
  it("rejects an unsafe operational state transition", () => {
    expect(canTransition("draft", "posted")).toBe(false);
    expect(canTransition("approved", "posted")).toBe(true);
  });
  it("converts currency only with a positive approved-rate value and preserves money precision", () => {
    expect(convertCurrency(110, 1.25)).toBe(137.5);
    expect(() => convertCurrency(100, 0)).toThrow("Exchange rate must be greater than zero.");
  });
  it("calculates public-budget availability after commitments and spend", () => {
    expect(availableBudget(1000, 250, 300)).toBe(450);
  });
});
