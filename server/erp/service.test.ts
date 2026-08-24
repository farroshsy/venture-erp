import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("../db", () => ({ getDb }));

import { createOperationalRecord } from "./service";

function fakeDb(queryResults: unknown[][]) {
  const inserted: unknown[] = [];
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => queryResults.shift() ?? []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (value: unknown) => {
        inserted.push(value);
        return [{ insertId: 71 }];
      }),
    })),
  };
  return { db, inserted };
}

const input = {
  ventureId: 21,
  domain: "finance" as const,
  recordType: "cross_border_invoice",
  recordNumber: "CB-TEST-001",
  title: "Transactional control proof",
  publicBudgetNodeId: 8,
  transactionCurrency: "IDR",
  functionalCurrency: "SGD",
  exchangeRateId: 44,
  amount: 100,
  effectiveDate: "2026-08-24",
  data: { crossBorder: true },
  createdByUserId: 7,
};

describe("cross-border operational record controls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the approved FX reference, functional amount, and active public-budget linkage", async () => {
    const { db, inserted } = fakeDb([
      [{ baseCurrency: "SGD" }],
      [{ id: 8, ventureId: 21, status: "active", currency: "SGD", appropriatedAmount: "1000", committedAmount: "0", spentAmount: "0" }],
      [{ id: 44, ventureId: 21, status: "approved", sourceCurrency: "IDR", targetCurrency: "SGD", rate: "1.5" }],
    ]);
    getDb.mockResolvedValue(db);

    const result = await createOperationalRecord(input);

    expect(result).toMatchObject({ id: 71, transactionCurrency: "IDR", functionalCurrency: "SGD", exchangeRateId: 44, functionalAmount: 150, budgetException: false });
    expect(inserted[0]).toMatchObject({
      ventureId: 21,
      publicBudgetNodeId: 8,
      transactionCurrency: "IDR",
      functionalCurrency: "SGD",
      exchangeRateId: 44,
      functionalAmount: "150",
      amount: "100",
      totalAmount: "100",
    });
  });

  it("refuses a public-budget reference that cannot be found in the active venture", async () => {
    const { db } = fakeDb([[{ baseCurrency: "SGD" }], []]);
    getDb.mockResolvedValue(db);

    await expect(createOperationalRecord(input)).rejects.toThrow("Public budget node not found in the active venture.");
  });

  it("refuses a cross-currency record without an approved matching exchange rate", async () => {
    const { db } = fakeDb([
      [{ baseCurrency: "SGD" }],
      [{ id: 8, ventureId: 21, status: "active", currency: "SGD", appropriatedAmount: "1000", committedAmount: "0", spentAmount: "0" }],
      [],
    ]);
    getDb.mockResolvedValue(db);

    await expect(createOperationalRecord(input)).rejects.toThrow("Approved exchange rate not found for the selected currency pair in the active venture.");
  });
});
