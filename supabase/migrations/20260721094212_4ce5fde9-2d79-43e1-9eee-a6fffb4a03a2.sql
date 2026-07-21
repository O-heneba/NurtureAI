
-- FACILITIES
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('chps_compound','health_centre','district_hospital','regional_hospital','specialist')),
  region text,
  district text,
  sub_district text,
  contact_phone text,
  services text[] NOT NULL DEFAULT '{}',
  gps_lat numeric,
  gps_lng numeric,
  address text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilities TO authenticated;
GRANT ALL ON public.facilities TO service_role;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read facilities" ON public.facilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert facilities" ON public.facilities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admin update facilities" ON public.facilities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "Admin delete facilities" ON public.facilities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));
CREATE TRIGGER trg_facilities_updated BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- EXTEND REFERRALS
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_urgency_check;
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS symptoms text,
  ADD COLUMN IF NOT EXISTS findings text,
  ADD COLUMN IF NOT EXISTS requested_service text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_required boolean NOT NULL DEFAULT false;

ALTER TABLE public.referrals ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check
  CHECK (status IN ('draft','submitted','acknowledged','accepted','in_progress','completed','declined','cancelled','pending'));
ALTER TABLE public.referrals ADD CONSTRAINT referrals_urgency_check
  CHECK (urgency IN ('routine','priority','urgent','emergency'));

-- REFERRAL STATUS HISTORY
CREATE TABLE public.referral_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor uuid REFERENCES auth.users(id),
  note text,
  at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.referral_status_history TO authenticated;
GRANT ALL ON public.referral_status_history TO service_role;
ALTER TABLE public.referral_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read referral history" ON public.referral_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert referral history" ON public.referral_status_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor);

-- REFERRAL OUTCOMES
CREATE TABLE public.referral_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL UNIQUE REFERENCES public.referrals(id) ON DELETE CASCADE,
  seen boolean,
  attended_at date,
  facility_attended text,
  service_received text,
  outcome text CHECK (outcome IN ('care_received','admitted','treated_discharged','further_referral','unable_to_attend','unreachable','other')),
  further_action_required boolean NOT NULL DEFAULT false,
  barrier text CHECK (barrier IN ('transportation','financial','distance','unreachable','caregiver_constraint','facility_access','communication','other')),
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_outcomes TO authenticated;
GRANT ALL ON public.referral_outcomes TO service_role;
ALTER TABLE public.referral_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read referral outcomes" ON public.referral_outcomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert referral outcomes" ON public.referral_outcomes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = recorded_by);
CREATE POLICY "Owner or admin update referral outcomes" ON public.referral_outcomes FOR UPDATE TO authenticated
  USING (auth.uid() = recorded_by OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'administrator'));
CREATE POLICY "Admin delete referral outcomes" ON public.referral_outcomes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));
CREATE TRIGGER trg_referral_outcomes_updated BEFORE UPDATE ON public.referral_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- FOLLOW-UPS
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('post_referral','maternal','newborn','child_health','nutrition','medication','missed_appointment','general','household_visit','other')),
  purpose text,
  priority text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','priority','urgent')),
  due_date date NOT NULL,
  assigned_to uuid REFERENCES auth.users(id),
  contact_method text CHECK (contact_method IN ('household_visit','phone_call','community_visit','facility_coordination')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','due','in_progress','completed','missed','cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read follow_ups" ON public.follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert follow_ups" ON public.follow_ups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin update follow_ups" ON public.follow_ups FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = assigned_to OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'administrator'));
CREATE POLICY "Admin delete follow_ups" ON public.follow_ups FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));
CREATE TRIGGER trg_follow_ups_updated BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_follow_ups_due ON public.follow_ups(due_date, status);
CREATE INDEX idx_follow_ups_person ON public.follow_ups(person_id);
CREATE INDEX idx_follow_ups_referral ON public.follow_ups(referral_id);

-- FOLLOW-UP ATTEMPTS
CREATE TABLE public.follow_up_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follow_up_id uuid NOT NULL REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  method text CHECK (method IN ('household_visit','phone_call','community_visit','facility_coordination')),
  contacted boolean NOT NULL DEFAULT false,
  result text CHECK (result IN ('no_answer','phone_unavailable','person_not_home','person_moved','refused_contact','contacted','other')),
  barrier text,
  next_attempt_at date,
  notes text,
  actor uuid REFERENCES auth.users(id)
);
GRANT SELECT, INSERT ON public.follow_up_attempts TO authenticated;
GRANT ALL ON public.follow_up_attempts TO service_role;
ALTER TABLE public.follow_up_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read follow_up_attempts" ON public.follow_up_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert follow_up_attempts" ON public.follow_up_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor);

-- FOLLOW-UP OUTCOMES
CREATE TABLE public.follow_up_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follow_up_id uuid NOT NULL UNIQUE REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  contact_status text CHECK (contact_status IN ('person_contacted','caregiver_contacted','not_reached','facility_contacted')),
  current_condition text CHECK (current_condition IN ('improved','unchanged','worsened','more_info_needed')),
  referral_completed boolean,
  care_received text,
  barriers text[] NOT NULL DEFAULT '{}',
  new_symptoms text,
  recommendations text,
  next_follow_up_at date,
  next_action text CHECK (next_action IN ('close','schedule_another','create_referral','escalate','start_assessment')),
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_outcomes TO authenticated;
GRANT ALL ON public.follow_up_outcomes TO service_role;
ALTER TABLE public.follow_up_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read follow_up_outcomes" ON public.follow_up_outcomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert follow_up_outcomes" ON public.follow_up_outcomes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = recorded_by);
CREATE POLICY "Owner or admin update follow_up_outcomes" ON public.follow_up_outcomes FOR UPDATE TO authenticated
  USING (auth.uid() = recorded_by OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'administrator'));
CREATE TRIGGER trg_follow_up_outcomes_updated BEFORE UPDATE ON public.follow_up_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed a small facility catalog (public reference data, safe to seed)
INSERT INTO public.facilities (name, type, region, district, sub_district, contact_phone, services, address) VALUES
  ('Kwadaso Health Centre', 'health_centre', 'Ashanti', 'Kwadaso', 'Kwadaso', '+233 24 000 0001', ARRAY['ANC','Immunisation','Outpatient','Family Planning'], 'Kwadaso, Kumasi'),
  ('Kumasi South Hospital', 'district_hospital', 'Ashanti', 'Asokwa', 'South Suntreso', '+233 32 202 2301', ARRAY['Emergency','Maternity','Paediatrics','Laboratory','Surgery'], 'Kumasi South, Ashanti'),
  ('Komfo Anokye Teaching Hospital', 'regional_hospital', 'Ashanti', 'Bantama', 'Bantama', '+233 32 202 2301', ARRAY['Emergency','Specialist Care','Maternity','Surgery','Paediatrics','NICU'], 'Bantama, Kumasi'),
  ('Suntreso Government Hospital', 'district_hospital', 'Ashanti', 'Kumasi Metro', 'Suntreso', '+233 32 202 4900', ARRAY['Emergency','Maternity','Outpatient','Laboratory'], 'Suntreso, Kumasi'),
  ('Emena CHPS Compound', 'chps_compound', 'Ashanti', 'Kwadaso', 'Emena', '+233 24 000 0002', ARRAY['ANC','Immunisation','Home Visits'], 'Emena Community'),
  ('Ridge Hospital (Greater Accra Regional)', 'regional_hospital', 'Greater Accra', 'Accra Metro', 'Ridge', '+233 30 222 8382', ARRAY['Emergency','Specialist Care','Maternity','NICU'], 'Ridge, Accra');
