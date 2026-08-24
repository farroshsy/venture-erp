import { describe, expect, it } from "vitest";
import type { TrpcContext } from "../_core/context";
import { erpRouter } from "./erp";

function callerFor(userId: number) {
  return erpRouter.createCaller({ user: { id: userId, openId: userId === 1 ? "owner" : "unaffiliated-validation", email: null, name: userId === 1 ? "Farros" : "Unaffiliated validation user", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

describe("validation venture typed ERP end-to-end evidence", () => {
  it("allows the authenticated portfolio administrator to read completed sales, task, and audit evidence while denying an unaffiliated identity", async () => {
    const owner = callerFor(1);
    const records = await owner.records.list({ ventureId: 1 });
    const initialTasks = await owner.workflow.tasks({ ventureId: 1 });
    const pendingEventTask = initialTasks.find(task => task.id === 90001 && task.status === "pending");
    if (pendingEventTask) await owner.workflow.completeTask({ ventureId: 1, workflowTaskId: pendingEventTask.id, outcome: "approved" });
    const tasks = await owner.workflow.tasks({ ventureId: 1 });
    const audit = await owner.audit({ ventureId: 1 });

    expect(records.some(record => record.recordNumber === "VALIDATION-SALES-ORDER-20260824" && record.status === "fulfilled")).toBe(true);
    expect(tasks.some(task => task.id === 30001 && task.status === "approved" && task.completedAt)).toBe(true);
    expect(tasks.some(task => task.id === 60001 && task.status === "rejected" && task.completedAt)).toBe(true);
    expect(tasks.some(task => task.id === 90001 && task.status === "approved" && task.completedAt)).toBe(true);
    expect(audit.some(event => event.eventType === "sales_order.inventory_fulfilled")).toBe(true);
    expect(audit.some(event => event.eventType === "workflow.task_completed")).toBe(true);

    await expect(callerFor(999_999).records.list({ ventureId: 1 })).rejects.toThrow();
  });
});
