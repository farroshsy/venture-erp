import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
