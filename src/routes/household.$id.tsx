import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { EmptyState, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Home, Save, Users } from "lucide-react";
import {
  getWorkflowHousehold,
  listWorkflowPersonsByHousehold,
  updateWorkflowHousehold,
} from "@/lib/household-person.service";

export const Route = createFileRoute("/household/$id")({
  loader: async ({ params }) => {
    const household = await getWorkflowHousehold(params.id);
    if (!household) throw notFound();
    const members = await listWorkflowPersonsByHousehold(household.localId);
    return { household, members };
  },
  component: HouseholdDetail,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState title="Household not found" action={<Link to="/households">Back to households</Link>} />
    </AppLayout>
  ),
});

function HouseholdDetail() {
  const { household: initial, members } = Route.useLoaderData();
  const [household, setHousehold] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    try {
      const saved = await updateWorkflowHousehold(household.localId, {
        head_name: household.head_name,
        house_no: household.house_no,
        phone: household.phone,
        address: household.address,
      });
      setHousehold(saved);
      setEditing(false);
      setMessage(saved.workflowStatus === "pending" ? "Saved locally · pending sync" : "Synced");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title={household.head_name}
        description={`${household.house_no} · ${household.community_id ?? "Community not recorded"}`}
        icon={<Home className="h-5 w-5" />}
        breadcrumbs={[{ label: "Households", to: "/households" }, { label: household.head_name }]}
        actions={<Badge variant="outline">{household.workflowStatus}</Badge>}
      />
      <Card className="max-w-3xl rounded-xl">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Household details</CardTitle>
          {editing ? (
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving" : "Save"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Head of household<Input disabled={!editing} value={household.head_name} onChange={(event) => setHousehold({ ...household, head_name: event.target.value })} /></label>
          <label className="text-sm">House number<Input disabled={!editing} value={household.house_no} onChange={(event) => setHousehold({ ...household, house_no: event.target.value })} /></label>
          <label className="text-sm">Phone<Input disabled={!editing} value={household.phone ?? ""} onChange={(event) => setHousehold({ ...household, phone: event.target.value })} /></label>
          <label className="text-sm">Address<Input disabled={!editing} value={household.address ?? ""} onChange={(event) => setHousehold({ ...household, address: event.target.value })} /></label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> {members.length} household member{members.length === 1 ? "" : "s"}</div>
          <div className="text-sm text-muted-foreground" role="status">{message}</div>
        </CardContent>
      </Card>
      <Card className="mt-4 max-w-3xl rounded-xl">
        <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {members.map((person) => <Link className="block rounded-md border p-3 hover:bg-accent" key={person.localId} to="/person/$id" params={{ id: person.id }}>{person.full_name}</Link>)}
          {!members.length && <p className="text-sm text-muted-foreground">No members recorded.</p>}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
