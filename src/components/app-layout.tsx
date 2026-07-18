import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, MapPin, Home, Users, HeartPulse, Baby, ClipboardCheck,
  Sparkles, Send, Apple, BarChart3, Settings, Bell, LogOut, Menu, Search, Wifi, WifiOff, User,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/communities", label: "Communities", icon: MapPin },
  { to: "/households", label: "Households", icon: Home },
  { to: "/people", label: "People", icon: Users },
  { to: "/maternal", label: "Maternal Care", icon: HeartPulse },
  { to: "/child-health", label: "Child Health", icon: Baby },
  { to: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/referrals", label: "Referrals", icon: Send },
  { to: "/nutrition", label: "Nutrition", icon: Apple },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const bottomNav = nav.slice(0, 5);

function NavItem({ to, label, icon: Icon, active, onClick }: {
  to: string; label: string; icon: typeof LayoutDashboard; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-30",
        )}
      />
      <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarInner({ pathname, onNav, name, subtitle, initials }: { pathname: string; onNav?: () => void; name: string; subtitle: string; initials: string }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-base leading-tight">NurtureAI</div>
          <div className="text-[11px] text-muted-foreground leading-tight">CHPS Health Platform</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {nav.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            active={pathname === item.to}
            onClick={onNav}
          />
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-xl bg-accent/50 p-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function initialsFor(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

function roleLabel(role: string) {
  return role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online] = useState(true);
  const current = nav.find((n) => n.to === pathname);
  const { user, profile, roles, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const displayName = profile?.full_name ?? user.email ?? "User";
  const displayEmail = user.email ?? "";
  const role = roles[0] ? roleLabel(roles[0]) : "CHPS Worker";
  const facility = profile?.facility ?? "CHPS Facility";
  const initials = initialsFor(displayName);

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r">
        <SidebarInner pathname={pathname} name={displayName} subtitle={role} initials={initials} />
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Top nav */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            {/* Mobile trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarInner pathname={pathname} onNav={() => setMobileOpen(false)} name={displayName} subtitle={role} initials={initials} />
              </SheetContent>
            </Sheet>

            <div className="hidden md:block min-w-0">
              <h1 className="text-lg font-semibold truncate">{current?.label ?? "NurtureAI"}</h1>
              <p className="text-xs text-muted-foreground truncate">{facility} · {role}</p>
            </div>

            <div className="relative ml-auto hidden sm:block max-w-xs w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search people, households…" className="pl-9 bg-background" />
            </div>

            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 hidden sm:inline-flex",
                online ? "text-success border-success/30 bg-success/10" : "text-warning border-warning/30 bg-warning/10",
              )}
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Online" : "Offline"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex-col items-start gap-0.5 py-2.5">
                  <div className="font-medium text-sm">High-risk pregnancy alert</div>
                  <div className="text-xs text-muted-foreground">Ama Nyarko needs urgent review</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex-col items-start gap-0.5 py-2.5">
                  <div className="font-medium text-sm">Immunization due</div>
                  <div className="text-xs text-muted-foreground">Kojo Nti — MMR vaccine tomorrow</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex-col items-start gap-0.5 py-2.5">
                  <div className="font-medium text-sm">Referral update</div>
                  <div className="text-xs text-muted-foreground">Afia Darko received at Suntreso</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left leading-tight">
                    <div className="text-sm font-medium">{displayName.split(" ")[0]}</div>
                    <div className="text-[11px] text-muted-foreground">{role.split(" ")[0]}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-semibold">{displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">{displayEmail}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/settings"><User className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main
          key={pathname}
          className="pb-24 lg:pb-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full animate-page-in"
        >
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="grid grid-cols-5">
          {bottomNav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
                )}
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-full px-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
