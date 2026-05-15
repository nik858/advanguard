import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazy Drizzle singleton. We construct it on first access so that simply
 * importing this module never throws when DATABASE_URL is missing at build
 * time. At runtime, a query call will fail loudly if the env var is absent.
 */
export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL || process.env.crm_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL (or crm_DATABASE_URL) not set");
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}
