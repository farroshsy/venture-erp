import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { erpAuditEvents, erpInventoryMovements, erpOperationalRecords, erpWorkflowInstances, erpWorkflowTasks } from "../../drizzle/schema";
import { getDb } from "../db";

const validationVentureId = 1;
const isolatedAccessVentureId = 30001;

describe.skipIf(!process.env.DATABASE_URL)("validation-venture transaction lifecycle integration", () => {
  it("retains sales stock and event-workflow evidence inside the authorized tenant boundary", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for transaction lifecycle integration coverage.");
    const [fulfilledSalesOrder] = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.ventureId, validationVentureId), eq(erpOperationalRecords.recordNumber, "VALIDATION-SALES-ORDER-20260824"))).limit(1);
    expect(fulfilledSalesOrder).toMatchObject({ ventureId: validationVentureId, domain: "sales", recordType: "sales_order", status: "fulfilled" });
    const salesMovements = await db.select().from(erpInventoryMovements).where(and(eq(erpInventoryMovements.ventureId, validationVentureId), eq(erpInventoryMovements.operationalRecordId, fulfilledSalesOrder!.id)));
    expect(salesMovements.map(movement => movement.movementType)).toEqual(expect.arrayContaining(["reserve", "release", "issue"]));
    const salesAudits = await db.select().from(erpAuditEvents).where(and(eq(erpAuditEvents.ventureId, validationVentureId), eq(erpAuditEvents.operationalRecordId, fulfilledSalesOrder!.id)));
    expect(salesAudits.map(event => event.eventType)).toEqual(expect.arrayContaining(["sales_order.inventory_reserved", "sales_order.inventory_fulfilled"]));

    const [triggeredSalesOrder] = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.ventureId, validationVentureId), eq(erpOperationalRecords.recordNumber, "VALIDATION-EVENT-SALES-ORDER-20260824"))).limit(1);
    expect(triggeredSalesOrder).toMatchObject({ ventureId: validationVentureId, status: "approved" });
    const [instance] = await db.select().from(erpWorkflowInstances).where(and(eq(erpWorkflowInstances.ventureId, validationVentureId), eq(erpWorkflowInstances.operationalRecordId, triggeredSalesOrder!.id))).limit(1);
    expect(instance).toMatchObject({ ventureId: validationVentureId, status: "active" });
    const [task] = await db.select().from(erpWorkflowTasks).where(and(eq(erpWorkflowTasks.ventureId, validationVentureId), eq(erpWorkflowTasks.workflowInstanceId, instance!.id))).limit(1);
    expect(task).toMatchObject({ status: "pending", assigneeUserId: 1 });
    const triggerAudits = await db.select().from(erpAuditEvents).where(and(eq(erpAuditEvents.ventureId, validationVentureId), eq(erpAuditEvents.operationalRecordId, triggeredSalesOrder!.id), eq(erpAuditEvents.eventType, "workflow.event_triggered")));
    expect(triggerAudits).toHaveLength(1);

    const isolatedTenantRows = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.ventureId, isolatedAccessVentureId), eq(erpOperationalRecords.recordNumber, "VALIDATION-SALES-ORDER-20260824"))).limit(1);
    expect(isolatedTenantRows).toEqual([]);
  });
});
