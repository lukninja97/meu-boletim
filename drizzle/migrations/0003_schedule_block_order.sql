ALTER TABLE public.class_schedules ADD COLUMN order_index integer NOT NULL DEFAULT 1;
ALTER TABLE public.class_schedules DROP CONSTRAINT IF EXISTS class_schedules_class_id_subject_id_day_of_week_key;
CREATE INDEX IF NOT EXISTS class_schedules_class_day_idx ON public.class_schedules (class_id, day_of_week, order_index);