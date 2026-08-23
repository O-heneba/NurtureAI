-- CREATE PERSON_NOTES TABLE FOR CLINICAL NOTES AND OBSERVATIONS
CREATE TABLE IF NOT EXISTS public.person_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('ANC', 'Assessment', 'Referral', 'General', 'Follow-up')),
  text text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_notes TO authenticated;
GRANT ALL ON public.person_notes TO service_role;

-- Enable RLS
ALTER TABLE public.person_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for person_notes
CREATE POLICY "Auth read person notes" ON public.person_notes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrator')
    OR public.has_role(auth.uid(), 'supervisor')
    OR EXISTS (
      SELECT 1 FROM public.persons p
      JOIN public.households h ON p.household_id = h.id
      WHERE p.id = person_notes.person_id
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

CREATE POLICY "Auth insert person notes" ON public.person_notes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      public.has_role(auth.uid(), 'administrator')
      OR public.has_role(auth.uid(), 'supervisor')
      OR public.has_role(auth.uid(), 'chps_worker')
    )
  );

CREATE POLICY "Auth update own notes" ON public.person_notes FOR UPDATE TO authenticated
  USING (
    auth.uid() = author_id
    AND (
      public.has_role(auth.uid(), 'administrator')
      OR public.has_role(auth.uid(), 'supervisor')
      OR public.has_role(auth.uid(), 'chps_worker')
    )
  );

CREATE POLICY "Auth delete own notes" ON public.person_notes FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id
    AND (
      public.has_role(auth.uid(), 'administrator')
      OR public.has_role(auth.uid(), 'supervisor')
      OR public.has_role(auth.uid(), 'chps_worker')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER trg_person_notes_updated BEFORE UPDATE ON public.person_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_person_notes_person_id ON public.person_notes(person_id);
CREATE INDEX IF NOT EXISTS idx_person_notes_author_id ON public.person_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_person_notes_type ON public.person_notes(type);
CREATE INDEX IF NOT EXISTS idx_person_notes_created_at ON public.person_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_notes_person_created ON public.person_notes(person_id, created_at DESC);
