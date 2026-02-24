// Deno PostgreSQL client for Neon/Supabase
// Usage: Can work with both Neon and Supabase PostgreSQL connections

import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const DATABASE_URL = Deno.env.get("DATABASE_URL");

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const pool = new Pool(DATABASE_URL, 3);

export async function query(sql: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const result = await client.queryObject(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne(sql: string, params?: unknown[]) {
  const results = await query(sql, params);
  return results?.[0];
}

export async function execute(sql: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    await client.queryObject(sql, params);
  } finally {
    client.release();
  }
}
