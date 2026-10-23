BEGIN;

CREATE OR REPLACE FUNCTION public.delete_person_cascade(target_person_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_person_id IS NULL THEN
    RAISE EXCEPTION 'Person id is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.persons WHERE id = target_person_id) THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('administrator'::public.app_role, 'supervisor'::public.app_role, 'chps_worker'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'You are not authorized to delete this person';
  END IF;

  DELETE FROM public.referrals WHERE person_id = target_person_id;
  DELETE FROM public.follow_ups WHERE person_id = target_person_id;
  DELETE FROM public.assessments WHERE person_id = target_person_id;
  DELETE FROM public.pregnancies WHERE person_id = target_person_id;
  DELETE FROM public.person_notes WHERE person_id = target_person_id;
  UPDATE public.child_profiles SET mother_person_id = NULL WHERE mother_person_id = target_person_id;
  DELETE FROM public.child_profiles WHERE person_id = target_person_id;
  DELETE FROM public.persons WHERE id = target_person_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_person_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_person_cascade(uuid) TO authenticated;

COMMIT;