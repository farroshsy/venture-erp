import { and, eq } from "drizzle-orm";
import { accessChangeRequests, platformAccessAssignments, platformRoles } from "../drizzle/schema";
import { getDb } from "../server/db";
import { applyAccessRequest, createAccessRequest, getIamCatalog } from "../server/iam/service";

const ventureId = 1;
const userId = 1;
const roleKey = "module_operator";
const moduleId = "finance";
const validationTag = "VALIDATION-ACCESS-LIFECYCLE-20260824";
const db = await getDb();
if (!db) throw new Error("Database is not available.");
await getIamCatalog();
const [role] = await db.select().from(platformRoles).where(eq(platformRoles.key, roleKey)).limit(1);
if (!role) throw new Error("Validation role is unavailable.");

async function apply(action: "grant" | "suspend" | "revoke") {
  let [request] = await db.select().from(accessChangeRequests).where(and(eq(accessChangeRequests.ventureId, ventureId), eq(accessChangeRequests.subjectUserId, userId), eq(accessChangeRequests.action, action), eq(accessChangeRequests.rationale, `${validationTag}:${action}`))).limit(1);
  if (!request) {
    const created = await createAccessRequest({ ventureId, subjectUserId: userId, requestedByUserId: userId, action, requestedRoleKey: roleKey, scope: "module", moduleId, rationale: `${validationTag}:${action}` });
    [request] = await db.select().from(accessChangeRequests).where(eq(accessChangeRequests.id, created.id)).limit(1);
  }
  if (!request) throw new Error(`Unable to create ${action} validation request.`);
  if (request.status === "pending") await applyAccessRequest({ requestId: request.id, reviewerUserId: userId, expectedVentureId: ventureId });
  return request.id;
}

const grantRequestId = await apply("grant");
const [granted] = await db.select().from(platformAccessAssignments).where(and(eq(platformAccessAssignments.ventureId, ventureId), eq(platformAccessAssignments.userId, userId), eq(platformAccessAssignments.roleId, role.id), eq(platformAccessAssignments.scope, "module"), eq(platformAccessAssignments.moduleId, moduleId))).limit(1);
if (granted?.status !== "active") throw new Error("Validation grant did not produce an active scoped assignment.");
const suspendRequestId = await apply("suspend");
const [suspended] = await db.select().from(platformAccessAssignments).where(and(eq(platformAccessAssignments.ventureId, ventureId), eq(platformAccessAssignments.userId, userId), eq(platformAccessAssignments.roleId, role.id), eq(platformAccessAssignments.scope, "module"), eq(platformAccessAssignments.moduleId, moduleId))).limit(1);
if (suspended?.status !== "suspended") throw new Error("Validation suspension did not preserve the scoped assignment as suspended.");
const revokeRequestId = await apply("revoke");
const remaining = await db.select().from(platformAccessAssignments).where(and(eq(platformAccessAssignments.ventureId, ventureId), eq(platformAccessAssignments.userId, userId), eq(platformAccessAssignments.roleId, role.id), eq(platformAccessAssignments.scope, "module"), eq(platformAccessAssignments.moduleId, moduleId)));
if (remaining.length) throw new Error("Validation revoke did not remove the scoped assignment.");
console.log(JSON.stringify({ validationTag, grantRequestId, suspendRequestId, revokeRequestId, finalScopedAssignmentCount: remaining.length }, null, 2));
