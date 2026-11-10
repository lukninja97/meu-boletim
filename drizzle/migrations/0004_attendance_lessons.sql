ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS total_classes integer NOT NULL DEFAULT 1;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS missed_classes integer NOT NULL DEFAULT 0;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'presente';
UPDATE public.attendance SET missed_classes = CASE WHEN present THEN 0 ELSE total_classes END, status = CASE WHEN present THEN 'presente' ELSE 'falta' END;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_day ON public.attendance (student_id, class_subject_id, attendance_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;