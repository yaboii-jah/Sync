export interface AdminUserAccess {
  user_id: string;
  is_admin: boolean;
  is_protected: boolean;
  is_self: boolean;
  can_grant: boolean;
  can_revoke: boolean;
}

export interface AdminAccessRequest {
  userId: string;
  grantAdmin: boolean;
  requestId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAdminAccessRequest(value: unknown): value is AdminAccessRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  return typeof request.userId === "string" && UUID.test(request.userId)
    && typeof request.requestId === "string" && UUID.test(request.requestId)
    && typeof request.grantAdmin === "boolean";
}

/** Reject malformed or mismatched RPC data before exposing access controls. */
export function parseAdminUserAccess(value: unknown, userId: string): AdminUserAccess {
  if (!value || typeof value !== "object") throw new Error("Could not verify admin access.");
  const access = value as Record<string, unknown>;
  if (typeof access.user_id !== "string" || access.user_id.toLowerCase() !== userId.toLowerCase() || !UUID.test(userId)
    || !["is_admin", "is_protected", "is_self", "can_grant", "can_revoke"]
      .every((key) => typeof access[key] === "boolean")
    || (access.is_protected && !access.is_admin)
    || (access.can_grant && access.is_admin)
    || (access.can_revoke && (!access.is_admin || access.is_protected || access.is_self))) {
    throw new Error("Could not verify admin access.");
  }
  return access as unknown as AdminUserAccess;
}
