-- Extend households table with richer profile and workflow fields
CREATE TABLE IF NOT EXISTS public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE RESTRICT,
  house_no text NOT NULL,
  head_name text NOT NULL,
  phone text,
  address text,
  address_description text,
  gps text,
  location_notes text,
  composition_breakdown text,
  living_conditions text,
  barriers text[] DEFAULT '{}',
  notes text,
  priority_status text NOT NULL DEFAULT 'routine' CHECK (priority_status IN ('routine','priority','urgent')),
  data_completeness integer DEFAULT 0,
  next_follow_up_at date,
  draft boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add columns if table already exists
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS address_description text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS location_notes text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS composition_breakdown text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS living_conditions text;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS barriers text[] DEFAULT '{}';
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS priority_status text NOT NULL DEFAULT 'routine';
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS data_completeness integer DEFAULT 0;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS next_follow_up_at date;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS draft boolean DEFAULT false;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'households_priority_status_check'
  ) THEN
    ALTER TABLE public.households
      ADD CONSTRAINT households_priority_status_check
      CHECK (priority_status IN ('routine','priority','urgent'));
  END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;

-- Enable RLS
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Auth read households" ON public.households FOR SELECT TO authenticated
  USING (
    public.has_role('administrator', auth.uid())
    OR public.has_role('supervisor', auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chps_workers cw
      JOIN public.communities_coverage cc ON cc.community_id = cw.community_id
      WHERE cw.user_id = auth.uid() AND cc.community_id = households.community_id
    )
  );
CREATE POLICY "Auth insert households" ON public.households FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (public.has_role('chps_worker', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()))
  );
CREATE POLICY "Auth update households" ON public.households FOR UPDATE TO authenticated
  USING (
    public.has_role('administrator', auth.uid())
    OR public.has_role('supervisor', auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chps_workers cw
      JOIN public.communities_coverage cc ON cc.community_id = cw.community_id
      WHERE cw.user_id = auth.uid() AND cc.community_id = households.community_id
    )
  )
  WITH CHECK (
    public.has_role('administrator', auth.uid())
    OR public.has_role('supervisor', auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chps_workers cw
      JOIN public.communities_coverage cc ON cc.community_id = cw.community_id
      WHERE cw.user_id = auth.uid() AND cc.community_id = households.community_id
    )
  );
CREATE POLICY "Auth delete households" ON public.households FOR DELETE TO authenticated
  USING (public.has_role('administrator', auth.uid()));

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_households_community_id ON public.households(community_id);
CREATE INDEX IF NOT EXISTS idx_households_priority_status ON public.households(priority_status);
CREATE INDEX IF NOT EXISTS idx_households_next_follow_up ON public.households(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_households_draft ON public.households(draft);
