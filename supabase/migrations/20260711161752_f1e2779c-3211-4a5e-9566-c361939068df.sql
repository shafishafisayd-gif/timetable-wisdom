
CREATE TABLE public.syllabus_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  academic_year_name TEXT NOT NULL DEFAULT '2025-2026',
  start_month INTEGER NOT NULL DEFAULT 6,
  end_month INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT syllabus_settings_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_settings TO anon, authenticated;
GRANT ALL ON public.syllabus_settings TO service_role;
ALTER TABLE public.syllabus_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read syllabus_settings" ON public.syllabus_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can write syllabus_settings" ON public.syllabus_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.syllabus_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.syllabus_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_code TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  academic_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject, teacher_code, month, academic_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_status TO anon, authenticated;
GRANT ALL ON public.syllabus_status TO service_role;
ALTER TABLE public.syllabus_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read syllabus_status" ON public.syllabus_status FOR SELECT USING (true);
CREATE POLICY "Anyone can write syllabus_status" ON public.syllabus_status FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.syllabus_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_code TEXT NOT NULL,
  month INTEGER NOT NULL,
  academic_year TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  updated_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_history TO anon, authenticated;
GRANT ALL ON public.syllabus_history TO service_role;
ALTER TABLE public.syllabus_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read syllabus_history" ON public.syllabus_history FOR SELECT USING (true);
CREATE POLICY "Anyone can write syllabus_history" ON public.syllabus_history FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_syllabus_history()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.syllabus_history (class_id, subject, teacher_code, month, academic_year, previous_status, new_status, updated_by)
    VALUES (NEW.class_id, NEW.subject, NEW.teacher_code, NEW.month, NEW.academic_year, NULL, NEW.status, NEW.updated_by);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.syllabus_history (class_id, subject, teacher_code, month, academic_year, previous_status, new_status, updated_by)
    VALUES (NEW.class_id, NEW.subject, NEW.teacher_code, NEW.month, NEW.academic_year, OLD.status, NEW.status, NEW.updated_by);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER syllabus_status_history
AFTER INSERT OR UPDATE ON public.syllabus_status
FOR EACH ROW EXECUTE FUNCTION public.log_syllabus_history();

ALTER PUBLICATION supabase_realtime ADD TABLE public.syllabus_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.syllabus_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.syllabus_history;
