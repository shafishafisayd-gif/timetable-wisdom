CREATE TABLE public.temp_timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_date date NOT NULL,
  day_code text NOT NULL,
  class_id text NOT NULL,
  period integer NOT NULL,
  subject text NOT NULL,
  teacher_code text,
  original_subject text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (override_date, class_id, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.temp_timetable TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temp_timetable TO authenticated;
GRANT ALL ON public.temp_timetable TO service_role;

ALTER TABLE public.temp_timetable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read temp_timetable" ON public.temp_timetable FOR SELECT USING (true);
CREATE POLICY "Anyone can write temp_timetable" ON public.temp_timetable FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_temp_timetable_updated_at
BEFORE UPDATE ON public.temp_timetable
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.temp_timetable REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.temp_timetable;