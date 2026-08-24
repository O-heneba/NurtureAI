import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { EmptyState, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Save, User } from "lucide-react";
import { getWorkflowHousehold, getWorkflowPerson, updateWorkflowPerson } from "@/lib/household-person.service";

export const Route = createFileRoute("/person/$id")({
  loader: async ({ params }) => {
    const person = await getWorkflowPerson(params.id);
    if (!person) throw notFound();
    const household = person.household_id ? await getWorkflowHousehold(person.household_id) : null;
    return { person, household };
  },
  component: PersonDetail,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState title="Person not found" action={<Link to="/people" search={{ q: "" }}>Back to people</Link>} />
    </AppLayout>
  ),
});

function PersonDetail() {
  const { person: initial, household } = Route.useLoaderData();
  const [person, setPerson] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    try {
      const saved = await updateWorkflowPerson(person.localId, {
        full_name: person.full_name,
        phone: person.phone,
        national_id: person.national_id,
        notes: person.notes,
      });
      setPerson(saved);
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
        title={person.full_name}
        description={`${person.sex === "F" ? "Female" : person.sex === "M" ? "Male" : "Person"} · ${household?.head_name ?? "Household not recorded"}`}
        icon={<User className="h-5 w-5" />}
        breadcrumbs={[{ label: "People", to: "/people" }, { label: person.full_name }]}
        actions={<Badge variant="outline">{person.workflowStatus}</Badge>}
      />
      <Card className="max-w-3xl rounded-xl">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Person details</CardTitle>
          {editing ? (
            <Button size="sm" onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" /> {saving ? "Saving" : "Save"}</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Full name<Input disabled={!editing} value={person.full_name} onChange={(event) => setPerson({ ...person, full_name: event.target.value })} /></label>
          <label className="text-sm">Phone<Input disabled={!editing} value={person.phone ?? ""} onChange={(event) => setPerson({ ...person, phone: event.target.value })} /></label>
          <label className="text-sm">National ID<Input disabled={!editing} value={person.national_id ?? ""} onChange={(event) => setPerson({ ...person, national_id: event.target.value })} /></label>
          <div className="text-sm">Household{household ? <Link className="block text-primary hover:underline" to="/household/$id" params={{ id: household.id }}>{household.head_name}</Link> : <span className="block text-muted-foreground">Not recorded</span>}</div>
          <div className="text-sm text-muted-foreground" role="status">{message}</div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
