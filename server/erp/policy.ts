export type TaxMethod = "exclusive" | "inclusive" | "flat_amount";
export type OperationalStatus = "draft" | "pending_approval" | "approved" | "posted" | "fulfilled" | "closed" | "cancelled" | "on_hold";

const allowedTransitions: Record<OperationalStatus, OperationalStatus[]> = {
  draft: ["pending_approval", "cancelled", "on_hold"], pending_approval: ["approved", "cancelled", "on_hold"], approved: ["posted", "fulfilled", "cancelled", "on_hold"], posted: ["fulfilled", "closed", "on_hold"], fulfilled: ["closed", "on_hold"], closed: [], cancelled: [], on_hold: ["draft", "pending_approval", "approved", "cancelled"],
};

export function normalizeMoney(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error("Amount must be a non-negative number.");
  return Math.round(value * 100) / 100;
}

export function convertCurrency(amount: number, rate: number) {
  const normalizedAmount = normalizeMoney(amount);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Exchange rate must be greater than zero.");
  return normalizeMoney(normalizedAmount * rate);
}

export function availableBudget(appropriatedAmount: number, committedAmount: number, spentAmount: number) {
  return normalizeMoney(appropriatedAmount - committedAmount - spentAmount);
}

export function calculateTax(amount: number, rateBasisPoints: number, method: TaxMethod, configuration: unknown) {
  const base = normalizeMoney(amount);
  if (method === "flat_amount") {
    const flatAmount = Number((configuration as { flatAmount?: number })?.flatAmount ?? 0);
    const taxAmount = normalizeMoney(flatAmount);
    return { taxAmount, totalAmount: normalizeMoney(base + taxAmount), taxableAmount: base };
  }
  if (method === "inclusive") {
    const taxAmount = normalizeMoney(base - base / (1 + rateBasisPoints / 10_000));
    return { taxAmount, totalAmount: base, taxableAmount: normalizeMoney(base - taxAmount) };
  }
  const taxAmount = normalizeMoney(base * rateBasisPoints / 10_000);
  return { taxAmount, totalAmount: normalizeMoney(base + taxAmount), taxableAmount: base };
}

export function canTransition(from: OperationalStatus, to: OperationalStatus) {
  return allowedTransitions[from].includes(to);
}

export type PayrollComponentInput = { code: string; name: string; kind: "earning" | "deduction"; amount: number; taxable?: boolean };

export function calculatePayrollProposal(input: { components: PayrollComponentInput[]; withholdingRateBasisPoints?: number }) {
  const earnings = input.components.filter(component => component.kind === "earning").reduce((total, component) => total + normalizeMoney(component.amount), 0);
  const preTaxDeductions = input.components.filter(component => component.kind === "deduction").reduce((total, component) => total + normalizeMoney(component.amount), 0);
  const taxableEarnings = input.components.filter(component => component.kind === "earning" && component.taxable !== false).reduce((total, component) => total + normalizeMoney(component.amount), 0);
  const withholding = normalizeMoney(Math.max(0, taxableEarnings - preTaxDeductions) * (input.withholdingRateBasisPoints ?? 0) / 10_000);
  const grossPay = normalizeMoney(earnings);
  const totalDeductions = normalizeMoney(preTaxDeductions + withholding);
  return { grossPay, taxablePay: normalizeMoney(Math.max(0, taxableEarnings - preTaxDeductions)), withholding, totalDeductions, netPay: normalizeMoney(Math.max(0, grossPay - totalDeductions)) };
}
