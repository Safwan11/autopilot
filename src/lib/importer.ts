import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Creates (or replaces) the user's importer token. Only the hash is stored; the token is shown once. */
export async function issueImportToken(userId: string): Promise<string> {
  const token = `jp_${randomBytes(24).toString("base64url")}`;
  await db.update(users).set({ importTokenHash: hash(token), importTokenCreatedAt: new Date() }).where(eq(users.id, userId));
  return token;
}

export async function revokeImportToken(userId: string) {
  await db.update(users).set({ importTokenHash: null, importTokenCreatedAt: null }).where(eq(users.id, userId));
}

export async function userFromImportToken(header: string | null): Promise<User | null> {
  const token = header?.match(/^Bearer\s+(jp_[A-Za-z0-9_-]{20,})$/)?.[1];
  if (!token) return null;
  const [u] = await db.select().from(users).where(eq(users.importTokenHash, hash(token)));
  return u ?? null;
}
