ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_semester_check;
ALTER TABLE public.classes ADD CONSTRAINT classes_semester_check CHECK (semester >= 1 AND semester <= 12);