CREATE TABLE public.class_semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  semester_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','ativo','concluido')),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (class_id, semester_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_semesters TO authenticated;
GRANT ALL ON public.class_semesters TO service_role;
ALTER TABLE public.class_semesters ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX class_semesters_one_active ON public.class_semesters(class_id) WHERE status = 'ativo';
CREATE POLICY "Professors manage class semesters" ON public.class_semesters FOR ALL TO authenticated USING (public.has_role(auth.uid(),'professor')) WITH CHECK (public.has_role(auth.uid(),'professor'));
CREATE POLICY "Students view class semesters" ON public.class_semesters FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = auth.uid() AND e.class_id = class_semesters.class_id));

ALTER TABLE public.class_subjects ADD COLUMN semester_number integer;
UPDATE public.class_subjects cs SET semester_number = c.semester FROM public.classes c WHERE c.id = cs.class_id;

INSERT INTO public.class_semesters (class_id, semester_number, status, closed_at)
SELECT c.id, g.n,
  CASE WHEN g.n < c.semester THEN 'concluido' WHEN g.n = c.semester THEN 'ativo' ELSE 'pendente' END,
  CASE WHEN g.n < c.semester THEN now() END
FROM public.classes c JOIN public.courses co ON co.id = c.course_id
CROSS JOIN LATERAL generate_series(1, GREATEST(co.total_semesters, c.semester)) g(n);