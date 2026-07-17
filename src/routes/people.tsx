import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone } from "lucide-react";
import { people, communities } from "@/lib/demo-data";
import { useState } from "react";

export const Route = createFileRoute("/people")({
  component: People,
});

function People() {
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) &&
    (community === "all" || p.community === community) &&
    (status === "all" || p.status === status),
  );
  const statuses = Array.from(new Set(people.map((p) => p.status)));

  return (
    <AppLayout>
      <PageHeader
        title="People"
        description="Individuals registered under CHPS households"
        actions={<Link to="/register/person"><Button className="rounded-xl"><Plus className="mr-1 h-4 w-4" /> Register person</Button></Link>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="pl-9" />
        </div>
        <Select value={community} onValueChange={setCommunity}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Community" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All communities</SelectItem>
            {communities.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No people match" description="Try clearing filters." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} to="/person/$id" params={{ id: p.id }} className="contents">
              <Card className="rounded-xl card-elevated hover-lift cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{p.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.age} yrs · {p.gender === "F" ? "Female" : "Male"} · {p.relationship}</div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">{p.status}</Badge>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div className="truncate">Household: {p.household}</div>
                        <div className="truncate">Community: {p.community}</div>
                        {p.phone !== "-" && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</div>}
                      </div>
                      <div className="mt-3 pt-3 border-t text-xs"><span className="text-muted-foreground">Note: </span>{p.note}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

