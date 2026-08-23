import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listCommunities, listHouseholds, listPersons } from "@/lib/registrations";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/people")({
  component: People,
});

function People() {
  const { roles } = useAuth();
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("all");
  const [status, setStatus] = useState("all");
  const [ageGroup, setAgeGroup] = useState("all");
  const [profileType, setProfileType] = useState("all");
  const [priority, setPriority] = useState("all");
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    Promise.all([listPersons(), listHouseholds(), listCommunities()])
      .then(([personRows, householdRows, communityRows]) => {
        if (!active) return;
        const householdsById = new Map(householdRows.map((household) => [household.id, household]));
        const communitiesById = new Map(
          communityRows.map((community) => [community.id, community]),
        );
        setPeople(
          personRows.map((person) => {
            const household = person.household_id ? householdsById.get(person.household_id) : null;
            const community = household?.community_id
              ? communitiesById.get(household.community_id)
              : null;
            const birthDate = person.date_of_birth ? new Date(person.date_of_birth) : null;
            const age =
              birthDate && !Number.isNaN(birthDate.getTime())
                ? Math.max(0, new Date().getFullYear() - birthDate.getFullYear())
                : 0;
            return {
              id: person.id,
              name: person.full_name,
              age,
              gender: person.sex ?? "",
              relationship: "",
              household: household?.head_name ?? "-",
              community: community?.name ?? "-",
              profileTypes: person.profile_types ?? [],
              priorityStatus: person.priority_status ?? "routine",
              status: "active",
              phone: person.phone ?? "-",
              note: person.notes ?? "-",
            };
          }),
        );
      })
      .catch((error) => {
        if (!active) return;
        setPeople([]);
        setLoadError(error instanceof Error ? error.message : "Could not load people.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filter people based on user role and their household's community
  const accessiblePeople = useMemo(() => {
    return roles.length > 0 ? people : [];
  }, [roles, people]);

  const filtered = accessiblePeople.filter((p) => {
    const ageInRange =
      ageGroup === "all" ||
      (ageGroup === "0-5" && p.age >= 0 && p.age <= 5) ||
      (ageGroup === "6-18" && p.age >= 6 && p.age <= 18) ||
      (ageGroup === "19-49" && p.age >= 19 && p.age <= 49) ||
      (ageGroup === "50+" && p.age >= 50);
    const hasProfile =
      profileType === "all" || (p.profileTypes && p.profileTypes.includes(profileType));
    const matchesPriority =
      priority === "all" || (p.priorityStatus && p.priorityStatus === priority);
    return (
      p.name.toLowerCase().includes(q.toLowerCase()) &&
      (community === "all" || p.community === community) &&
      (status === "all" || p.status === status) &&
      ageInRange &&
      hasProfile &&
      matchesPriority
    );
  });

  const statuses = Array.from(new Set(accessiblePeople.map((p) => p.status)));
  const priorities = Array.from(
    new Set(accessiblePeople.map((p) => p.priorityStatus).filter(Boolean)),
  );
  const profileTypes = Array.from(new Set(accessiblePeople.flatMap((p) => p.profileTypes || [])));

  return (
    <AppLayout>
      <PageHeader
        title="People"
        description="Individuals registered under CHPS households"
        actions={
          <Link to="/register/person">
            <Button className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" /> Register person
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="pl-9"
          />
        </div>
        <Select value={community} onValueChange={setCommunity}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Community" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All communities</SelectItem>
            {Array.from(new Set(accessiblePeople.map((p) => p.community))).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ageGroup} onValueChange={setAgeGroup}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Age group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ages</SelectItem>
            <SelectItem value="0-5">0–5 years</SelectItem>
            <SelectItem value="6-18">6–18 years</SelectItem>
            <SelectItem value="19-49">19–49 years</SelectItem>
            <SelectItem value="50+">50+ years</SelectItem>
          </SelectContent>
        </Select>
        <Select value={profileType} onValueChange={setProfileType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Profile type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {profileTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {priorities.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <div className="p-8 text-center text-muted-foreground">Loading people...</div>}
      {!loading && loadError && (
        <EmptyState title="People could not be loaded" description={loadError} />
      )}
      {!loading && !loadError && filtered.length === 0 ? (
        <EmptyState title="No people match" description="Try clearing filters." />
      ) : !loading && !loadError ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} to="/person/$id" params={{ id: p.id }} className="contents">
              <Card className="rounded-xl card-elevated hover-lift cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {p.name
                          .split(" ")
                          .map((s: string) => s[0])
                          .slice(0, 2)
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.age} yrs · {p.gender === "F" ? "Female" : "Male"} · {p.relationship}
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {p.status}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div className="truncate">Household: {p.household}</div>
                        <div className="truncate">Community: {p.community}</div>
                        {(p.profileTypes || []).length > 0 && (
                          <div className="truncate">
                            Profiles: {(p.profileTypes || []).join(", ")}
                          </div>
                        )}
                        {p.phone !== "-" && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {p.phone}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t text-xs">
                        <span className="text-muted-foreground">Note: </span>
                        {p.note}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </AppLayout>
  );
}
