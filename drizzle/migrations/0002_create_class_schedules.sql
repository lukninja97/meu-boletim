CREATE TABLE public.class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  lessons_count integer NOT NULL DEFAULT 0 CHECK (lessons_count BETWEEN 0 AND 20),
  created_at timestamptz DEFAULT now(),
  UNIQUE (class_id, subject_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedules TO authenticated;
GRANT ALL ON public.class_schedules TO service_role;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professors manage schedules" ON public.class_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'professor')) WITH CHECK (public.has_role(auth.uid(), 'professor'));
CREATE POLICY "Students view their schedules" ON public.class_schedules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = auth.uid() AND e.class_id = class_schedules.class_id));