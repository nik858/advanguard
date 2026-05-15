import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.crm_DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  process.env.crm_DATABASE_URL;

if (!url) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED / crm_DATABASE_URL_UNPOOLED (or fall back to *DATABASE_URL) to run drizzle-kit",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
