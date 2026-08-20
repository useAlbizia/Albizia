import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is a standalone CLI — it doesn't know Next.js's .env.local
// convention on its own, so load it the same way Next itself does.
loadEnvConfig(process.cwd());

// drizzle-kit (migrations) needs the DIRECT connection (port 5432), not the
// pooled one the app uses at runtime — pooled connections don't support the
// session-level features migrations rely on.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT!,
  },
});
