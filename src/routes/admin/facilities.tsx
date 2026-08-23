import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export const Route = createFileRoute("/admin/facilities")({
  component: AdminFacilities,
});

function AdminFacilities() {
  return (
    <AppLayout>
      <PageHeader
        title="Facilities"
        description="Manage CHPS and referral facilities"
        icon={<Home className="h-5 w-5" />}
      />
      <Card className="rounded-xl">
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Add or edit facility records used for referrals and assignments.
          </div>
          <div className="mt-4">
            <Button>Create facility</Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
