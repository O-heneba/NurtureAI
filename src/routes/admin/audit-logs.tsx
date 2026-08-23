import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/audit-logs")({
  component: AdminAuditLogs,
});

function AdminAuditLogs() {
  return (
    <AppLayout>
      <PageHeader
        title="Audit logs"
        description="Review system audit logs and activity"
        icon={<ShieldAlert className="h-5 w-5" />}
      />
      <Card className="rounded-xl">
        <CardContent>
          <div className="text-sm text-muted-foreground">
            View a chronological list of admin actions and system events.
          </div>
          <div className="mt-4">
            <Button>Refresh logs</Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
