import "server-only";
import { desc } from "drizzle-orm";
import { db } from "./db/client";
import { auditLog } from "./db/schema";
import { getAdminUser } from "./auth/dal";

// Records one admin action in the append-only audit trail. Best-effort: an
// audit failure must never break the action it's describing, so it only logs.
export async function logAudit(entry: {
  action: string;
  entity?: string;
  entityId?: string;
  detail?: unknown;
}): Promise<void> {
  try {
    const user = await getAdminUser();
    await db.insert(auditLog).values({
      actorEmail: user?.email ?? "desconhecido",
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      detail: entry.detail === undefined ? null : entry.detail,
    });
  } catch (err) {
    console.error("audit log write failed", err);
  }
}

export type AuditEntry = {
  id: string;
  actorEmail: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  detail: unknown;
  createdAt: Date;
};

export async function getAuditLog(limit = 200): Promise<AuditEntry[]> {
  const rows = await db.query.auditLog.findMany({
    orderBy: [desc(auditLog.createdAt)],
    limit,
  });
  return rows as AuditEntry[];
}
