import { personNotesStore } from "@/lib/storage/local-store";
import { createAndQueue, isBrowser, isOffline, localRow, updateAndQueue } from "@/lib/storage/local-first";
import type { LocalPersonNotes } from "@/lib/storage/types";

export type PersonNoteRow = LocalPersonNotes & { id: string; created_at: string; updated_at: string };

export async function listPersonNotes(personId: string): Promise<PersonNoteRow[]> {
  const rows = await personNotesStore.listByPerson(personId);
  if (rows.length || isOffline() || isBrowser()) return rows.filter((row) => row.syncStatus !== "deleted").map((row) => localRow(row) as PersonNoteRow);
  return [];
}

export async function createPersonNote(input: Omit<LocalPersonNotes, keyof import("@/lib/storage/types").SyncMetadata>): Promise<PersonNoteRow> {
  if (!isBrowser()) throw new Error("Person notes require a browser");
  return localRow(await createAndQueue("person_notes", personNotesStore, input as Record<string, unknown>)) as PersonNoteRow;
}

export async function updatePersonNote(localId: string, input: Partial<Pick<LocalPersonNotes, "text" | "type">>): Promise<PersonNoteRow> {
  if (!isBrowser()) throw new Error("Person notes require a browser");
  return localRow(await updateAndQueue("person_notes", personNotesStore, localId, input as Record<string, unknown>)) as PersonNoteRow;
}