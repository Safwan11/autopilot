"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { issueImportToken, revokeImportToken } from "@/lib/importer";

export async function createImportToken(): Promise<{ token: string }> {
  const user = await requireUser();
  const token = await issueImportToken(user.id);
  revalidatePath("/importer");
  return { token };
}

export async function deleteImportToken() {
  const user = await requireUser();
  await revokeImportToken(user.id);
  revalidatePath("/importer");
}
