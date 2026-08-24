import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("../db", () => ({ getDb }));

import { createBudgetNode, createPayrollCalendar } from "./asia";

function selectionDb(queryResults: unknown[][]) {
  return {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => queryResults.shift() ?? []) })) })) })),
    insert: vi.fn(() => ({ values: vi.fn(async () => [{ insertId: 1 }]) })),
  };
}

describe("venture-scoped jurisdiction-pack applicability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an approved payroll pack when the active venture has not selected it for payroll", async () => {
    getDb.mockResolvedValue(selectionDb([[{ id: 9, status: "approved" }], []]));
    await expect(createPayrollCalendar({ ventureId: 21, jurisdictionPackId: 9, code: "PAYROLL-TEST", name: "Validation payroll", cadence: "monthly", workerCategory: "employee", currency: "IDR", createdByUserId: 7 })).rejects.toThrow("An active payroll jurisdiction-pack selection is required in the active venture.");
  });

  it("rejects an approved public-budget pack when the active venture has not selected it for public budget", async () => {
    getDb.mockResolvedValue(selectionDb([[{ id: 9, status: "approved" }], []]));
    await expect(createBudgetNode({ ventureId: 21, jurisdictionPackId: 9, level: "agency", code: "BUDGET-TEST", name: "Validation budget", currency: "IDR", appropriatedAmount: 100, attributes: {}, createdByUserId: 7 })).rejects.toThrow("An active public budget jurisdiction-pack selection is required in the active venture.");
  });

  it("rejects a payroll pack selection returned from a different venture as a defense-in-depth tenant check", async () => {
    getDb.mockResolvedValue(selectionDb([[{ id: 9, status: "approved" }], [{ ventureId: 22, jurisdictionPackId: 9, purpose: "payroll", status: "active" }]]));
    await expect(createPayrollCalendar({ ventureId: 21, jurisdictionPackId: 9, code: "PAYROLL-OTHER-VENTURE", name: "Wrong venture pack", cadence: "monthly", workerCategory: "employee", currency: "IDR", createdByUserId: 7 })).rejects.toThrow("An active payroll jurisdiction-pack selection is required in the active venture.");
  });
});
