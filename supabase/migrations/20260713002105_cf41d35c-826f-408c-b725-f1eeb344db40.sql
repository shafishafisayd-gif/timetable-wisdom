
-- 1. Add columns to evaluations for round tracking, academic year, and absent flag
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS round_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS eval_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Attach syllabus history trigger (function exists but was never wired up)
DROP TRIGGER IF EXISTS trg_log_syllabus_history ON public.syllabus_status;
CREATE TRIGGER trg_log_syllabus_history
  AFTER INSERT OR UPDATE ON public.syllabus_status
  FOR EACH ROW EXECUTE FUNCTION public.log_syllabus_history();

-- 3. REPLICA IDENTITY FULL so realtime UPDATE payloads carry the row data
ALTER TABLE public.evaluations REPLICA IDENTITY FULL;
ALTER TABLE public.round_picks REPLICA IDENTITY FULL;
ALTER TABLE public.syllabus_status REPLICA IDENTITY FULL;
ALTER TABLE public.syllabus_settings REPLICA IDENTITY FULL;

-- 4. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_evaluations_tcs ON public.evaluations (teacher_code, class_id, subject);
CREATE INDEX IF NOT EXISTS idx_evaluations_student ON public.evaluations (student_id);
CREATE INDEX IF NOT EXISTS idx_round_picks_tcs_round ON public.round_picks (teacher_code, class_id, subject, round_no);
