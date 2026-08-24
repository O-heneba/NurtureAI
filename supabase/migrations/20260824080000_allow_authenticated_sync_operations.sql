DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'communities',
    'households',
    'persons',
    'pregnancies',
    'child_profiles',
    'assessments',
    'referrals',
    'referral_status_history',
    'referral_outcomes',
    'follow_ups',
    'follow_up_attempts',
    'follow_up_outcomes',
    'person_notes'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', table_name);

    policy_name := 'Authenticated sync read ' || table_name;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = policy_name) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)', policy_name, table_name);
    END IF;

    policy_name := 'Authenticated sync insert ' || table_name;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = policy_name) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)', policy_name, table_name);
    END IF;

    policy_name := 'Authenticated sync update ' || table_name;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = policy_name) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', policy_name, table_name);
    END IF;

    policy_name := 'Authenticated sync delete ' || table_name;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = policy_name) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)', policy_name, table_name);
    END IF;
  END LOOP;
END $$;
