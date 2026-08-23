-- NurtureAI application base schema for the new Supabase project.
-- Authorization mappings are intentionally minimal: the existing application policies
-- require user/community relationships but no additional business columns.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('chps_worker', 'supervisor', 'administrator');

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  facility text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  community_code text,
  region text,
  district text,
  sub_district text,
  chps_zone text,
  chps_facility_id uuid,
  supervisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nearest_referral_facility_id uuid,
  gps_lat numeric,
  gps_lng numeric,
  location_desc text,
  primary_languages text[] NOT NULL DEFAULT '{}',
  common_health_challenges text[] NOT NULL DEFAULT '{}',
  accessibility text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','needs_attention','inactive','draft')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.households (
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
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  sex text,
  date_of_birth date,
  phone text,
  national_id text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pregnancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  lmp_date date,
  edd_date date,
  gravida integer,
  parity integer,
  anc_visits integer,
  status text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.child_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  mother_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  birth_weight_kg numeric,
  immunizations jsonb,
  growth_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  assessment_type text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_result jsonb,
  risk_level text,
  risk_score numeric,
  summary text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  facility text,
  facility_id uuid,
  reason text NOT NULL,
  category text,
  symptoms text,
  findings text,
  requested_service text,
  urgency text CHECK (urgency IN ('routine','priority','urgent','emergency')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged','accepted','in_progress','completed','declined','cancelled','pending')),
  follow_up_required boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.chps_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  UNIQUE (user_id, community_id)
);

CREATE TABLE public.communities_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  UNIQUE (community_id)
);

CREATE TABLE public.supervisors_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  UNIQUE (supervisor_id, community_id)
);

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE INDEX idx_profiles_updated_at ON public.profiles(updated_at);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_chps_workers_user_id ON public.chps_workers(user_id);
CREATE INDEX idx_chps_workers_community_id ON public.chps_workers(community_id);
CREATE INDEX idx_communities_coverage_community_id ON public.communities_coverage(community_id);
CREATE INDEX idx_supervisors_zones_supervisor_id ON public.supervisors_zones(supervisor_id);
CREATE INDEX idx_supervisors_zones_community_id ON public.supervisors_zones(community_id);
CREATE INDEX idx_persons_household_id ON public.persons(household_id);
CREATE INDEX idx_pregnancies_person_id ON public.pregnancies(person_id);
CREATE INDEX idx_child_profiles_person_id ON public.child_profiles(person_id);
CREATE INDEX idx_assessments_person_id ON public.assessments(person_id);
CREATE INDEX idx_referrals_person_id ON public.referrals(person_id);
CREATE INDEX idx_referrals_assessment_id ON public.referrals(assessment_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregnancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chps_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisors_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Users update own profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role('administrator', auth.uid()))
  WITH CHECK (auth.uid() = id OR public.has_role('administrator', auth.uid()));

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Administrators manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role('administrator', auth.uid()))
  WITH CHECK (public.has_role('administrator', auth.uid()));

CREATE POLICY "Authorized users read pregnancies" ON public.pregnancies FOR SELECT TO authenticated
  USING (public.has_role('administrator', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR EXISTS (
    SELECT 1 FROM public.persons p
    JOIN public.households h ON h.id = p.household_id
    JOIN public.communities_coverage cc ON cc.community_id = h.community_id
    JOIN public.chps_workers cw ON cw.community_id = cc.community_id
    WHERE p.id = pregnancies.person_id AND cw.user_id = auth.uid()
  ));
CREATE POLICY "Authorized workers manage pregnancies" ON public.pregnancies FOR INSERT TO authenticated
  WITH CHECK (public.has_role('chps_worker', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Authorized workers update pregnancies" ON public.pregnancies FOR UPDATE TO authenticated
  USING (public.has_role('chps_worker', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));

CREATE POLICY "Authorized users read child profiles" ON public.child_profiles FOR SELECT TO authenticated
  USING (public.has_role('administrator', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('chps_worker', auth.uid()));
CREATE POLICY "Authorized workers insert child profiles" ON public.child_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role('chps_worker', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Authorized workers update child profiles" ON public.child_profiles FOR UPDATE TO authenticated
  USING (public.has_role('chps_worker', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));

CREATE POLICY "Authorized users read assessments" ON public.assessments FOR SELECT TO authenticated
  USING (public.has_role('administrator', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('chps_worker', auth.uid()));
CREATE POLICY "Authorized workers create assessments" ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (public.has_role('chps_worker', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid())));
CREATE POLICY "Authorized workers update assessments" ON public.assessments FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));

CREATE POLICY "Authorized users read referrals" ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role('administrator', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('chps_worker', auth.uid()));
CREATE POLICY "Authorized workers create referrals" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (public.has_role('chps_worker', auth.uid()) OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid())));
CREATE POLICY "Authorized workers update referrals" ON public.referrals FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));

CREATE POLICY "Workers read own assignments" ON public.chps_workers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Administrators manage worker assignments" ON public.chps_workers FOR ALL TO authenticated
  USING (public.has_role('administrator', auth.uid()))
  WITH CHECK (public.has_role('administrator', auth.uid()));
CREATE POLICY "Users read coverage" ON public.communities_coverage FOR SELECT TO authenticated
  USING (public.has_role('supervisor', auth.uid()) OR public.has_role('administrator', auth.uid()) OR EXISTS (
    SELECT 1 FROM public.chps_workers cw WHERE cw.community_id = communities_coverage.community_id AND cw.user_id = auth.uid()
  ));
CREATE POLICY "Administrators manage coverage" ON public.communities_coverage FOR ALL TO authenticated
  USING (public.has_role('administrator', auth.uid()))
  WITH CHECK (public.has_role('administrator', auth.uid()));
CREATE POLICY "Users read supervisor zones" ON public.supervisors_zones FOR SELECT TO authenticated
  USING (supervisor_id = auth.uid() OR public.has_role('administrator', auth.uid()));
CREATE POLICY "Administrators manage supervisor zones" ON public.supervisors_zones FOR ALL TO authenticated
  USING (public.has_role('administrator', auth.uid()))
  WITH CHECK (public.has_role('administrator', auth.uid()));

GRANT USAGE ON TYPE public.app_role TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles, public.chps_workers, public.communities_coverage, public.supervisors_zones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.user_roles, public.chps_workers, public.communities_coverage, public.supervisors_zones TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pregnancies, public.child_profiles, public.assessments, public.referrals TO authenticated;
GRANT ALL ON public.pregnancies, public.child_profiles, public.assessments, public.referrals TO service_role;
