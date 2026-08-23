import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Home, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  return (
    <AppLayout>
      <PageHeader
        title="Admin"
        description="System administration and configuration"
        icon={<Users className="h-5 w-5" />}
        actions={
          <Link to="/admin/users">
            <Button>Manage users</Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardContent>
            <div className="font-semibold">Users & roles</div>
            <div className="text-sm text-muted-foreground">
              Create and manage user accounts and roles.
            </div>
            <div className="mt-4">
              <Link to="/admin/users">
                <Button>Open</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent>
            <div className="font-semibold">Geography</div>
            <div className="text-sm text-muted-foreground">
              Manage regions, districts and CHPS zones.
            </div>
            <div className="mt-4">
              <Link to="/admin/geography">
                <Button>Open</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent>
            <div className="font-semibold">Facilities</div>
            <div className="text-sm text-muted-foreground">
              Manage CHPS and referral facilities.
            </div>
            <div className="mt-4">
              <Link to="/admin/facilities">
                <Button>Open</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent>
            <div className="font-semibold">Analytics & Audit</div>
            <div className="text-sm text-muted-foreground">
              View system analytics and audit logs.
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/admin/analytics">
                <Button>Analytics</Button>
              </Link>
              <Link to="/admin/audit-logs">
                <Button variant="outline">Audit logs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
