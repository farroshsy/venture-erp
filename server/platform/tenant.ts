import { TRPCError } from "@trpc/server";
import { getVentureMembership } from "../db";

export async function requireVentureMembership(userId: number, ventureId: number) {
  const membership = await getVentureMembership(userId, ventureId);
  if (!membership || membership.status !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to the selected venture." });
  }
  return membership;
}

export function requireVentureRole(role: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your venture role cannot perform this action." });
  }
}

export function canPerformVentureAction(role: string, allowedRoles: string[]) {
  return allowedRoles.includes(role);
}
