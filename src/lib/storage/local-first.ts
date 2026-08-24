import { supabase } from "@/integrations/supabase/client";
import { queueCreate, queueUpdate } from "./sync-manager";
import type { LocalEntity } from "./types";

const auth = supabase as unknown as { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } };

export const isBrowser = () => typeof indexedDB !== "undefined";
export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export async function currentUserId(): Promise<string | null> {
  try {
    return (await auth.auth.getUser()).data.user?.id ?? null;
  } catch {
    return null;
  }
}

export function localRow<T extends LocalEntity>(record: T): T & { id: string; created_at: string; updated_at: string } {
  return {
    ...record,
    id: record.remoteId ?? record.localId,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export async function createAndQueue<T extends LocalEntity>(
  entityType: Parameters<typeof queueCreate>[0],
  store: { create: (data: any) => Promise<T> },
  data: Record<string, unknown>,
): Promise<T> {
  const record = await store.create(data);
  await queueCreate(entityType, record);
  return record;
}

export async function updateAndQueue<T extends LocalEntity>(
  entityType: Parameters<typeof queueUpdate>[0],
  store: { update: (localId: string, data: any) => Promise<T | undefined> },
  localId: string,
  data: Record<string, unknown>,
): Promise<T> {
  const record = await store.update(localId, data);
  if (!record) throw new Error("Local record not found");
  await queueUpdate(entityType, record);
  return record;
}
