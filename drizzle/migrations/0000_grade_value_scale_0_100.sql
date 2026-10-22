ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_grade_value_check;
ALTER TABLE public.grades ADD CONSTRAINT grades_grade_value_check CHECK (grade_value >= 0 AND grade_value <= 100);