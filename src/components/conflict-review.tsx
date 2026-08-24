import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conflictResolution, conflictStore } from "@/lib/storage/conflicts";
import type { SyncConflict } from "@/lib/storage/types";

export function ConflictReviewPanel() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [merged, setMerged] = useState<Record<string, string>>({});

  async function load() {
    const next = await conflictStore.list();
    setConflicts(next);
    const first = next[0];
    if (first) {
      setMerged(
        Object.fromEntries(
          editableFields(first.localData, first.remoteData).map(([field, value]) => [
            field,
            formatValue(value),
          ]),
        ),
      );
    }
  }

  useEffect(() => {
    void load();
    const listener = () => void load();
    window.addEventListener("nurture-sync-status", listener);
    return () => window.removeEventListener("nurture-sync-status", listener);
  }, []);

  if (conflicts.length === 0) return null;
  const conflict = conflicts[0];
  const key = conflict.id;
  const fields = editableFields(conflict.localData, conflict.remoteData);
  const mergedRecord = Object.fromEntries(
    fields.map(([field, value]) => [field, merged[field] ?? formatValue(value)]),
  );

  return (
    <Card className="mb-4 border-warning/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Conflict requires review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <ConflictValues title="Local changes" values={conflict.localData} fields={fields} />
          <ConflictValues title="Server changes" values={conflict.remoteData} fields={fields} />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Merged version</div>
          {fields.map(([field]) => (
            <label key={field} className="block text-xs text-muted-foreground">
              {readableField(field)}
              <input
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
                value={merged[field] ?? ""}
                onChange={(event) => setMerged((current) => ({ ...current, [field]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" title="Keep this device's values and upload them" onClick={() => void conflictResolution.keepLocal(key)}>Keep Local</Button>
          <Button size="sm" variant="outline" title="Use the server values without uploading local changes" onClick={() => void conflictResolution.keepRemote(key)}>Keep Remote</Button>
          <Button
            size="sm"
            variant="secondary"
            title="Save the edited values and upload them"
            onClick={() => {
              void conflictResolution.merge(key, mergedRecord);
            }}
          >
            Save Merged Version
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const hiddenFields = new Set([
  "id",
  "localId",
  "remoteId",
  "createdAt",
  "updatedAt",
  "created_at",
  "updated_at",
  "lastSyncedAt",
  "syncStatus",
  "syncError",
  "version",
]);

function editableFields(local: Record<string, unknown>, remote: Record<string, unknown>) {
  const fields = new Set([...Object.keys(local), ...Object.keys(remote)]);
  return [...fields].filter((field) => !hiddenFields.has(field)).map((field) => [
    field,
    local[field] ?? remote[field] ?? "",
  ] as const);
}

function readableField(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function ConflictValues({
  title,
  values,
  fields,
}: {
  title: string;
  values: Record<string, unknown>;
  fields: readonly (readonly [string, unknown])[];
}) {
  return (
    <div className="rounded-md bg-muted p-3 text-xs">
      <div className="mb-2 font-medium text-foreground">{title}</div>
      <dl className="space-y-1">
        {fields.map(([field]) => (
          <div key={field} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
            <dt className="text-muted-foreground">{readableField(field)}</dt>
            <dd className="break-words text-foreground">{formatValue(values[field]) || "Not recorded"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
