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

  IF NOT EXISTS (
    SELECT 1
    FROM public.persons p
    WHERE p.id = target_person_id
      AND (
        public.has_role(auth.uid(), 'administrator')
        OR public.has_role(auth.uid(), 'supervisor')
        OR (
          public.has_role(auth.uid(), 'chps_worker')
          AND EXISTS (
            SELECT 1
            FROM public.households h
            JOIN public.communities_coverage cc ON cc.community_id = h.community_id
            JOIN public.chps_workers cw ON cw.community_id = cc.community_id
            WHERE h.id = p.household_id
              AND cw.user_id = auth.uid()
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'You are not authorized to delete this person';
  END IF;

  DELETE FROM public.referrals WHERE person_id = target_person_id;
  DELETE FROM public.follow_ups WHERE person_id = target_person_id;
  DELETE FROM public.assessments WHERE person_id = target_person_id;
  DELETE FROM public.pregnancies WHERE person_id = target_person_id;
  DELETE FROM public.person_notes WHERE person_id = target_person_id;
  UPDATE public.child_profiles
  SET mother_person_id = NULL
  WHERE mother_person_id = target_person_id;
  DELETE FROM public.child_profiles WHERE person_id = target_person_id;
  DELETE FROM public.persons WHERE id = target_person_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_person_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_person_cascade(uuid) TO authenticated;

COMMIT;