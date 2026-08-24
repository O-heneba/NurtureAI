DROP POLICY IF EXISTS "Auth insert households" ON public.households;

CREATE POLICY "Auth insert households" ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
