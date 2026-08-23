import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  return (
    <AppLayout>
      <PageHeader
        title="Analytics"
        description="System-wide analytics and KPIs"
        icon={<BarChart3 className="h-5 w-5" />}
      />
      <Card className="rounded-xl">
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Summary charts and exportable reports will appear here.
          </div>
          <div className="mt-4">
            <Button>Refresh</Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
