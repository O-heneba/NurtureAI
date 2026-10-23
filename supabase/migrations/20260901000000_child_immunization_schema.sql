BEGIN;

CREATE TABLE IF NOT EXISTS public.immunization_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_code text NOT NULL UNIQUE,
  vaccine_name text NOT NULL,
  display_name text NOT NULL,
  dose_number integer,
  recommended_age_days integer NOT NULL,
  milestone_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.child_immunizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.immunization_schedule(id) ON DELETE SET NULL,
  vaccine_code text,
  administered_date date NOT NULL,
  administered_at_facility text,
  source text NOT NULL CHECK (source IN ('registration_history','newborn_assessment','child_under_5_assessment','manual_entry','imported_record')),
  assessment_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, schedule_id)
);

CREATE INDEX IF NOT EXISTS idx_immunization_schedule_active_sort ON public.immunization_schedule(active, sort_order, recommended_age_days);
CREATE INDEX IF NOT EXISTS idx_child_immunizations_child ON public.child_immunizations(child_id, administered_date);
CREATE INDEX IF NOT EXISTS idx_child_immunizations_schedule ON public.child_immunizations(schedule_id);

CREATE OR REPLACE TRIGGER tg_immunization_schedule_set_updated_at
BEFORE UPDATE ON public.immunization_schedule
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.immunization_schedule (
  vaccine_code,
  vaccine_name,
  display_name,
  dose_number,
  recommended_age_days,
  milestone_label,
  sort_order,
  active
)
VALUES
  ('BCG', 'BCG', 'BCG', 1, 0, 'Birth', 1, true),
  ('OPV0', 'OPV 0', 'OPV 0', 1, 0, 'Birth', 2, true),
  ('HEPB_BIRTH', 'Hepatitis B birth dose', 'Hepatitis B birth dose', 1, 0, 'Birth', 3, true),
  ('DPT_HEPB_HIB_1', 'DPT-HepB-Hib 1', 'DPT-HepB-Hib 1', 1, 42, '6 Weeks', 10, true),
  ('OPV1', 'OPV 1', 'OPV 1', 1, 42, '6 Weeks', 11, true),
  ('PCV1', 'PCV 1', 'PCV 1', 1, 42, '6 Weeks', 12, true),
  ('ROTAVIRUS1', 'Rotavirus 1', 'Rotavirus 1', 1, 42, '6 Weeks', 13, true),
  ('DPT_HEPB_HIB_2', 'DPT-HepB-Hib 2', 'DPT-HepB-Hib 2', 2, 70, '10 Weeks', 20, true),
  ('OPV2', 'OPV 2', 'OPV 2', 2, 70, '10 Weeks', 21, true),
  ('PCV2', 'PCV 2', 'PCV 2', 2, 70, '10 Weeks', 22, true),
  ('ROTAVIRUS2', 'Rotavirus 2', 'Rotavirus 2', 2, 70, '10 Weeks', 23, true),
  ('DPT_HEPB_HIB_3', 'DPT-HepB-Hib 3', 'DPT-HepB-Hib 3', 3, 98, '14 Weeks', 30, true),
  ('OPV3', 'OPV 3', 'OPV 3', 3, 98, '14 Weeks', 31, true),
  ('PCV3', 'PCV 3', 'PCV 3', 3, 98, '14 Weeks', 32, true),
  ('ROTAVIRUS3', 'Rotavirus 3', 'Rotavirus 3', 3, 98, '14 Weeks', 33, true),
  ('IPV1', 'IPV 1', 'IPV 1', 1, 98, '14 Weeks', 34, true),
  ('MR1', 'Measles-Rubella 1', 'Measles-Rubella 1', 1, 270, '9 Months', 40, true),
  ('YELLOW_FEVER1', 'Yellow Fever 1', 'Yellow Fever 1', 1, 270, '9 Months', 41, true),
  ('VITAMIN_A_1', 'Vitamin A 1', 'Vitamin A 1', 1, 182, '6 Months', 60, true),
  ('VITAMIN_A_2', 'Vitamin A 2', 'Vitamin A 2', 2, 365, '12 Months', 61, true),
  ('MALARIA1', 'Malaria vaccine 1', 'Malaria vaccine 1', 1, 270, '9 Months', 70, true),
  ('IPV2', 'IPV 2', 'IPV 2', 2, 548, '18 Months', 50, true),
  ('MR2', 'Measles-Rubella 2', 'Measles-Rubella 2', 2, 548, '18 Months', 51, true)
ON CONFLICT (vaccine_code) DO NOTHING;

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS current_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS place_of_birth text,
  ADD COLUMN IF NOT EXISTS delivery_mode text,
  ADD COLUMN IF NOT EXISTS mother_or_guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS relationship_to_guardian text,
  ADD COLUMN IF NOT EXISTS nutrition_status text,
  ADD COLUMN IF NOT EXISTS breastfeeding_status text,
  ADD COLUMN IF NOT EXISTS medical_notes text,
  ADD COLUMN IF NOT EXISTS household_id uuid,
  ADD COLUMN IF NOT EXISTS birth_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS immunizations jsonb;

UPDATE public.child_profiles AS cp
SET full_name = COALESCE(cp.full_name, p.full_name),
    first_name = COALESCE(cp.first_name, split_part(p.full_name, ' ', 1)),
    last_name = COALESCE(cp.last_name, split_part(p.full_name, ' ', array_length(string_to_array(p.full_name, ' '), 1))),
    date_of_birth = COALESCE(cp.date_of_birth, p.date_of_birth),
    sex = COALESCE(cp.sex, p.sex),
    household_id = COALESCE(cp.household_id, p.household_id)
FROM public.persons AS p
WHERE cp.person_id = p.id
  AND cp.full_name IS NULL;

ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
