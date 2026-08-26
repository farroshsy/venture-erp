import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const ventures = mysqlTable("ventures", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  legalName: varchar("legalName", { length: 180 }),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  baseCurrency: varchar("baseCurrency", { length: 3 }).notNull().default("USD"),
  reportingCurrency: varchar("reportingCurrency", { length: 3 }),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const ventureMemberships = mysqlTable("venture_memberships", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  userId: int("userId").notNull().references(() => users.id),
  role: mysqlEnum("role", ["portfolio_admin", "venture_lead", "finance_lead", "operator", "viewer"]).notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("venture_membership_user_venture_unique").on(table.ventureId, table.userId),
  index("venture_membership_user_idx").on(table.userId),
]);

export const governanceCases = mysqlTable("governance_cases", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  title: varchar("title", { length: 180 }).notNull(),
  capability: varchar("capability", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["draft", "review", "approved", "rejected"]).default("draft").notNull(),
  recommendation: mysqlEnum("recommendation", ["sap", "alternative", "custom"]).notNull(),
  criteria: json("criteria").notNull(),
  evidence: json("evidence").notNull(),
  assumptions: json("assumptions").notNull(),
  rationale: text("rationale").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  approvedByUserId: int("approvedByUserId").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("governance_case_venture_idx").on(table.ventureId)]);

export const decisionEvidenceReviews = mysqlTable("decision_evidence_reviews", {
  id: int("id").autoincrement().primaryKey(),
  governanceCaseId: int("governanceCaseId").notNull().references(() => governanceCases.id),
  status: mysqlEnum("status", ["draft", "approved", "superseded"]).default("draft").notNull(),
  model: varchar("model", { length: 96 }),
  summary: text("summary").notNull(),
  assumptions: json("assumptions").notNull(),
  risks: json("risks").notNull(),
  humanApprovalRequired: int("humanApprovalRequired").default(1).notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  approvedByUserId: int("approvedByUserId").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("decision_review_case_idx").on(table.governanceCaseId)]);

export const platformRoles = mysqlTable("platform_roles", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 140 }).notNull(),
  description: text("description").notNull(),
  kind: mysqlEnum("kind", ["system", "custom"]).default("system").notNull(),
  status: mysqlEnum("status", ["active", "retired"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const platformPermissions = mysqlTable("platform_permissions", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const platformRolePermissions = mysqlTable("platform_role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull().references(() => platformRoles.id),
  permissionId: int("permissionId").notNull().references(() => platformPermissions.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("role_permission_unique").on(table.roleId, table.permissionId)]);

export const platformAccessAssignments = mysqlTable("platform_access_assignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  roleId: int("roleId").notNull().references(() => platformRoles.id),
  scope: mysqlEnum("scope", ["portfolio", "venture", "module"]).notNull(),
  ventureId: int("ventureId").references(() => ventures.id),
  moduleId: varchar("moduleId", { length: 96 }),
  status: mysqlEnum("status", ["active", "suspended", "pending_review"]).default("active").notNull(),
  assignedByUserId: int("assignedByUserId").references(() => users.id),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("access_assignment_user_idx").on(table.userId),
  index("access_assignment_scope_idx").on(table.ventureId, table.moduleId),
]);

export const accessChangeRequests = mysqlTable("access_change_requests", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").references(() => ventures.id),
  subjectUserId: int("subjectUserId").notNull().references(() => users.id),
  requestedByUserId: int("requestedByUserId").notNull().references(() => users.id),
  action: mysqlEnum("action", ["grant", "revoke", "suspend"]).notNull(),
  requestedRoleKey: varchar("requestedRoleKey", { length: 96 }).notNull(),
  scope: mysqlEnum("scope", ["portfolio", "venture", "module"]).notNull(),
  moduleId: varchar("moduleId", { length: 96 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "applied"]).default("pending").notNull(),
  rationale: text("rationale").notNull(),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const assistantMessages = mysqlTable("assistant_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: varchar("conversationId", { length: 64 }).notNull(),
  userId: int("userId").notNull().references(() => users.id),
  ventureId: int("ventureId").references(() => ventures.id),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  evidence: json("evidence").notNull(),
  model: varchar("model", { length: 96 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("assistant_message_conversation_idx").on(table.conversationId),
  index("assistant_message_user_venture_idx").on(table.userId, table.ventureId),
]);

export const erpMasterRecords = mysqlTable("erp_master_records", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  domain: mysqlEnum("domain", ["customer", "supplier", "item", "employee", "account", "project", "asset", "location", "compensation_component", "tax_category"]).notNull(),
  code: varchar("code", { length: 96 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).default("active").notNull(),
  attributes: json("attributes").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_master_venture_domain_code_unique").on(table.ventureId, table.domain, table.code),
  index("erp_master_venture_domain_idx").on(table.ventureId, table.domain),
]);

export const erpItemMasterProfiles = mysqlTable("erp_item_master_profiles", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  itemMasterId: int("itemMasterId").notNull().references(() => erpMasterRecords.id),
  itemType: mysqlEnum("itemType", ["stock_item", "non_stock_item", "service"]).notNull(),
  inventoryTracked: boolean("inventoryTracked").notNull().default(false),
  baseUomCode: varchar("baseUomCode", { length: 24 }).notNull(),
  unitEvidenceReference: varchar("unitEvidenceReference", { length: 180 }).notNull(),
  productFamily: varchar("productFamily", { length: 96 }),
  costingEligibility: mysqlEnum("costingEligibility", ["not_assessed", "evidence_only_eligible", "blocked"]).default("not_assessed").notNull(),
  status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
  attributes: json("attributes").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  activatedByUserId: int("activatedByUserId").references(() => users.id),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_item_profile_venture_master_unique").on(table.ventureId, table.itemMasterId),
  index("erp_item_profile_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpEmployeeProfiles = mysqlTable("erp_employee_profiles", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  employeeMasterId: int("employeeMasterId").notNull().references(() => erpMasterRecords.id),
  employeeNumber: varchar("employeeNumber", { length: 96 }).notNull(),
  department: varchar("department", { length: 120 }),
  positionTitle: varchar("positionTitle", { length: 140 }).notNull(),
  employmentType: mysqlEnum("employmentType", ["employee", "director", "contractor", "temporary", "apprentice", "expatriate", "public_servant"]).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }),
  status: mysqlEnum("status", ["draft", "active", "on_leave", "terminated"]).default("draft").notNull(),
  calculationInputs: json("calculationInputs").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  activatedByUserId: int("activatedByUserId").references(() => users.id),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_employee_profile_venture_number_unique").on(table.ventureId, table.employeeNumber),
  uniqueIndex("erp_employee_profile_venture_master_unique").on(table.ventureId, table.employeeMasterId),
  index("erp_employee_profile_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpCompensationComponents = mysqlTable("erp_compensation_components", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  code: varchar("code", { length: 96 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  kind: mysqlEnum("kind", ["earning", "deduction"]).notNull(),
  calculationMethod: mysqlEnum("calculationMethod", ["flat_amount", "percentage", "manual"]).notNull(),
  defaultAmount: decimal("defaultAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).notNull(),
  effectiveFrom: varchar("effectiveFrom", { length: 10 }).notNull(),
  effectiveTo: varchar("effectiveTo", { length: 10 }),
  status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
  calculationInputs: json("calculationInputs").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  activatedByUserId: int("activatedByUserId").references(() => users.id),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_comp_component_venture_code_unique").on(table.ventureId, table.code),
  index("erp_comp_component_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpProjects = mysqlTable("erp_projects", { id: int("id").autoincrement().primaryKey(), ventureId: int("ventureId").notNull().references(() => ventures.id), projectMasterId: int("projectMasterId").notNull().references(() => erpMasterRecords.id), projectCode: varchar("projectCode", { length: 96 }).notNull(), name: varchar("name", { length: 180 }).notNull(), ownerUserId: int("ownerUserId").references(() => users.id), startDate: varchar("startDate", { length: 10 }).notNull(), targetDate: varchar("targetDate", { length: 10 }), status: mysqlEnum("status", ["draft", "active", "on_hold", "completed", "cancelled"]).default("draft").notNull(), calculationInputs: json("calculationInputs").notNull(), attributes: json("attributes").notNull(), createdByUserId: int("createdByUserId").notNull().references(() => users.id), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, table => [uniqueIndex("erp_project_venture_code_unique").on(table.ventureId, table.projectCode), uniqueIndex("erp_project_venture_master_unique").on(table.ventureId, table.projectMasterId), index("erp_project_venture_status_idx").on(table.ventureId, table.status)]);

export const erpProjectTasks = mysqlTable("erp_project_tasks", { id: int("id").autoincrement().primaryKey(), ventureId: int("ventureId").notNull().references(() => ventures.id), projectId: int("projectId").notNull().references(() => erpProjects.id), taskCode: varchar("taskCode", { length: 96 }).notNull(), title: varchar("title", { length: 180 }).notNull(), assigneeUserId: int("assigneeUserId").references(() => users.id), dueDate: varchar("dueDate", { length: 10 }), priority: mysqlEnum("priority", ["low", "normal", "high", "critical"]).default("normal").notNull(), status: mysqlEnum("status", ["draft", "ready", "in_progress", "blocked", "completed", "cancelled"]).default("draft").notNull(), calculationInputs: json("calculationInputs").notNull(), attributes: json("attributes").notNull(), createdByUserId: int("createdByUserId").notNull().references(() => users.id), completedAt: timestamp("completedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, table => [uniqueIndex("erp_task_venture_code_unique").on(table.ventureId, table.taskCode), index("erp_task_project_status_idx").on(table.projectId, table.status)]);

export const erpAssets = mysqlTable("erp_assets", { id: int("id").autoincrement().primaryKey(), ventureId: int("ventureId").notNull().references(() => ventures.id), assetMasterId: int("assetMasterId").notNull().references(() => erpMasterRecords.id), assetTag: varchar("assetTag", { length: 96 }).notNull(), name: varchar("name", { length: 180 }).notNull(), category: varchar("category", { length: 96 }), inServiceDate: varchar("inServiceDate", { length: 10 }), status: mysqlEnum("status", ["draft", "in_service", "maintenance", "retired"]).default("draft").notNull(), calculationInputs: json("calculationInputs").notNull(), sourceFacts: json("sourceFacts"), attributes: json("attributes").notNull(), createdByUserId: int("createdByUserId").notNull().references(() => users.id), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, table => [uniqueIndex("erp_asset_venture_tag_unique").on(table.ventureId, table.assetTag), uniqueIndex("erp_asset_venture_master_unique").on(table.ventureId, table.assetMasterId), index("erp_asset_venture_status_idx").on(table.ventureId, table.status)]);

export const erpMaintenanceWorkOrders = mysqlTable("erp_maintenance_work_orders", { id: int("id").autoincrement().primaryKey(), ventureId: int("ventureId").notNull().references(() => ventures.id), assetId: int("assetId").notNull().references(() => erpAssets.id), workOrderNumber: varchar("workOrderNumber", { length: 96 }).notNull(), title: varchar("title", { length: 180 }).notNull(), maintenanceType: mysqlEnum("maintenanceType", ["preventive", "corrective", "inspection"]).notNull(), scheduledFor: varchar("scheduledFor", { length: 10 }), status: mysqlEnum("status", ["draft", "scheduled", "in_progress", "completed", "cancelled"]).default("draft").notNull(), calculationInputs: json("calculationInputs").notNull(), completionNotes: text("completionNotes"), attributes: json("attributes").notNull(), createdByUserId: int("createdByUserId").notNull().references(() => users.id), completedAt: timestamp("completedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, table => [uniqueIndex("erp_maintenance_venture_number_unique").on(table.ventureId, table.workOrderNumber), index("erp_maintenance_asset_status_idx").on(table.assetId, table.status)]);

export const erpServiceRequests = mysqlTable("erp_service_requests", { id: int("id").autoincrement().primaryKey(), ventureId: int("ventureId").notNull().references(() => ventures.id), requestNumber: varchar("requestNumber", { length: 96 }).notNull(), customerMasterId: int("customerMasterId").references(() => erpMasterRecords.id), title: varchar("title", { length: 180 }).notNull(), severity: mysqlEnum("severity", ["low", "normal", "high", "urgent"]).default("normal").notNull(), status: mysqlEnum("status", ["draft", "submitted", "triaged", "in_progress", "resolved", "closed", "cancelled"]).default("draft").notNull(), requestedDate: varchar("requestedDate", { length: 10 }).notNull(), calculationInputs: json("calculationInputs").notNull(), resolutionNotes: text("resolutionNotes"), attributes: json("attributes").notNull(), createdByUserId: int("createdByUserId").notNull().references(() => users.id), resolvedAt: timestamp("resolvedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, table => [uniqueIndex("erp_service_request_venture_number_unique").on(table.ventureId, table.requestNumber), index("erp_service_request_venture_status_idx").on(table.ventureId, table.status)]);

export const erpCrmOpportunities = mysqlTable("erp_crm_opportunities", { id: int("id").autoincrement().primaryKey(), ventureId: int("ventureId").notNull().references(() => ventures.id), opportunityNumber: varchar("opportunityNumber", { length: 96 }).notNull(), customerMasterId: int("customerMasterId").notNull().references(() => erpMasterRecords.id), name: varchar("name", { length: 180 }).notNull(), stage: mysqlEnum("stage", ["draft", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"]).default("draft").notNull(), estimatedAmount: decimal("estimatedAmount", { precision: 18, scale: 2 }).notNull().default("0"), currency: varchar("currency", { length: 3 }).notNull(), targetCloseDate: varchar("targetCloseDate", { length: 10 }), calculationInputs: json("calculationInputs").notNull(), attributes: json("attributes").notNull(), createdByUserId: int("createdByUserId").notNull().references(() => users.id), closedAt: timestamp("closedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, table => [uniqueIndex("erp_crm_opportunity_venture_number_unique").on(table.ventureId, table.opportunityNumber), index("erp_crm_opportunity_venture_stage_idx").on(table.ventureId, table.stage)]);

export const erpAccountingPeriods = mysqlTable("erp_accounting_periods", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  code: varchar("code", { length: 48 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["open", "soft_closed", "closed"]).default("open").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_period_venture_code_unique").on(table.ventureId, table.code),
  index("erp_period_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpTaxPolicies = mysqlTable("erp_tax_policies", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  category: mysqlEnum("category", ["transaction", "payroll"]).notNull(),
  rateBasisPoints: int("rateBasisPoints").notNull(),
  calculationMethod: mysqlEnum("calculationMethod", ["exclusive", "inclusive", "flat_amount"]).default("exclusive").notNull(),
  effectiveFrom: varchar("effectiveFrom", { length: 10 }).notNull(),
  effectiveTo: varchar("effectiveTo", { length: 10 }),
  status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
  configuration: json("configuration").notNull(),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_tax_policy_venture_code_unique").on(table.ventureId, table.code),
  index("erp_tax_policy_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpBudgetEnvelopes = mysqlTable("erp_budget_envelopes", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  accountingPeriodId: int("accountingPeriodId").references(() => erpAccountingPeriods.id),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  committedAmount: decimal("committedAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  spentAmount: decimal("spentAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
  ownerUserId: int("ownerUserId").references(() => users.id),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_budget_venture_code_unique").on(table.ventureId, table.code),
  index("erp_budget_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpOperationalRecords = mysqlTable("erp_operational_records", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  domain: mysqlEnum("domain", ["finance", "sales", "procurement", "inventory", "people", "payroll", "projects", "assets", "service", "crm"]).notNull(),
  recordType: varchar("recordType", { length: 64 }).notNull(),
  recordNumber: varchar("recordNumber", { length: 96 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "posted", "fulfilled", "closed", "cancelled", "on_hold"]).default("draft").notNull(),
  counterpartyMasterId: int("counterpartyMasterId").references(() => erpMasterRecords.id),
  accountingPeriodId: int("accountingPeriodId").references(() => erpAccountingPeriods.id),
  budgetEnvelopeId: int("budgetEnvelopeId").references(() => erpBudgetEnvelopes.id),
  publicBudgetNodeId: int("publicBudgetNodeId"),
  taxPolicyId: int("taxPolicyId").references(() => erpTaxPolicies.id),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("taxAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("totalAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  transactionCurrency: varchar("transactionCurrency", { length: 3 }).notNull().default("USD"),
  functionalCurrency: varchar("functionalCurrency", { length: 3 }).notNull().default("USD"),
  exchangeRateId: int("exchangeRateId"),
  functionalAmount: decimal("functionalAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  reportingCurrency: varchar("reportingCurrency", { length: 3 }),
  reportingExchangeRateId: int("reportingExchangeRateId"),
  reportingAmount: decimal("reportingAmount", { precision: 18, scale: 2 }),
  effectiveDate: varchar("effectiveDate", { length: 10 }).notNull(),
  dueDate: varchar("dueDate", { length: 10 }),
  supplierInvoiceReferenceNormalized: varchar("supplierInvoiceReferenceNormalized", { length: 160 }),
  data: json("data").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  approvedByUserId: int("approvedByUserId").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_operational_venture_record_unique").on(table.ventureId, table.recordNumber),
  uniqueIndex("erp_payable_supplier_reference_unique").on(table.ventureId, table.counterpartyMasterId, table.supplierInvoiceReferenceNormalized),
  index("erp_operational_venture_domain_status_idx").on(table.ventureId, table.domain, table.status),
]);

export const erpLedgerEntries = mysqlTable("erp_ledger_entries", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  operationalRecordId: int("operationalRecordId").notNull().references(() => erpOperationalRecords.id),
  accountMasterId: int("accountMasterId").notNull().references(() => erpMasterRecords.id),
  entrySide: mysqlEnum("entrySide", ["debit", "credit"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  narrative: varchar("narrative", { length: 255 }).notNull(),
  postedAt: timestamp("postedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("erp_ledger_venture_record_idx").on(table.ventureId, table.operationalRecordId),
]);

export const erpJournals = mysqlTable("erp_journals", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  journalNumber: varchar("journalNumber", { length: 64 }).notNull(),
  accountingPeriodId: int("accountingPeriodId").notNull().references(() => erpAccountingPeriods.id),
  sourceOperationalRecordId: int("sourceOperationalRecordId").references(() => erpOperationalRecords.id),
  currency: varchar("currency", { length: 3 }).notNull(),
  narrative: varchar("narrative", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["draft", "posted", "voided"]).default("draft").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  postedByUserId: int("postedByUserId").references(() => users.id),
  postedAt: timestamp("postedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_journal_venture_number_unique").on(table.ventureId, table.journalNumber),
  index("erp_journal_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpJournalLines = mysqlTable("erp_journal_lines", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  journalId: int("journalId").notNull().references(() => erpJournals.id),
  accountMasterId: int("accountMasterId").notNull().references(() => erpMasterRecords.id),
  entrySide: mysqlEnum("entrySide", ["debit", "credit"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  narrative: varchar("narrative", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("erp_journal_line_venture_journal_idx").on(table.ventureId, table.journalId),
]);

export const erpAccountClassificationRevisions = mysqlTable("erp_account_classification_revisions", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  accountMasterId: int("accountMasterId").notNull().references(() => erpMasterRecords.id),
  revision: int("revision").notNull(),
  classificationFamily: mysqlEnum("classificationFamily", ["asset", "liability", "equity", "revenue", "expense", "memo"]).notNull(),
  statementSection: mysqlEnum("statementSection", ["current_assets", "noncurrent_assets", "current_liabilities", "noncurrent_liabilities", "equity", "operating_revenue", "other_income", "operating_expense", "other_expense", "memo"]).notNull(),
  normalBalance: mysqlEnum("normalBalance", ["debit", "credit"]).notNull(),
  effectiveFrom: varchar("effectiveFrom", { length: 10 }).notNull(),
  effectiveTo: varchar("effectiveTo", { length: 10 }),
  status: mysqlEnum("status", ["draft", "approved", "superseded", "retired"]).default("draft").notNull(),
  rationale: varchar("rationale", { length: 255 }).notNull(),
  adrReference: varchar("adrReference", { length: 96 }),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  approvedByUserId: int("approvedByUserId").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("erp_account_class_revision_unique").on(table.ventureId, table.accountMasterId, table.revision),
  index("erp_account_class_venture_account_status_idx").on(table.ventureId, table.accountMasterId, table.status),
]);

export const erpAccountingEvents = mysqlTable("erp_accounting_events", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  eventKey: varchar("eventKey", { length: 96 }).notNull(),
  eventType: varchar("eventType", { length: 96 }).notNull(),
  sourceDomain: varchar("sourceDomain", { length: 64 }).notNull(),
  sourceOperationalRecordId: int("sourceOperationalRecordId").notNull().references(() => erpOperationalRecords.id),
  sourceInventoryMovementId: int("sourceInventoryMovementId").references(() => erpInventoryMovements.id),
  accountingPeriodId: int("accountingPeriodId").references(() => erpAccountingPeriods.id),
  accountingDate: varchar("accountingDate", { length: 10 }).notNull(),
  transactionCurrency: varchar("transactionCurrency", { length: 3 }).notNull(),
  functionalCurrency: varchar("functionalCurrency", { length: 3 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  functionalAmount: decimal("functionalAmount", { precision: 18, scale: 2 }).notNull(),
  sourceSnapshot: json("sourceSnapshot").notNull(),
  dimensionsSnapshot: json("dimensionsSnapshot").notNull(),
  evidenceSnapshot: json("evidenceSnapshot").notNull(),
  schemaVersion: int("schemaVersion").notNull().default(1),
  emittedByUserId: int("emittedByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("erp_accounting_event_venture_key_unique").on(table.ventureId, table.eventKey),
  index("erp_accounting_event_venture_type_date_idx").on(table.ventureId, table.eventType, table.accountingDate),
]);

export const erpAccountingCalculationEvidence = mysqlTable("erp_accounting_calculation_evidence", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  calculationKey: varchar("calculationKey", { length: 140 }).notNull(),
  accountingEventId: int("accountingEventId").notNull().references(() => erpAccountingEvents.id),
  postingRuleRevisionId: int("postingRuleRevisionId").references(() => erpPostingRuleRevisions.id),
  engineVersion: varchar("engineVersion", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["completed", "refused"]).notNull(),
  inputHash: varchar("inputHash", { length: 64 }).notNull(),
  outputHash: varchar("outputHash", { length: 64 }).notNull(),
  previousRecordHash: varchar("previousRecordHash", { length: 64 }),
  recordHash: varchar("recordHash", { length: 64 }).notNull(),
  inputSnapshot: json("inputSnapshot").notNull(),
  calculationSnapshot: json("calculationSnapshot").notNull(),
  invariantSnapshot: json("invariantSnapshot").notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["pending_review", "reviewed", "rejected"]).notNull().default("pending_review"),
  calculatedByUserId: int("calculatedByUserId").notNull().references(() => users.id),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("erp_calc_evidence_venture_key_unique").on(table.ventureId, table.calculationKey),
  index("erp_calc_evidence_venture_event_idx").on(table.ventureId, table.accountingEventId, table.calculatedAt),
]);

export const erpPostingRuleRevisions = mysqlTable("erp_posting_rule_revisions", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  ruleCode: varchar("ruleCode", { length: 96 }).notNull(),
  ruleName: varchar("ruleName", { length: 160 }).notNull(),
  eventType: varchar("eventType", { length: 96 }).notNull(),
  revision: int("revision").notNull(),
  effectiveFrom: varchar("effectiveFrom", { length: 10 }).notNull(),
  effectiveTo: varchar("effectiveTo", { length: 10 }),
  status: mysqlEnum("status", ["draft", "reviewed", "approved", "superseded", "retired"]).default("draft").notNull(),
  lineConfiguration: json("lineConfiguration").notNull(),
  requiredDimensions: json("requiredDimensions").notNull(),
  changeRationale: varchar("changeRationale", { length: 255 }).notNull(),
  adrReference: varchar("adrReference", { length: 96 }),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  approvedByUserId: int("approvedByUserId").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("erp_posting_rule_venture_code_revision_unique").on(table.ventureId, table.ruleCode, table.revision),
  index("erp_posting_rule_venture_event_status_idx").on(table.ventureId, table.eventType, table.status),
]);

export const erpFinanceDimensionDefinitions = mysqlTable("erp_finance_dimension_definitions", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  description: varchar("description", { length: 255 }),
  status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
  requiredForProposal: boolean("requiredForProposal").notNull().default(false),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_finance_dimension_venture_code_unique").on(table.ventureId, table.code),
  index("erp_finance_dimension_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpFinanceDimensionValues = mysqlTable("erp_finance_dimension_values", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  dimensionDefinitionId: int("dimensionDefinitionId").notNull().references(() => erpFinanceDimensionDefinitions.id),
  code: varchar("code", { length: 96 }).notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
  attributes: json("attributes").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_finance_dimension_value_unique").on(table.ventureId, table.dimensionDefinitionId, table.code),
  index("erp_finance_dimension_value_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpJournalProposals = mysqlTable("erp_journal_proposals", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  proposalNumber: varchar("proposalNumber", { length: 96 }).notNull(),
  accountingEventId: int("accountingEventId").notNull().references(() => erpAccountingEvents.id),
  postingRuleRevisionId: int("postingRuleRevisionId").references(() => erpPostingRuleRevisions.id),
  accountingPeriodId: int("accountingPeriodId").references(() => erpAccountingPeriods.id),
  status: mysqlEnum("status", ["pending_review", "approved", "rejected", "refused"]).default("pending_review").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  proposalSnapshot: json("proposalSnapshot").notNull(),
  refusalReasons: json("refusalReasons").notNull(),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: varchar("reviewNote", { length: 255 }),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_journal_proposal_venture_number_unique").on(table.ventureId, table.proposalNumber),
  uniqueIndex("erp_journal_proposal_event_rule_unique").on(table.accountingEventId, table.postingRuleRevisionId),
  index("erp_journal_proposal_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpInventoryBalances = mysqlTable("erp_inventory_balances", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  itemMasterId: int("itemMasterId").notNull().references(() => erpMasterRecords.id),
  onHandQuantity: decimal("onHandQuantity", { precision: 18, scale: 3 }).notNull().default("0"),
  reservedQuantity: decimal("reservedQuantity", { precision: 18, scale: 3 }).notNull().default("0"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_stock_venture_item_unique").on(table.ventureId, table.itemMasterId),
]);

export const erpInventoryMovements = mysqlTable("erp_inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  itemMasterId: int("itemMasterId").notNull().references(() => erpMasterRecords.id),
  operationalRecordId: int("operationalRecordId").references(() => erpOperationalRecords.id),
  movementType: mysqlEnum("movementType", ["receipt", "issue", "adjust_in", "adjust_out", "reserve", "release"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 3 }).notNull(),
  onHandAfter: decimal("onHandAfter", { precision: 18, scale: 3 }).notNull(),
  reservedAfter: decimal("reservedAfter", { precision: 18, scale: 3 }).notNull(),
  narrative: varchar("narrative", { length: 255 }).notNull(),
  sourceFacts: json("sourceFacts"),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("erp_stock_move_venture_item_idx").on(table.ventureId, table.itemMasterId),
]);

export const erpCostingPolicyRevisions = mysqlTable("erp_costing_policy_revisions", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  policyCode: varchar("policyCode", { length: 96 }).notNull(),
  policyName: varchar("policyName", { length: 160 }).notNull(),
  costDomain: mysqlEnum("costDomain", ["inventory", "manufacturing", "project", "service", "asset", "investment"]).notNull(),
  valuationMethod: mysqlEnum("valuationMethod", ["fifo", "lifo", "moving_average", "weighted_average", "standard_cost", "specific_identification"]).notNull(),
  revision: int("revision").notNull(),
  effectiveFrom: varchar("effectiveFrom", { length: 10 }).notNull(),
  effectiveTo: varchar("effectiveTo", { length: 10 }),
  status: mysqlEnum("status", ["draft", "reviewed", "approved", "superseded", "retired"]).default("draft").notNull(),
  policyConfiguration: json("policyConfiguration").notNull(),
  sourceRequirements: json("sourceRequirements").notNull(),
  rationale: varchar("rationale", { length: 255 }).notNull(),
  adrReference: varchar("adrReference", { length: 96 }),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  approvedByUserId: int("approvedByUserId").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("erp_cost_policy_venture_code_revision_unique").on(table.ventureId, table.policyCode, table.revision),
  index("erp_cost_policy_venture_domain_status_idx").on(table.ventureId, table.costDomain, table.status),
]);

export const erpCostLayers = mysqlTable("erp_cost_layers", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  layerKey: varchar("layerKey", { length: 140 }).notNull(),
  itemMasterId: int("itemMasterId").notNull().references(() => erpMasterRecords.id),
  sourceInventoryMovementId: int("sourceInventoryMovementId").references(() => erpInventoryMovements.id),
  costingPolicyRevisionId: int("costingPolicyRevisionId").notNull().references(() => erpCostingPolicyRevisions.id),
  layerType: mysqlEnum("layerType", ["receipt", "issue", "landed_cost"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 3 }).notNull(),
  remainingQuantity: decimal("remainingQuantity", { precision: 18, scale: 3 }).notNull(),
  originalValue: decimal("originalValue", { precision: 18, scale: 2 }).notNull(),
  remainingValue: decimal("remainingValue", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  sourceSnapshot: json("sourceSnapshot").notNull(),
  attributionSnapshot: json("attributionSnapshot").notNull(),
  evidenceSnapshot: json("evidenceSnapshot").notNull(),
  sourceHash: varchar("sourceHash", { length: 64 }).notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("erp_cost_layer_venture_key_unique").on(table.ventureId, table.layerKey),
  index("erp_cost_layer_venture_item_idx").on(table.ventureId, table.itemMasterId, table.createdAt),
  index("erp_cost_layer_venture_policy_idx").on(table.ventureId, table.costingPolicyRevisionId),
]);

export const erpCostingCalculationEvidence = mysqlTable("erp_costing_calculation_evidence", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  calculationKey: varchar("calculationKey", { length: 140 }).notNull(),
  calculationType: mysqlEnum("calculationType", ["valuation_preview", "landed_cost_allocation", "validation_report"]).notNull(),
  costingPolicyRevisionId: int("costingPolicyRevisionId").references(() => erpCostingPolicyRevisions.id),
  costLayerId: int("costLayerId").references(() => erpCostLayers.id),
  accountingCalculationEvidenceId: int("accountingCalculationEvidenceId").references(() => erpAccountingCalculationEvidence.id),
  engineVersion: varchar("engineVersion", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["completed", "refused"]).notNull(),
  inputHash: varchar("inputHash", { length: 64 }).notNull(),
  outputHash: varchar("outputHash", { length: 64 }).notNull(),
  previousRecordHash: varchar("previousRecordHash", { length: 64 }),
  recordHash: varchar("recordHash", { length: 64 }).notNull(),
  inputSnapshot: json("inputSnapshot").notNull(),
  calculationSnapshot: json("calculationSnapshot").notNull(),
  invariantSnapshot: json("invariantSnapshot").notNull(),
  calculatedByUserId: int("calculatedByUserId").notNull().references(() => users.id),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("erp_cost_calc_venture_key_unique").on(table.ventureId, table.calculationKey),
  index("erp_cost_calc_venture_type_idx").on(table.ventureId, table.calculationType, table.calculatedAt),
]);

export const erpCostingCorrectionRequests = mysqlTable("erp_costing_correction_requests", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  requestKey: varchar("requestKey", { length: 140 }).notNull(),
  originalCostingCalculationEvidenceId: int("originalCostingCalculationEvidenceId").notNull().references(() => erpCostingCalculationEvidence.id),
  originalCostLayerId: int("originalCostLayerId").references(() => erpCostLayers.id),
  originalRecordHash: varchar("originalRecordHash", { length: 64 }).notNull(),
  originalSourceHash: varchar("originalSourceHash", { length: 64 }),
  correctionEvidenceReference: varchar("correctionEvidenceReference", { length: 180 }).notNull(),
  rationale: varchar("rationale", { length: 255 }).notNull(),
  readinessSnapshot: json("readinessSnapshot").notNull(),
  requestSnapshot: json("requestSnapshot").notNull(),
  requestedByUserId: int("requestedByUserId").notNull().references(() => users.id),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("erp_cost_corr_req_venture_key_unique").on(table.ventureId, table.requestKey),
  index("erp_cost_corr_req_venture_evidence_idx").on(table.ventureId, table.originalCostingCalculationEvidenceId, table.requestedAt),
]);

export const erpCostingCorrectionReviewEvidence = mysqlTable("erp_costing_correction_review_evidence", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  correctionRequestId: int("correctionRequestId").notNull().references(() => erpCostingCorrectionRequests.id),
  decision: mysqlEnum("decision", ["blocked", "rejected"]).notNull(),
  reviewNote: varchar("reviewNote", { length: 255 }).notNull(),
  reasonCodes: json("reasonCodes").notNull(),
  readinessSnapshot: json("readinessSnapshot").notNull(),
  reviewSnapshot: json("reviewSnapshot").notNull(),
  reviewedByUserId: int("reviewedByUserId").notNull().references(() => users.id),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
}, table => [
  index("erp_cost_corr_review_venture_request_idx").on(table.ventureId, table.correctionRequestId, table.reviewedAt),
]);

export const erpWorkflowDefinitions = mysqlTable("erp_workflow_definitions", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  key: varchar("key", { length: 96 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  domain: varchar("domain", { length: 64 }).notNull(),
  version: int("version").notNull().default(1),
  status: mysqlEnum("status", ["draft", "active", "retired"]).default("draft").notNull(),
  definition: json("definition").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("erp_workflow_venture_key_version_unique").on(table.ventureId, table.key, table.version),
  index("erp_workflow_venture_domain_idx").on(table.ventureId, table.domain),
]);

export const erpWorkflowInstances = mysqlTable("erp_workflow_instances", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  workflowDefinitionId: int("workflowDefinitionId").notNull().references(() => erpWorkflowDefinitions.id),
  operationalRecordId: int("operationalRecordId").references(() => erpOperationalRecords.id),
  status: mysqlEnum("status", ["active", "approved", "rejected", "cancelled", "completed"]).default("active").notNull(),
  currentNodeId: varchar("currentNodeId", { length: 96 }).notNull(),
  context: json("context").notNull(),
  startedByUserId: int("startedByUserId").notNull().references(() => users.id),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("erp_workflow_instance_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpWorkflowTasks = mysqlTable("erp_workflow_tasks", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  workflowInstanceId: int("workflowInstanceId").notNull().references(() => erpWorkflowInstances.id),
  nodeId: varchar("nodeId", { length: 96 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  assigneeUserId: int("assigneeUserId").references(() => users.id),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "completed", "cancelled"]).default("pending").notNull(),
  dueAt: timestamp("dueAt"),
  data: json("data").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("erp_workflow_task_venture_status_idx").on(table.ventureId, table.status),
]);

export const erpAuditEvents = mysqlTable("erp_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  domain: varchar("domain", { length: 64 }).notNull(),
  operationalRecordId: int("operationalRecordId").references(() => erpOperationalRecords.id),
  eventType: varchar("eventType", { length: 96 }).notNull(),
  actorUserId: int("actorUserId").references(() => users.id),
  payload: json("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("erp_audit_venture_domain_idx").on(table.ventureId, table.domain),
  index("erp_audit_record_idx").on(table.operationalRecordId),
]);

export const erpJurisdictionPacks = mysqlTable("erp_jurisdiction_packs", {
  id: int("id").autoincrement().primaryKey(),
  countryCode: varchar("countryCode", { length: 8 }).notNull(),
  version: varchar("version", { length: 48 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["draft", "reviewed", "approved", "retired"]).default("draft").notNull(),
  effectiveFrom: varchar("effectiveFrom", { length: 10 }).notNull(),
  effectiveTo: varchar("effectiveTo", { length: 10 }),
  sourceLinks: json("sourceLinks").notNull(),
  configuration: json("configuration").notNull(),
  testEvidence: json("testEvidence").notNull(),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("erp_pack_country_version_unique").on(table.countryCode, table.version), index("erp_pack_country_status_idx").on(table.countryCode, table.status)]);

export const erpVentureJurisdictionSelections = mysqlTable("erp_venture_jurisdiction_selections", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  jurisdictionPackId: int("jurisdictionPackId").notNull().references(() => erpJurisdictionPacks.id),
  purpose: mysqlEnum("purpose", ["tax", "payroll", "public_budget", "statutory_reporting"]).notNull(),
  status: mysqlEnum("status", ["active", "suspended", "retired"]).default("active").notNull(),
  selectedByUserId: int("selectedByUserId").notNull().references(() => users.id),
  selectedAt: timestamp("selectedAt").defaultNow().notNull(),
}, table => [uniqueIndex("erp_venture_pack_purpose_unique").on(table.ventureId, table.jurisdictionPackId, table.purpose), index("erp_venture_pack_active_idx").on(table.ventureId, table.status)]);

export const erpCurrencyProfiles = mysqlTable("erp_currency_profiles", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 3 }).notNull().unique(),
  name: varchar("name", { length: 96 }).notNull(),
  symbol: varchar("symbol", { length: 12 }),
  decimalPlaces: int("decimalPlaces").notNull().default(2),
  status: mysqlEnum("status", ["active", "retired"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const erpExchangeRates = mysqlTable("erp_exchange_rates", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  sourceCurrency: varchar("sourceCurrency", { length: 3 }).notNull(),
  targetCurrency: varchar("targetCurrency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 22, scale: 10 }).notNull(),
  rateDate: varchar("rateDate", { length: 10 }).notNull(),
  sourceReference: varchar("sourceReference", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["draft", "approved", "retired"]).default("draft").notNull(),
  approvedByUserId: int("approvedByUserId").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("erp_fx_venture_pair_date_unique").on(table.ventureId, table.sourceCurrency, table.targetCurrency, table.rateDate), index("erp_fx_venture_status_idx").on(table.ventureId, table.status)]);

export const erpBudgetNodes = mysqlTable("erp_budget_nodes", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  parentBudgetNodeId: int("parentBudgetNodeId"),
  jurisdictionPackId: int("jurisdictionPackId").references(() => erpJurisdictionPacks.id),
  level: mysqlEnum("level", ["national", "state_provincial", "municipal_local", "agency", "fund", "program", "project", "cost_center"]).notNull(),
  code: varchar("code", { length: 96 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  appropriatedAmount: decimal("appropriatedAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  committedAmount: decimal("committedAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  spentAmount: decimal("spentAmount", { precision: 18, scale: 2 }).notNull().default("0"),
  status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
  attributes: json("attributes").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("erp_budget_node_venture_code_unique").on(table.ventureId, table.code), index("erp_budget_node_parent_idx").on(table.ventureId, table.parentBudgetNodeId)]);

export const erpPayrollCalendars = mysqlTable("erp_payroll_calendars", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  jurisdictionPackId: int("jurisdictionPackId").references(() => erpJurisdictionPacks.id),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  cadence: mysqlEnum("cadence", ["weekly", "biweekly", "semimonthly", "monthly", "ad_hoc", "off_cycle"]).notNull(),
  workerCategory: mysqlEnum("workerCategory", ["employee", "director", "contractor", "temporary", "apprentice", "expatriate", "public_servant"]).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "suspended", "retired"]).default("draft").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("erp_payroll_calendar_venture_code_unique").on(table.ventureId, table.code), index("erp_payroll_calendar_venture_status_idx").on(table.ventureId, table.status)]);

export const erpPayrollRuns = mysqlTable("erp_payroll_runs", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  payrollCalendarId: int("payrollCalendarId").notNull().references(() => erpPayrollCalendars.id),
  jurisdictionPackId: int("jurisdictionPackId").references(() => erpJurisdictionPacks.id),
  periodStart: varchar("periodStart", { length: 10 }).notNull(),
  periodEnd: varchar("periodEnd", { length: 10 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: mysqlEnum("status", ["draft", "calculated", "pending_approval", "approved", "paid", "cancelled"]).default("draft").notNull(),
  componentInput: json("componentInput").notNull(),
  calculationEvidence: json("calculationEvidence").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  approvedByUserId: int("approvedByUserId").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("erp_payroll_run_venture_status_idx").on(table.ventureId, table.status), index("erp_payroll_run_calendar_idx").on(table.payrollCalendarId)]);

export const erpIntegrationConnections = mysqlTable("erp_integration_connections", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  adapterFamily: mysqlEnum("adapterFamily", ["banking", "attendance", "e_invoicing", "pos", "tax_filing", "statutory_reporting", "hris", "procurement"]).notNull(),
  provider: varchar("provider", { length: 120 }).notNull(),
  mode: mysqlEnum("mode", ["sandbox", "production"]).default("sandbox").notNull(),
  endpointReference: varchar("endpointReference", { length: 255 }),
  contractVersion: varchar("contractVersion", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["configured", "sandbox_connected", "reviewed", "approved", "suspended", "retired"]).default("configured").notNull(),
  healthStatus: mysqlEnum("healthStatus", ["unknown", "healthy", "degraded", "failed"]).default("unknown").notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  configuration: json("configuration").notNull(),
  ownerUserId: int("ownerUserId").references(() => users.id),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("erp_integration_venture_provider_unique").on(table.ventureId, table.adapterFamily, table.provider), index("erp_integration_venture_status_idx").on(table.ventureId, table.status)]);

export const erpIntegrationJobs = mysqlTable("erp_integration_jobs", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull().references(() => ventures.id),
  integrationConnectionId: int("integrationConnectionId").notNull().references(() => erpIntegrationConnections.id),
  workflowDefinitionId: int("workflowDefinitionId").references(() => erpWorkflowDefinitions.id),
  workflowInstanceId: int("workflowInstanceId").references(() => erpWorkflowInstances.id),
  operationalRecordId: int("operationalRecordId").references(() => erpOperationalRecords.id),
  status: mysqlEnum("status", ["queued", "awaiting_approval", "simulated", "completed", "failed", "cancelled"]).default("queued").notNull(),
  requestPayload: json("requestPayload").notNull(),
  responseEvidence: json("responseEvidence").notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("erp_int_job_venture_status_idx").on(table.ventureId, table.status), index("erp_int_job_connection_idx").on(table.integrationConnectionId)]);
