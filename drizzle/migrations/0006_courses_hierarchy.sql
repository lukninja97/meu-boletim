CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  total_semesters integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view courses" ON public.courses FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Professors manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'professor')) WITH CHECK (public.has_role(auth.uid(),'professor'));

CREATE TABLE public.course_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester_number integer NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (course_id, semester_number, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_subjects TO authenticated;
GRANT ALL ON public.course_subjects TO service_role;
ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view course subjects" ON public.course_subjects FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Professors manage course subjects" ON public.course_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(),'professor')) WITH CHECK (public.has_role(auth.uid(),'professor'));

ALTER TABLE public.classes ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.classes ADD COLUMN city text;
COMMENT ON COLUMN public.classes.course IS 'DEPRECATED: replaced by course_id';