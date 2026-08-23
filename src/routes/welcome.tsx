import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartPulse, ArrowRight, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-center gap-2 mb-16">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold">NurtureAI</div>
            <div className="text-[11px] text-muted-foreground">CHPS Health Platform</div>
          </div>
        </div>

        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 mb-6">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered community health
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Care for every household, from Kwadaso to Aboabo.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            NurtureAI helps CHPS workers in Ghana register households, track maternal and child
            health, and deliver AI-assisted assessments — even offline.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-xl">
              <Link to="/login">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl">
              <Link to="/">View demo dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-16">
          {[
            {
              icon: Users,
              title: "Household registry",
              body: "Community-first data model built for CHPS compounds.",
            },
            {
              icon: Sparkles,
              title: "AI assessments",
              body: "Risk scoring, referrals and nutrition guidance in seconds.",
            },
            {
              icon: ShieldCheck,
              title: "Works offline",
              body: "Sync when you get back to a signal. Never lose data.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary mb-3">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
