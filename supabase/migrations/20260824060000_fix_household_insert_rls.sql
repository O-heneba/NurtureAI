GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON TABLE public.households TO authenticated;

DROP POLICY IF EXISTS "Auth insert households" ON public.households;
CREATE POLICY "Auth insert households" ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (true);
