GRANT SELECT, INSERT ON TABLE public.households TO authenticated;

DROP POLICY IF EXISTS "Auth read households" ON public.households;
CREATE POLICY "Auth read households" ON public.households
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth insert households" ON public.households;
CREATE POLICY "Auth insert households" ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
