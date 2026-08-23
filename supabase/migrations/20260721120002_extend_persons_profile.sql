-- EXTEND PERSONS TABLE WITH ADDITIONAL PROFILE FIELDS
ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS disability_status text DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS profile_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority_status text DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS data_completeness integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draft boolean DEFAULT false;

-- Add constraint for priority_status
ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS persons_priority_status_check;
ALTER TABLE public.persons ADD CONSTRAINT persons_priority_status_check
  CHECK (priority_status IN ('routine', 'priority', 'urgent'));

-- Add constraint for disability_status
ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS persons_disability_status_check;
ALTER TABLE public.persons ADD CONSTRAINT persons_disability_status_check
  CHECK (disability_status IN ('None', 'Hearing', 'Vision', 'Mobility', 'Cognitive', 'Other'));

-- Add constraint for education
ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS persons_education_check;
ALTER TABLE public.persons ADD CONSTRAINT persons_education_check
  CHECK (education IS NULL OR education IN ('None/Informal', 'Primary', 'JHS', 'SHS', 'Tertiary'));

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_persons_priority_status ON public.persons(priority_status);
CREATE INDEX IF NOT EXISTS idx_persons_profile_types ON public.persons USING GIN(profile_types);
CREATE INDEX IF NOT EXISTS idx_persons_data_completeness ON public.persons(data_completeness);
CREATE INDEX IF NOT EXISTS idx_persons_draft ON public.persons(draft);

-- Update RLS policies to include new fields
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read own persons" ON public.persons;
DROP POLICY IF EXISTS "Auth insert persons" ON public.persons;
DROP POLICY IF EXISTS "Auth update own persons" ON public.persons;
DROP POLICY IF EXISTS "Auth delete own persons" ON public.persons;

CREATE POLICY "Auth read own persons" ON public.persons FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrator')
    OR public.has_role(auth.uid(), 'supervisor')
    OR EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = persons.household_id
      AND (
        h.community_id IN (
          SELECT cc.community_id FROM public.chps_workers cw
          JOIN public.communities_coverage cc ON cw.community_id = cc.community_id
          WHERE cw.user_id = auth.uid()
        )
        OR h.community_id IN (
          SELECT sz.community_id FROM public.supervisors_zones sz
          WHERE sz.supervisor_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Auth insert persons" ON public.persons FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'administrator')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'chps_worker')
  );

CREATE POLICY "Auth update own persons" ON public.persons FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrator')
    OR public.has_role(auth.uid(), 'supervisor')
    OR EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = persons.household_id
      AND h.community_id IN (
        SELECT cc.community_id FROM public.chps_workers cw
        JOIN public.communities_coverage cc ON cw.community_id = cc.community_id
        WHERE cw.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Auth delete own persons" ON public.persons FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrator')
    OR public.has_role(auth.uid(), 'supervisor')
  );
