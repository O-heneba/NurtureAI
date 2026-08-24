import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home, Sparkles, Inbox } from "lucide-react";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Risk / status badges                                                       */
/* -------------------------------------------------------------------------- */

export function RiskBadge({ level }: { level: string }) {
  const l = level.toLowerCase();
  const map: Record<string, string> = {
    low: "bg-success/10 text-success border-success/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    high: "bg-destructive/10 text-destructive border-destructive/30",
    urgent: "bg-destructive/10 text-destructive border-destructive/30 animate-pulse",
    routine: "bg-info/10 text-info border-info/30",
  };
  return (
    <Badge
      variant="outline"
      className={cn("capitalize font-medium gap-1.5 rounded-full px-2.5 py-0.5", map[l] ?? "")}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          l === "low" && "bg-success",
          l === "medium" && "bg-warning",
          (l === "high" || l === "urgent") && "bg-destructive",
          l === "routine" && "bg-info",
        )}
      />
      {level}
    </Badge>
  );
}

export function StatusPill({
  tone = "info",
  children,
  className,
}: {
  tone?: "success" | "warning" | "destructive" | "info" | "muted" | "primary";
  children: ReactNode;
  className?: string;
}) {
  const toneMap = {
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    info: "bg-info/10 text-info border-info/30",
    primary: "bg-primary/10 text-primary border-primary/30",
    muted: "bg-muted text-muted-foreground border-border",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard stat card                                                        */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  trend,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
  trend?: { direction: "up" | "down"; value: string };
  onClick?: () => void;
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  } as const;
  const barMap = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    info: "bg-info",
  } as const;
  const card = (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-5 card-elevated hover-lift">
      <div className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", barMap[tone])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </div>
          {(hint || trend) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              {trend && (
                <span
                  className={cn(
                    "font-semibold",
                    trend.direction === "up" ? "text-success" : "text-destructive",
                  )}
                >
                  {trend.direction === "up" ? "↑" : "↓"} {trend.value}
                </span>
              )}
              {hint && <span className="truncate">{hint}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-110",
            toneMap[tone],
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {card}
    </button>
  ) : (
    card
  );
}

/* -------------------------------------------------------------------------- */
/*  Page header with breadcrumbs                                               */
/* -------------------------------------------------------------------------- */

export type Crumb = { label: string; to?: string };

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  icon?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:text-foreground hover:bg-accent transition-colors"
          >
            <Home className="h-3 w-3" />
            Home
          </Link>
          {breadcrumbs.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              {c.to ? (
                <Link
                  to={c.to}
                  className="rounded-md px-1.5 py-0.5 hover:text-foreground hover:bg-accent transition-colors"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="px-1.5 py-0.5 text-foreground font-medium">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight truncate">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading skeletons                                                          */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-md skeleton-shimmer", className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 card-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-3 rounded-lg border p-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-4 rounded-full bg-primary/5 blur-xl" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/20 animate-float-slow">
          {icon ?? <Inbox className="h-7 w-7" />}
        </div>
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  AI recommendation card                                                     */
/* -------------------------------------------------------------------------- */

export function AIRecommendationCard({
  title,
  children,
  actions,
  tone = "primary",
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const toneMap = {
    primary: "from-primary/20 via-primary/5 to-transparent ring-primary/25 text-primary",
    success: "from-success/20 via-success/5 to-transparent ring-success/25 text-success",
    warning: "from-warning/25 via-warning/5 to-transparent ring-warning/25 text-warning",
    destructive:
      "from-destructive/20 via-destructive/5 to-transparent ring-destructive/25 text-destructive",
  } as const;
  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6 card-elevated")}
    >
      {/* aura */}
      <div
        aria-hidden
        className={cn(
          "absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br opacity-70 blur-3xl pointer-events-none",
          toneMap[tone],
        )}
      />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl ring-1 bg-background",
              toneMap[tone],
            )}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              AI Recommendation
            </div>
            <div className="text-sm font-semibold tracking-tight">{title}</div>
          </div>
        </div>
        <div className="text-sm text-foreground/90 leading-relaxed space-y-2">{children}</div>
        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
