import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HeartPulse, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Supabase auth placeholder — wire supabase.auth.signInWithPassword here
    setTimeout(() => {
      toast.success("Welcome back, Ama!");
      navigate({ to: "/" });
    }, 700);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-10">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold">NurtureAI</div>
            <div className="text-[11px] opacity-80">CHPS Health Platform</div>
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold leading-tight max-w-md">
            "NurtureAI has cut my home-visit paperwork in half."
          </div>
          <div className="mt-4 text-sm opacity-80">
            — Efua Owusu, CHPS Nurse · Atonsu Community
          </div>
        </div>
        <div className="text-xs opacity-70">© 2025 NurtureAI · Built for Ghana Health Service</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <Card className="w-full max-w-md p-8 rounded-2xl border shadow-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="font-bold">NurtureAI</div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Enter your credentials to continue.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" defaultValue="ama.boateng@nurtureai.gh" className="pl-9" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/login" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" defaultValue="password" className="pl-9" required />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "Signing in…" : (<>Sign in <ArrowRight className="ml-1 h-4 w-4" /></>)}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            New to NurtureAI? <Link to="/welcome" className="text-primary font-medium hover:underline">Request access</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
