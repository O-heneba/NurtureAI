-- Create normalized geography tables for regions, districts, and sub-districts
BEGIN;

CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  gps_lat numeric,
  gps_lng numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sub_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS name text NOT NULL;
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS name text NOT NULL;
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE;
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS gps_lat numeric;
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS gps_lng numeric;
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.sub_districts ADD COLUMN IF NOT EXISTS name text NOT NULL;
ALTER TABLE public.sub_districts ADD COLUMN IF NOT EXISTS district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE;
ALTER TABLE public.sub_districts ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.sub_districts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.regions TO authenticated;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read regions" ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert regions" ON public.regions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update regions" ON public.regions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete regions" ON public.regions FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.districts TO authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read districts" ON public.districts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert districts" ON public.districts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update districts" ON public.districts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete districts" ON public.districts FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_districts TO authenticated;
GRANT ALL ON public.sub_districts TO service_role;
ALTER TABLE public.sub_districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read sub_districts" ON public.sub_districts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert sub_districts" ON public.sub_districts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update sub_districts" ON public.sub_districts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete sub_districts" ON public.sub_districts FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_districts_region_id ON public.districts(region_id);
CREATE INDEX IF NOT EXISTS idx_sub_districts_district_id ON public.sub_districts(district_id);

COMMIT;
