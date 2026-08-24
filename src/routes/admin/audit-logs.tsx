import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { conflictStore } from "@/lib/storage/conflicts";
import type { SyncConflictHistory } from "@/lib/storage/types";

export const Route = createFileRoute("/admin/audit-logs")({
  component: AdminAuditLogs,
});

function AdminAuditLogs() {
  const [history, setHistory] = useState<SyncConflictHistory[]>([]);

  async function refresh() {
    setHistory(await conflictStore.history());
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Audit logs"
        description="Review system audit logs and activity"
        icon={<ShieldAlert className="h-5 w-5" />}
      />
      <Card className="rounded-xl">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">Resolved synchronization conflicts</div>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>Refresh logs</Button>
          </div>
          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No resolved conflicts recorded.
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {history.map((entry) => (
                <div key={entry.id} className="grid gap-2 p-4 text-sm sm:grid-cols-4">
                  <div><div className="text-xs text-muted-foreground">Entity</div><div className="font-medium">{entry.entityType}</div></div>
                  <div><div className="text-xs text-muted-foreground">Record</div><div className="font-mono text-xs">{entry.localId}</div></div>
                  <div><div className="text-xs text-muted-foreground">Resolution</div><div className="capitalize">{entry.resolution.replace("resolved-", "")}</div></div>
                  <div><div className="text-xs text-muted-foreground">Sync result</div><div className="capitalize">{entry.synchronizationStatus}</div><div className="text-xs text-muted-foreground">{new Date(entry.resolvedAt).toLocaleString()}</div></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
