DROP POLICY IF EXISTS "Auth insert communities" ON public.communities;

CREATE POLICY "Auth insert communities" ON public.communities
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('chps_worker', auth.uid())
    OR public.has_role('supervisor', auth.uid())
    OR public.has_role('administrator', auth.uid())
  );