import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "chps_worker" | "supervisor" | "administrator";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  roles: Role[];
  profile: {
    full_name: string | null;
    facility: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    roles: [],
    profile: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadExtras(userId: string) {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              k: string,
              v: string,
            ) => Promise<{ data: unknown }> & {
              maybeSingle: () => Promise<{ data: unknown }>;
            };
          };
        };
      };
      const [{ data: roleRowsRaw }, { data: profRaw }] = await Promise.all([
        client.from("user_roles").select("role").eq("user_id", userId),
        client
          .from("profiles")
          .select("full_name, facility, phone, avatar_url")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      const roleRows = roleRowsRaw as Array<{ role: Role }> | null;
      const prof = profRaw as {
        full_name: string | null;
        facility: string | null;
        phone: string | null;
        avatar_url: string | null;
      } | null;
      if (!mounted) return;
      setState((s) => ({
        ...s,
        roles: (roleRows ?? []).map((r) => r.role),
        profile: prof,
      }));
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState((s) => ({ ...s, session, user: session?.user ?? null, loading: false }));
      if (session?.user) {
        setTimeout(() => loadExtras(session.user.id), 0);
      } else {
        setState((s) => ({ ...s, roles: [], profile: null }));
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState((s) => ({
        ...s,
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      }));
      if (data.session?.user) loadExtras(data.session.user.id);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
