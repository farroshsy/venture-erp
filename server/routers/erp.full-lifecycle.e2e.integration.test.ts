import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { users, ventureMemberships } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { erpRouter } from "./erp";

const ventureId = 1;
const operatorOpenId = "validation_e2e_operator_20260824";
const customerCode = "VALIDATION-E2E-CUSTOMER-20260824";
const itemCode = "VALIDATION-E2E-ITEM-20260824";
const orderNumber = "VALIDATION-E2E-SALES-ORDER-20260824";
let operatorUserId = 0;

function callerFor(userId: number, openId: string) {
  return erpRouter.createCaller({ user: { id: userId, openId, email: `${openId}@example.invalid`, name: openId, loginMethod: "validation", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

beforeAll(async () => {
  const db = await getDb(); if (!db) throw new Error("Database is not available.");
  let [user] = await db.select().from(users).where(eq(users.openId, operatorOpenId)).limit(1);
  if (!user) { await db.insert(users).values({ openId: operatorOpenId, name: "VALIDATION E2E Operator", email: "validation-e2e-operator@example.invalid", loginMethod: "validation", role: "user" }); [user] = await db.select().from(users).where(eq(users.openId, operatorOpenId)).limit(1); }
  operatorUserId = user!.id;
  const [membership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, ventureId), eq(ventureMemberships.userId, operatorUserId))).limit(1);
  if (!membership) await db.insert(ventureMemberships).values({ ventureId, userId: operatorUserId, role: "operator", status: "active" });
});

describe("typed-route sales lifecycle with real authorization", () => {
  it("lets an operator execute an internal sales lifecycle but forbids finance policy changes, while a portfolio admin completes the human task and all state is audited", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    await expect(operator.currencyPolicy.setReportingCurrency({ ventureId, reportingCurrency: "USD" })).rejects.toThrow();
    const masters = await operator.master.list({ ventureId });
    let customer = masters.find(master => master.domain === "customer" && master.code === customerCode);
    if (!customer) customer = await operator.master.create({ ventureId, domain: "customer", code: customerCode, name: "VALIDATION-ONLY E2E customer", attributes: { validationOnly: true } });
    let item = masters.find(master => master.domain === "item" && master.code === itemCode);
    if (!item) item = await operator.master.create({ ventureId, domain: "item", code: itemCode, name: "VALIDATION-ONLY E2E item", attributes: { validationOnly: true } });
    let records = await operator.records.list({ ventureId });
    let order = records.find(record => record.recordNumber === orderNumber);
    if (!order) {
      const balances = await operator.inventory.balances({ ventureId });
      const balance = balances.find(row => row.itemMasterId === item!.id);
      if (!balance || Number(balance.onHandQuantity) < 2) await operator.inventory.recordMovement({ ventureId, itemMasterId: item!.id, movementType: "adjust_in", quantity: 2, narrative: "VALIDATION-ONLY E2E opening stock" });
      order = await operator.records.create({ ventureId, domain: "sales", recordType: "sales_order", recordNumber: orderNumber, title: "VALIDATION-ONLY E2E controlled sales order", counterpartyMasterId: customer!.id, amount: 1, effectiveDate: "2026-08-24", data: { validationOnly: true, noShipping: true, noBilling: true, noPayment: true } });
      await operator.records.transition({ ventureId, operationalRecordId: order.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY E2E approval request" });
      await operator.records.transition({ ventureId, operationalRecordId: order.id, targetStatus: "approved", note: "VALIDATION-ONLY E2E approval" });
      await operator.sales.reserveInventory({ ventureId, salesOrderRecordId: order.id, itemMasterId: item!.id, quantity: 1, narrative: "VALIDATION-ONLY E2E reservation" });
      await operator.sales.fulfillInventory({ ventureId, salesOrderRecordId: order.id, itemMasterId: item!.id, quantity: 1, narrative: "VALIDATION-ONLY E2E internal fulfillment", finalFulfillment: true });
    }
    const instances = await admin.workflow.instances({ ventureId });
    const instance = instances.find(candidate => candidate.operationalRecordId === order!.id);
    const tasks = await admin.workflow.tasks({ ventureId });
    const pendingTask = tasks.find(task => task.workflowInstanceId === instance?.id && task.status === "pending");
    if (pendingTask) await admin.workflow.completeTask({ ventureId, workflowTaskId: pendingTask.id, outcome: "approved" });
    records = await admin.records.list({ ventureId }); const audits = await admin.audit({ ventureId }); const completedTasks = await admin.workflow.tasks({ ventureId });
    expect(records.find(record => record.id === order!.id)?.status).toBe("fulfilled");
    expect(completedTasks.some(task => task.workflowInstanceId === instance?.id && task.status === "approved")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "record.transitioned")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "sales_order.inventory_reserved")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "sales_order.inventory_fulfilled")).toBe(true);
    expect(audits.some(event => event.eventType === "workflow.task_completed")).toBe(true);
  });

  it("persists explicit jurisdiction-neutral people, delivery, asset, service, and CRM work controls with approval evidence", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId);
    const workControls = [
      { domain: "people" as const, recordType: "employee_profile", recordNumber: "VALIDATION-E2E-EMPLOYEE-20260824", title: "VALIDATION-ONLY employee profile" },
      { domain: "people" as const, recordType: "compensation_component", recordNumber: "VALIDATION-E2E-COMPONENT-20260824", title: "VALIDATION-ONLY compensation component" },
      { domain: "projects" as const, recordType: "project_plan", recordNumber: "VALIDATION-E2E-PROJECT-20260824", title: "VALIDATION-ONLY project plan" },
      { domain: "projects" as const, recordType: "task", recordNumber: "VALIDATION-E2E-TASK-20260824", title: "VALIDATION-ONLY project task" },
      { domain: "assets" as const, recordType: "asset_register", recordNumber: "VALIDATION-E2E-ASSET-20260824", title: "VALIDATION-ONLY asset register" },
      { domain: "assets" as const, recordType: "maintenance_work_order", recordNumber: "VALIDATION-E2E-MAINTENANCE-20260824", title: "VALIDATION-ONLY maintenance work order" },
      { domain: "service" as const, recordType: "service_request", recordNumber: "VALIDATION-E2E-SERVICE-20260824", title: "VALIDATION-ONLY service request" },
      { domain: "crm" as const, recordType: "opportunity", recordNumber: "VALIDATION-E2E-OPPORTUNITY-20260824", title: "VALIDATION-ONLY CRM opportunity" },
    ];
    let existing = await operator.records.list({ ventureId });
    for (const control of workControls) {
      let record = existing.find(candidate => candidate.recordNumber === control.recordNumber);
      if (!record) {
        record = await operator.records.create({
          ventureId,
          ...control,
          amount: 100,
          effectiveDate: "2026-08-24",
          data: { validationOnly: true, jurisdictionNeutral: true, calculationInput: 100, noStatutoryDetermination: true, noExternalExecution: true },
        });
      }
      if (record.status === "draft") await operator.records.transition({ ventureId, operationalRecordId: record.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY E2E work submission" });
      if (record.status === "draft" || record.status === "pending_approval") await operator.records.transition({ ventureId, operationalRecordId: record.id, targetStatus: "approved", note: "VALIDATION-ONLY E2E work approval" });
    }
    const records = await operator.records.list({ ventureId });
    const audits = await operator.audit({ ventureId });
    for (const control of workControls) {
      const record = records.find(candidate => candidate.recordNumber === control.recordNumber);
      expect(record).toMatchObject({ domain: control.domain, recordType: control.recordType, status: "approved" });
      expect(audits.some(event => event.operationalRecordId === record?.id && event.eventType === "record.transitioned")).toBe(true);
    }
  }, 20_000);

  it("enforces dedicated employee-profile and compensation-component approvals beyond generic work records", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const employeeCode = "VALIDATION-E2E-EMPLOYEE-MASTER-20260824";
    const employeeNumber = "VALIDATION-E2E-EMPLOYEE-20260824";
    const componentCode = "VALIDATION-E2E-COMPONENT-20260824";
    const masters = await operator.master.list({ ventureId });
    let employeeMaster = masters.find(master => master.domain === "employee" && master.code === employeeCode);
    if (!employeeMaster) employeeMaster = await operator.master.create({ ventureId, domain: "employee", code: employeeCode, name: "VALIDATION-ONLY employee master", attributes: { validationOnly: true } });
    let profile = (await operator.people.profiles({ ventureId })).find(candidate => candidate.employeeNumber === employeeNumber);
    if (!profile) profile = await operator.people.createProfile({ ventureId, employeeMasterId: employeeMaster.id, employeeNumber, department: "Validation", positionTitle: "Validation operator", employmentType: "employee", startDate: "2026-08-24", calculationInputs: { internalInput: 0, jurisdictionNeutral: true, noStatutoryDetermination: true } });
    let component = (await operator.people.components({ ventureId })).find(candidate => candidate.code === componentCode);
    if (!component) component = await operator.people.createComponent({ ventureId, code: componentCode, name: "VALIDATION-ONLY fixed earning", kind: "earning", calculationMethod: "flat_amount", defaultAmount: 100, currency: "USD", effectiveFrom: "2026-08-24", calculationInputs: { internalInput: 100, jurisdictionNeutral: true, noStatutoryDetermination: true } });
    if (profile.status === "draft") await expect(operator.people.transitionProfile({ ventureId, employeeProfileId: profile.id, targetStatus: "active" })).rejects.toThrow();
    if (component.status === "draft") await expect(operator.people.transitionComponent({ ventureId, compensationComponentId: component.id, targetStatus: "active" })).rejects.toThrow();
    if (profile.status === "draft") await admin.people.transitionProfile({ ventureId, employeeProfileId: profile.id, targetStatus: "active" });
    if (component.status === "draft") await admin.people.transitionComponent({ ventureId, compensationComponentId: component.id, targetStatus: "active" });
    const profiles = await admin.people.profiles({ ventureId }); const components = await admin.people.components({ ventureId }); const audits = await admin.audit({ ventureId });
    expect(profiles.find(candidate => candidate.id === profile!.id)?.status).toBe("active");
    expect(components.find(candidate => candidate.id === component!.id)?.status).toBe("active");
    expect(audits.some(event => event.eventType === "people.employee_profile_transitioned")).toBe(true);
    expect(audits.some(event => event.eventType === "people.compensation_component_transitioned")).toBe(true);
  }, 20_000);

  it("enforces dedicated project, task, asset, and maintenance transitions beyond generic work records", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const masters = await operator.master.list({ ventureId });
    let projectMaster = masters.find(master => master.domain === "project" && master.code === "VALIDATION-E2E-PROJECT-MASTER-20260824");
    if (!projectMaster) projectMaster = await operator.master.create({ ventureId, domain: "project", code: "VALIDATION-E2E-PROJECT-MASTER-20260824", name: "VALIDATION-ONLY project master", attributes: { validationOnly: true } });
    let assetMaster = masters.find(master => master.domain === "asset" && master.code === "VALIDATION-E2E-ASSET-MASTER-20260824");
    if (!assetMaster) assetMaster = await operator.master.create({ ventureId, domain: "asset", code: "VALIDATION-E2E-ASSET-MASTER-20260824", name: "VALIDATION-ONLY asset master", attributes: { validationOnly: true } });
    let project = (await operator.deliveryAssets.projects({ ventureId })).find(row => row.projectCode === "VALIDATION-E2E-PROJECT-20260824");
    if (!project) project = await operator.deliveryAssets.createProject({ ventureId, projectMasterId: projectMaster.id, projectCode: "VALIDATION-E2E-PROJECT-20260824", name: "VALIDATION-ONLY dedicated project", startDate: "2026-08-24", attributes: { validationOnly: true } });
    if (project.status === "draft") await expect(operator.deliveryAssets.transitionProject({ ventureId, projectId: project.id, targetStatus: "active" })).rejects.toThrow();
    if (project.status === "draft") await admin.deliveryAssets.transitionProject({ ventureId, projectId: project.id, targetStatus: "active" });
    let task = (await operator.deliveryAssets.tasks({ ventureId })).find(row => row.taskCode === "VALIDATION-E2E-DEDICATED-TASK-20260824");
    if (!task) task = await operator.deliveryAssets.createTask({ ventureId, projectId: project.id, taskCode: "VALIDATION-E2E-DEDICATED-TASK-20260824", title: "VALIDATION-ONLY dedicated task", priority: "normal", attributes: { validationOnly: true } });
    if (task.status === "draft") await operator.deliveryAssets.transitionTask({ ventureId, projectTaskId: task.id, targetStatus: "ready" });
    if (task.status === "draft" || task.status === "ready") await operator.deliveryAssets.transitionTask({ ventureId, projectTaskId: task.id, targetStatus: "in_progress" });
    let asset = (await operator.deliveryAssets.assets({ ventureId })).find(row => row.assetTag === "VALIDATION-E2E-ASSET-20260824");
    if (!asset) asset = await operator.deliveryAssets.createAsset({ ventureId, assetMasterId: assetMaster.id, assetTag: "VALIDATION-E2E-ASSET-20260824", name: "VALIDATION-ONLY dedicated asset", attributes: { validationOnly: true } });
    if (asset.status === "draft") await admin.deliveryAssets.transitionAsset({ ventureId, assetId: asset.id, targetStatus: "in_service" });
    let maintenance = (await operator.deliveryAssets.maintenance({ ventureId })).find(row => row.workOrderNumber === "VALIDATION-E2E-MAINT-20260824");
    if (!maintenance) maintenance = await operator.deliveryAssets.createMaintenance({ ventureId, assetId: asset.id, workOrderNumber: "VALIDATION-E2E-MAINT-20260824", title: "VALIDATION-ONLY maintenance", maintenanceType: "inspection", attributes: { validationOnly: true } });
    if (maintenance.status === "draft") await operator.deliveryAssets.transitionMaintenance({ ventureId, maintenanceWorkOrderId: maintenance.id, targetStatus: "scheduled" });
    const audits = await admin.audit({ ventureId });
    expect((await admin.deliveryAssets.projects({ ventureId })).find(row => row.id === project!.id)?.status).toBe("active");
    expect((await admin.deliveryAssets.assets({ ventureId })).find(row => row.id === asset!.id)?.status).toBe("in_service");
    expect(audits.some(event => event.eventType === "projects.project_transitioned")).toBe(true);
    expect(audits.some(event => event.eventType === "assets.maintenance_transitioned")).toBe(true);
  }, 20_000);

  it("enforces dedicated service requests and CRM opportunities beyond generic work records", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const masters = await operator.master.list({ ventureId });
    let customer = masters.find(master => master.domain === "customer" && master.code === "VALIDATION-E2E-SERVICE-CRM-CUSTOMER-20260824");
    if (!customer) customer = await operator.master.create({ ventureId, domain: "customer", code: "VALIDATION-E2E-SERVICE-CRM-CUSTOMER-20260824", name: "VALIDATION-ONLY service and CRM customer", attributes: { validationOnly: true } });
    let request = (await operator.serviceCrm.serviceRequests({ ventureId })).find(row => row.requestNumber === "VALIDATION-E2E-SERVICE-REQUEST-20260824");
    if (!request) request = await operator.serviceCrm.createServiceRequest({ ventureId, requestNumber: "VALIDATION-E2E-SERVICE-REQUEST-20260824", customerMasterId: customer.id, title: "VALIDATION-ONLY service request", severity: "normal", requestedDate: "2026-08-24", attributes: { validationOnly: true, noExternalDispatch: true } });
    if (request.status === "draft") await operator.serviceCrm.transitionServiceRequest({ ventureId, serviceRequestId: request.id, targetStatus: "submitted" });
    if (request.status === "draft" || request.status === "submitted") await operator.serviceCrm.transitionServiceRequest({ ventureId, serviceRequestId: request.id, targetStatus: "triaged" });
    let opportunity = (await operator.serviceCrm.opportunities({ ventureId })).find(row => row.opportunityNumber === "VALIDATION-E2E-OPPORTUNITY-DEDICATED-20260824");
    if (!opportunity) opportunity = await operator.serviceCrm.createOpportunity({ ventureId, opportunityNumber: "VALIDATION-E2E-OPPORTUNITY-DEDICATED-20260824", customerMasterId: customer.id, name: "VALIDATION-ONLY dedicated opportunity", estimatedAmount: 100, currency: "USD", attributes: { validationOnly: true, noExternalCrmAction: true } });
    if (opportunity.stage === "draft") await expect(operator.serviceCrm.transitionOpportunity({ ventureId, opportunityId: opportunity.id, targetStage: "qualified" })).rejects.toThrow();
    if (opportunity.stage === "draft") await admin.serviceCrm.transitionOpportunity({ ventureId, opportunityId: opportunity.id, targetStage: "qualified" });
    const audits = await admin.audit({ ventureId });
    expect((await admin.serviceCrm.serviceRequests({ ventureId })).find(row => row.id === request!.id)?.status).toBe("triaged");
    expect((await admin.serviceCrm.opportunities({ ventureId })).find(row => row.id === opportunity!.id)?.stage).toBe("qualified");
    expect(audits.some(event => event.eventType === "service.request_transitioned")).toBe(true);
    expect(audits.some(event => event.eventType === "crm.opportunity_transitioned")).toBe(true);
  }, 20_000);
});
