ALTER TABLE public.evaluations REPLICA IDENTITY FULL;
ALTER TABLE public.round_picks REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='evaluations') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluations';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='round_picks') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.round_picks';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='students') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.students';
  END IF;
END$$;