CREATE TABLE IF NOT EXISTS public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  community_code text,
  region text,
  district text,
  sub_district text,
  chps_zone text,
  chps_facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nearest_referral_facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  gps_lat numeric,
  gps_lng numeric,
  location_desc text,
  primary_languages text[] NOT NULL DEFAULT '{}',
  common_health_challenges text[] NOT NULL DEFAULT '{}',
  accessibility text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','needs_attention','inactive','draft')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS community_code text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS sub_district text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS chps_zone text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS chps_facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS nearest_referral_facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS gps_lat numeric;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS gps_lng numeric;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS location_desc text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS primary_languages text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS common_health_challenges text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS accessibility text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communities_status_check'
  ) THEN
    ALTER TABLE public.communities
      ADD CONSTRAINT communities_status_check
      CHECK (status IN ('active','needs_attention','inactive','draft'));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read communities" ON public.communities FOR SELECT TO authenticated
  USING (public.has_role('chps_worker', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Auth insert communities" ON public.communities FOR INSERT TO authenticated
  WITH CHECK (public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Auth update communities" ON public.communities FOR UPDATE TO authenticated
  USING (public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()))
  WITH CHECK (public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Auth delete communities" ON public.communities FOR DELETE TO authenticated
  USING (public.has_role('administrator', auth.uid()));

CREATE INDEX IF NOT EXISTS idx_communities_region_district ON public.communities(region, district);
CREATE INDEX IF NOT EXISTS idx_communities_status ON public.communities(status);
