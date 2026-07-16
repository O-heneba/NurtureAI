import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function RiskBadge({ level }: { level: string }) {
  const l = level.toLowerCase();
  const map: Record<string, string> = {
    low: "bg-success/10 text-success border-success/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    high: "bg-destructive/10 text-destructive border-destructive/30",
    urgent: "bg-destructive/10 text-destructive border-destructive/30",
    routine: "bg-info/10 text-info border-info/30",
  };
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", map[l] ?? "")}>
      {level}
    </Badge>
  );
}

export function StatCard({
  label, value, hint, icon, tone = "primary",
}: {
  label: string; value: string | number; hint?: string; icon: ReactNode;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  } as const;
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground truncate">{hint}</div>}
        </div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", toneMap[tone])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-6 sm:flex sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
