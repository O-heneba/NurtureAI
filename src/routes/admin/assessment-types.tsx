import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/admin/assessment-types")({
  component: AdminAssessmentTypes,
});

function AdminAssessmentTypes() {
  return (
    <AppLayout>
      <PageHeader
        title="Assessment types"
        description="Configure assessment templates and types"
        icon={<ClipboardCheck className="h-5 w-5" />}
      />
      <Card className="rounded-xl">
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Define and manage assessment types used by CHPS workers.
          </div>
          <div className="mt-4">
            <Button>Create assessment type</Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
