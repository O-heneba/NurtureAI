-- All authenticated users can browse the shared community directory.
DROP POLICY IF EXISTS "Auth read communities" ON public.communities;
CREATE POLICY "Authenticated users read communities" ON public.communities
  FOR SELECT TO authenticated
  USING (true);
