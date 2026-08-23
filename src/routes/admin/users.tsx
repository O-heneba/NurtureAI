import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProfilesWithRoles, assignRole, removeRole } from "@/lib/server.functions";
import type { ProfileWithRoles } from "@/lib/admin.users.server";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [rows, setRows] = useState<ProfileWithRoles[]>([]);
  const [loading, setLoading] = useState(false);

  const listProfilesWithRolesFn = useServerFn(listProfilesWithRoles);
  const assignRoleFn = useServerFn(assignRole);
  const removeRoleFn = useServerFn(removeRole);

  async function load() {
    setLoading(true);
    try {
      const data = await listProfilesWithRolesFn();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onAssign(id: string, role: "chps_worker" | "supervisor" | "administrator") {
    try {
      await assignRoleFn({ data: { user_id: id, role } });
      toast.success("Role assigned");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to assign role");
    }
  }

  async function onRemove(id: string, role: string) {
    try {
      await removeRoleFn({ data: { user_id: id, role } });
      toast.success("Role removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to remove role");
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Users & roles"
        description="Manage user accounts and roles"
        icon={<Users className="h-5 w-5" />}
      />

      <Card className="rounded-xl">
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Create, edit and assign roles to users.
          </div>
          <div className="mt-4 space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loading &&
              rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.full_name ?? r.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.facility ?? ""} · {r.phone ?? ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.roles.map((role) => (
                      <button
                        key={role}
                        className="px-2 py-1 rounded-md border text-sm"
                        onClick={() => onRemove(r.id, role)}
                      >
                        {role} ✕
                      </button>
                    ))}
                    <div className="flex items-center gap-1">
                      <Button onClick={() => onAssign(r.id, "chps_worker")}>CHPS worker</Button>
                      <Button onClick={() => onAssign(r.id, "supervisor")}>Supervisor</Button>
                      <Button onClick={() => onAssign(r.id, "administrator")}>Administrator</Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
