DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.syllabus_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.syllabus_history; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

DROP TRIGGER IF EXISTS trg_log_syllabus_history ON public.syllabus_status;
CREATE TRIGGER trg_log_syllabus_history
AFTER INSERT OR UPDATE ON public.syllabus_status
FOR EACH ROW EXECUTE FUNCTION public.log_syllabus_history();