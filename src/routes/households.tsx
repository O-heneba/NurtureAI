import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listCommunities } from "@/lib/registrations";
import { listWorkflowHouseholds } from "@/lib/household-person.service";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/households")({
  component: Households,
});

const PAGE = 6;

type HouseholdRow = {
  id: string;
  head_name: string;
  house_no: string;
  community_id: string | null;
  address: string | null;
  phone: string | null;
};

type CommunityRow = {
  id: string;
  name: string;
};

function Households() {
  const nav = useNavigate();
  const { roles } = useAuth();
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([listWorkflowHouseholds(), listCommunities()])
      .then(([householdData, communityData]) => {
        setHouseholds(householdData);
        setCommunities(communityData);
      })
      .catch(() => {
        setHouseholds([]);
        setCommunities([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const communityNames = useMemo(
    () => Object.fromEntries(communities.map((c) => [c.id, c.name])),
    [communities],
  );

  const accessibleHouseholds = useMemo(() => {
    if (roles.some((role) => ["administrator", "supervisor", "chps_worker"].includes(role))) {
      return households.map((h) => ({
        ...h,
        community: h.community_id ? (communityNames[h.community_id] ?? "Unknown") : "Unassigned",
      }));
    }
    return [];
  }, [roles, households, communityNames]);

  const allCommunities = useMemo(
    () =>
      Array.from(new Set(accessibleHouseholds.map((h) => h.community))).filter(Boolean) as string[],
    [accessibleHouseholds],
  );

  const filtered = useMemo(() => {
    const search = q.toLowerCase();
    return accessibleHouseholds
      .filter(
        (h) =>
          `${h.head_name} ${h.house_no} ${h.community} ${h.address ?? ""}`
            .toLowerCase()
            .includes(search) &&
          (community === "all" || h.community === community),
      )
      .sort((a, b) => {
        if (sort === "name") return a.head_name.localeCompare(b.head_name);
        if (sort === "house") return a.house_no.localeCompare(b.house_no);
        return a.head_name.localeCompare(b.head_name);
      });
  }, [accessibleHouseholds, q, community, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Households" description="Loading household register…" />
        <div className="p-8 text-center text-muted-foreground">Loading households...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Households"
        description={`${accessibleHouseholds.length} households registered`}
        actions={
          <Link to="/register/household" search={{ community_id: undefined }}>
            <Button className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" /> Register
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search households…"
            className="pl-9"
          />
        </div>
        <Select
          value={community}
          onValueChange={(v) => {
            setCommunity(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Community" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All communities</SelectItem>
            {allCommunities.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Name</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="house">House number</SelectItem>
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
                    <TableHead className="hidden sm:table-cell">Address</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((h) => (
                    <TableRow
                      key={h.id}
                      className="cursor-pointer"
                      onClick={() => nav({ to: "/household/$id", params: { id: h.id } })}
                    >
                      <TableCell>
                        <div className="font-medium">{h.head_name}</div>
                        <div className="text-xs text-muted-foreground">{h.house_no}</div>
                      </TableCell>
                      <TableCell>{h.community}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {h.address ?? "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {h.phone ?? "-"}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                          Active
                        </span>
                      </TableCell>
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
          <span className="text-muted-foreground">
            Page {safePage} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === pages}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
