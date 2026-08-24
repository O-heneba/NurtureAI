ALTER TABLE public.pregnancies
  ADD COLUMN IF NOT EXISTS gestation_weeks numeric,
  ADD COLUMN IF NOT EXISTS blood_pressure text,
  ADD COLUMN IF NOT EXISTS weight_kg numeric;