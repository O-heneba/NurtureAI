import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Users, Home } from "lucide-react";
import { communities } from "@/lib/demo-data";
import { useState } from "react";

export const Route = createFileRoute("/communities")({
  component: Communities,
});

function Communities() {
  const [q, setQ] = useState("");
  const filtered = communities.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppLayout>
      <PageHeader
        title="Communities"
        description="Communities under your CHPS zone coverage"
      />

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search communities…" className="pl-9" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="rounded-xl hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <MapPin className="h-3.5 w-3.5" /> {c.district}
                  </div>
                  <div className="text-lg font-bold truncate">{c.name}</div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 shrink-0">
                  {c.coverage}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Home className="h-3.5 w-3.5" /> Households
                  </div>
                  <div className="font-semibold mt-0.5">{c.households}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Population
                  </div>
                  <div className="font-semibold mt-0.5">{c.population}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-xs">
                <span className="text-muted-foreground">CHPS worker: </span>
                <span className="font-medium">{c.worker}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
