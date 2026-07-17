import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, RiskBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { households, communities } from "@/lib/demo-data";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/households")({
  component: Households,
});

const PAGE = 6;

function Households() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = households.filter((h) =>
      (h.head + h.community + h.houseNo).toLowerCase().includes(q.toLowerCase()) &&
      (community === "all" || h.community === community),
    );
    if (sort === "risk") list = [...list].sort((a, b) => ({ high: 0, medium: 1, low: 2 } as Record<string, number>)[a.risk] - ({ high: 0, medium: 1, low: 2 } as Record<string, number>)[b.risk]);
    else if (sort === "members") list = [...list].sort((a, b) => b.members - a.members);
    else list = [...list].sort((a, b) => b.registered.localeCompare(a.registered));
    return list;
  }, [q, community, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);

  return (
    <AppLayout>
      <PageHeader
        title="Households"
        description={`${households.length} households registered across your zone`}
        actions={<Link to="/register/household"><Button className="rounded-xl"><Plus className="mr-1 h-4 w-4" /> Register</Button></Link>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search households…" className="pl-9" />
        </div>
        <Select value={community} onValueChange={(v) => { setCommunity(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Community" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All communities</SelectItem>
            {communities.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="risk">Highest risk</SelectItem>
            <SelectItem value="members">Most members</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pageRows.length === 0 ? (
        <EmptyState title="No households match" description="Try adjusting search or filters." />
      ) : (
        <Card className="rounded-xl overflow-hidden card-elevated">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Household</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="hidden md:table-cell">Last visit</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((h) => (
                    <TableRow key={h.id} className="cursor-pointer" onClick={() => nav({ to: "/household/$id", params: { id: h.id } })}>
                      <TableCell>
                        <div className="font-medium">{h.head}</div>
                        <div className="text-xs text-muted-foreground">{h.houseNo}</div>
                      </TableCell>
                      <TableCell>{h.community}</TableCell>
                      <TableCell>{h.members}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{h.lastVisit}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{h.phone}</TableCell>
                      <TableCell><RiskBadge level={h.risk} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length > PAGE && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

