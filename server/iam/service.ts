import { and, eq, isNull, or } from "drizzle-orm";
import { platformAccessAssignments, platformPermissions, platformRolePermissions, platformRoles, accessChangeRequests, users, ventureMemberships } from "../../drizzle/schema";
import type { PlatformAccessScope, PlatformPermissionKey } from "@shared/domain/platform";
import { getDb } from "../db";

const permissionDefinitions: Array<{ key: PlatformPermissionKey; name: string; category: string; description: string }> = [
  { key: "architecture.view", name: "View architecture", category: "architecture", description: "Read ADRs, topology, and architecture scorecards." },
  { key: "architecture.review", name: "Review architecture", category: "architecture", description: "Participate in formal architecture review and decision workflows." },
  { key: "catalog.manage", name: "Manage catalog", category: "platform", description: "Maintain service ownership, lifecycle, and catalog metadata." },
  { key: "assistant.query", name: "Query architecture assistant", category: "assistant", description: "Use read-only evidence-bounded venture architecture chat." },
  { key: "governance.view", name: "View governance", category: "governance", description: "View decision cases and evidence review state." },
  { key: "governance.manage", name: "Manage governance", category: "governance", description: "Create and approve governed decision records where other policies permit." },
  { key: "iam.view", name: "View access management", category: "identity", description: "Inspect scoped roles, assignments, and access-review posture." },
  { key: "iam.manage", name: "Manage access", category: "identity", description: "Request, review, and apply scoped access changes." },
  { key: "module.finance.manage", name: "Manage finance module", category: "module", description: "Operate finance context controls within an authorized venture." },
  { key: "module.procurement.manage", name: "Manage procurement module", category: "module", description: "Operate procurement context controls within an authorized venture." },
  { key: "module.inventory.manage", name: "Manage inventory module", category: "module", description: "Operate inventory context controls within an authorized venture." },
  { key: "module.people.manage", name: "Manage people module", category: "module", description: "Operate people context controls within an authorized venture." },
  { key: "module.projects.manage", name: "Manage projects module", category: "module", description: "Operate project context controls within an authorized venture." },
];

const roleDefinitions = [
  { key: "portfolio_administrator", name: "Portfolio administrator", description: "Govern architecture, access, and portfolio controls across permitted ventures.", permissions: permissionDefinitions.map(permission => permission.key) },
  { key: "venture_administrator", name: "Venture administrator", description: "Manage governed access, decisions, and context controls within one venture.", permissions: ["architecture.view", "architecture.review", "assistant.query", "governance.view", "governance.manage", "iam.view", "iam.manage"] as PlatformPermissionKey[] },
  { key: "architecture_reviewer", name: "Architecture reviewer", description: "Review ADRs, maturity evidence, and build-versus-buy decisions.", permissions: ["architecture.view", "architecture.review", "assistant.query", "governance.view"] as PlatformPermissionKey[] },
  { key: "module_operator", name: "Module operator", description: "Operate approved module controls within a narrow module scope.", permissions: ["assistant.query", "governance.view"] as PlatformPermissionKey[] },
  { key: "observer", name: "Observer", description: "Read platform governance without authority to mutate operating controls.", permissions: ["architecture.view", "assistant.query", "governance.view", "iam.view"] as PlatformPermissionKey[] },
] as const;

const legacyMembershipPermissions: Record<string, PlatformPermissionKey[]> = {
  portfolio_admin: roleDefinitions[0].permissions,
  venture_lead: roleDefinitions[1].permissions,
  finance_lead: ["architecture.view", "assistant.query", "governance.view", "module.finance.manage"],
  operator: ["architecture.view", "assistant.query", "governance.view"],
  viewer: ["architecture.view", "assistant.query", "governance.view"],
};

export async function ensureIamCatalog() {
  const db = await getDb();
  if (!db) return;
  for (const role of roleDefinitions) {
    await db.insert(platformRoles).values({ key: role.key, name: role.name, description: role.description, kind: "system", status: "active" }).onDuplicateKeyUpdate({ set: { name: role.name, description: role.description, status: "active" } });
  }
  for (const permission of permissionDefinitions) {
    await db.insert(platformPermissions).values(permission).onDuplicateKeyUpdate({ set: { name: permission.name, category: permission.category, description: permission.description } });
  }
  const roles = await db.select().from(platformRoles);
  const permissions = await db.select().from(platformPermissions);
  const roleIdByKey = new Map(roles.map(role => [role.key, role.id]));
  const permissionIdByKey = new Map(permissions.map(permission => [permission.key, permission.id]));
  for (const role of roleDefinitions) {
    const roleId = roleIdByKey.get(role.key);
    if (!roleId) continue;
    for (const permissionKey of role.permissions) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) continue;
      await db.insert(platformRolePermissions).values({ roleId, permissionId }).onDuplicateKeyUpdate({ set: { roleId, permissionId } });
    }
  }
}

export async function getIamCatalog() {
  await ensureIamCatalog();
  const db = await getDb();
  if (!db) return { roles: [], permissions: [] };
  const [roles, permissions, links] = await Promise.all([
    db.select().from(platformRoles), db.select().from(platformPermissions), db.select().from(platformRolePermissions),
  ]);
  return {
    permissions,
    roles: roles.map(role => ({ ...role, permissionIds: links.filter(link => link.roleId === role.id).map(link => link.permissionId) })),
  };
}

export async function getVentureAccessDirectory(ventureId: number) {
  await ensureIamCatalog();
  const db = await getDb();
  if (!db) return { members: [], assignments: [], requests: [] };
  const [members, assignments, requests] = await Promise.all([
    db.select({ userId: users.id, name: users.name, email: users.email, membershipRole: ventureMemberships.role, membershipStatus: ventureMemberships.status })
      .from(ventureMemberships).innerJoin(users, eq(ventureMemberships.userId, users.id)).where(eq(ventureMemberships.ventureId, ventureId)),
    db.select({ id: platformAccessAssignments.id, userId: platformAccessAssignments.userId, userName: users.name, roleKey: platformRoles.key, roleName: platformRoles.name, scope: platformAccessAssignments.scope, moduleId: platformAccessAssignments.moduleId, status: platformAccessAssignments.status, expiresAt: platformAccessAssignments.expiresAt })
      .from(platformAccessAssignments).innerJoin(users, eq(platformAccessAssignments.userId, users.id)).innerJoin(platformRoles, eq(platformAccessAssignments.roleId, platformRoles.id)).where(or(eq(platformAccessAssignments.ventureId, ventureId), eq(platformAccessAssignments.scope, "portfolio"))),
    db.select({ id: accessChangeRequests.id, subjectUserId: accessChangeRequests.subjectUserId, subjectName: users.name, action: accessChangeRequests.action, requestedRoleKey: accessChangeRequests.requestedRoleKey, scope: accessChangeRequests.scope, moduleId: accessChangeRequests.moduleId, status: accessChangeRequests.status, rationale: accessChangeRequests.rationale, createdAt: accessChangeRequests.createdAt })
      .from(accessChangeRequests).innerJoin(users, eq(accessChangeRequests.subjectUserId, users.id)).where(or(eq(accessChangeRequests.ventureId, ventureId), eq(accessChangeRequests.scope, "portfolio"))),
  ]);
  return { members, assignments, requests };
}

export async function getEffectivePermissions(input: { userId: number; ventureId: number; moduleId?: string }) {
  await ensureIamCatalog();
  const db = await getDb();
  if (!db) return [] as PlatformPermissionKey[];
  const membership = await db.select({ role: ventureMemberships.role, status: ventureMemberships.status }).from(ventureMemberships).where(and(eq(ventureMemberships.userId, input.userId), eq(ventureMemberships.ventureId, input.ventureId))).limit(1);
  if (!membership[0] || membership[0].status !== "active") return [] as PlatformPermissionKey[];
  const legacy = legacyMembershipPermissions[membership[0].role] ?? [];
  const assignmentRows = await db.select({ permissionKey: platformPermissions.key, scope: platformAccessAssignments.scope, moduleId: platformAccessAssignments.moduleId })
    .from(platformAccessAssignments).innerJoin(platformRoles, eq(platformAccessAssignments.roleId, platformRoles.id)).innerJoin(platformRolePermissions, eq(platformRolePermissions.roleId, platformRoles.id)).innerJoin(platformPermissions, eq(platformRolePermissions.permissionId, platformPermissions.id))
    .where(and(eq(platformAccessAssignments.userId, input.userId), eq(platformAccessAssignments.status, "active"), or(eq(platformAccessAssignments.ventureId, input.ventureId), eq(platformAccessAssignments.scope, "portfolio"))));
  const assignmentPermissions = assignmentRows.filter(assignment => !assignment.moduleId || assignment.moduleId === input.moduleId).map(assignment => assignment.permissionKey as PlatformPermissionKey);
  return Array.from(new Set([...legacy, ...assignmentPermissions]));
}

export async function createAccessRequest(input: { ventureId: number; subjectUserId: number; requestedByUserId: number; action: "grant" | "revoke" | "suspend"; requestedRoleKey: string; scope: PlatformAccessScope; moduleId?: string; rationale: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const result = await db.insert(accessChangeRequests).values(input);
  return { id: Number(result[0].insertId), status: "pending" as const, ...input };
}

export function resolveAccessAssignmentEffect(action: "grant" | "revoke" | "suspend") {
  if (action === "revoke") return { operation: "delete" as const };
  if (action === "suspend") return { operation: "suspend" as const, status: "suspended" as const };
  return { operation: "grant" as const, status: "active" as const };
}

export async function applyAccessRequest(input: { requestId: number; reviewerUserId: number; expectedVentureId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const request = await db.select().from(accessChangeRequests).where(eq(accessChangeRequests.id, input.requestId)).limit(1);
  if (!request[0]) throw new Error("Access request not found.");
  if (request[0].ventureId !== input.expectedVentureId) throw new Error("Access request does not belong to the active venture.");
  const role = await db.select().from(platformRoles).where(eq(platformRoles.key, request[0].requestedRoleKey)).limit(1);
  if (!role[0]) throw new Error("Requested role is not registered.");
  const assignmentWhere = and(
    eq(platformAccessAssignments.userId, request[0].subjectUserId),
    eq(platformAccessAssignments.ventureId, request[0].ventureId ?? 0),
    eq(platformAccessAssignments.roleId, role[0].id),
    eq(platformAccessAssignments.scope, request[0].scope),
    request[0].moduleId ? eq(platformAccessAssignments.moduleId, request[0].moduleId) : isNull(platformAccessAssignments.moduleId),
  );
  const effect = resolveAccessAssignmentEffect(request[0].action);
  if (effect.operation === "grant") {
    await db.insert(platformAccessAssignments).values({ userId: request[0].subjectUserId, roleId: role[0].id, scope: request[0].scope, ventureId: request[0].ventureId, moduleId: request[0].moduleId, status: "active", assignedByUserId: input.reviewerUserId });
  } else if (effect.operation === "suspend") {
    await db.update(platformAccessAssignments).set({ status: effect.status }).where(assignmentWhere);
  } else {
    await db.delete(platformAccessAssignments).where(assignmentWhere);
  }
  await db.update(accessChangeRequests).set({ status: "applied", reviewedByUserId: input.reviewerUserId, reviewedAt: new Date() }).where(eq(accessChangeRequests.id, input.requestId));
  return { success: true, requestId: input.requestId, status: "applied" as const };
}
