import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// No-op inside the real Next.js app (it already loads .env.local before any
// app code runs) — but this module is also imported by the standalone seed
// script (src/lib/db/seed.ts, run via `tsx`, outside Next's bootstrap), so
// it can't assume that already happened.
loadEnvConfig(process.cwd());

// Pooled connection (port 6543) — safe for serverless: many short-lived
// connections opening/closing per request. Never use the direct connection
// here; that one is reserved for drizzle-kit migrations (see drizzle.config.ts).
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client, { schema });
