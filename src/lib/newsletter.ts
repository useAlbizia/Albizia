"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { subscribers } from "./db/schema";

export type SubscribeState = { ok?: boolean; error?: string };

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const parsed = z.string().email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: "E-mail inválido." };
  const email = parsed.data;

  // Insert, or re-activate a previously unsubscribed address.
  await db
    .insert(subscribers)
    .values({ email, source: "site" })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: { status: "active", unsubscribedAt: sql`null` },
    });

  return { ok: true };
}

export type UnsubscribeState = { done?: boolean; error?: string };

export async function unsubscribe(
  _prev: UnsubscribeState,
  formData: FormData
): Promise<UnsubscribeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "E-mail ausente." };

  await db
    .update(subscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(subscribers.email, email));

  return { done: true };
}
