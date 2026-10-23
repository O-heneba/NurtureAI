BEGIN;

GRANT SELECT ON public.immunization_schedule TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_immunizations TO authenticated;

ALTER TABLE public.child_immunizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized users read child immunizations" ON public.child_immunizations;
CREATE POLICY "Authorized users read child immunizations"
ON public.child_immunizations FOR SELECT TO authenticated
USING (
  public.has_role('administrator'::public.app_role, auth.uid())
  OR public.has_role('supervisor'::public.app_role, auth.uid())
  OR public.has_role('chps_worker'::public.app_role, auth.uid())
);

DROP POLICY IF EXISTS "Authorized workers manage child immunizations" ON public.child_immunizations;
CREATE POLICY "Authorized workers manage child immunizations"
ON public.child_immunizations FOR ALL TO authenticated
USING (
  public.has_role('administrator'::public.app_role, auth.uid())
  OR public.has_role('supervisor'::public.app_role, auth.uid())
  OR public.has_role('chps_worker'::public.app_role, auth.uid())
)
WITH CHECK (
  public.has_role('administrator'::public.app_role, auth.uid())
  OR public.has_role('supervisor'::public.app_role, auth.uid())
  OR public.has_role('chps_worker'::public.app_role, auth.uid())
);

COMMIT;