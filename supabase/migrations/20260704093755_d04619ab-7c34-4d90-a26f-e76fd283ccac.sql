
-- Schema
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no integer NOT NULL UNIQUE,
  name text NOT NULL,
  class_id text NOT NULL CHECK (class_id IN ('S1','S2','S3','S4','S5','S6','S7')),
  sl_no integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.students (class_id);

CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_code text NOT NULL,
  class_id text NOT NULL,
  subject text NOT NULL,
  day text NOT NULL,
  period integer NOT NULL,
  status text NOT NULL CHECK (status IN ('answered','not_answered','absent')),
  mark integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.evaluations (student_id);
CREATE INDEX ON public.evaluations (teacher_code, class_id, subject);
CREATE INDEX ON public.evaluations (class_id);

CREATE TABLE public.round_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_code text NOT NULL,
  class_id text NOT NULL,
  subject text NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  round_no integer NOT NULL DEFAULT 1,
  picked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_code, class_id, subject, round_no, student_id)
);
CREATE INDEX ON public.round_picks (teacher_code, class_id, subject, round_no);

-- Grants (public read + write since we don't have auth yet)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO anon, authenticated;
GRANT ALL ON public.students TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO anon, authenticated;
GRANT ALL ON public.evaluations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_picks TO anon, authenticated;
GRANT ALL ON public.round_picks TO service_role;

-- RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read students"  ON public.students  FOR SELECT USING (true);
CREATE POLICY "Anyone can write students" ON public.students  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read evaluations"  ON public.evaluations  FOR SELECT USING (true);
CREATE POLICY "Anyone can write evaluations" ON public.evaluations  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read round_picks"  ON public.round_picks  FOR SELECT USING (true);
CREATE POLICY "Anyone can write round_picks" ON public.round_picks  FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_picks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- Seed students
INSERT INTO public.students (admission_no, name, class_id, sl_no) VALUES
-- S7
(2,'MUHAMMED NABEEL MK','S7',1),
(4,'MUHAMMED AFSAL T','S7',2),
(5,'MUHAMMED MINSHAJ K','S7',3),
(7,'MUHAMMED RASHID KC','S7',4),
(9,'MOHAMED ANAS KT','S7',5),
(14,'MUHAMMED SINAN P','S7',6),
(15,'RUMAIZ M','S7',7),
(16,'SUHAIL PARANCHEERI','S7',8),
(17,'MUHAMMED RADIN K','S7',9),
(18,'MUHAMMED MAZIN M','S7',10),
(19,'MUHAMMED SHAHEED TP','S7',11),
(21,'SALMAN AL FAIZE','S7',12),
(23,'HABEEB MK','S7',13),
-- S6
(26,'MUHAMMED SUFYAN AK','S6',1),
(29,'MUHAMMED MIDLAJ C','S6',2),
(33,'MUHAMMED SINAN K','S6',3),
(35,'SHFIN ROSHAN','S6',4),
(38,'MUHAMED SINAN PP','S6',5),
(41,'MUHAMMED RASHID P','S6',6),
(42,'MUHAMMED MUNAVVAR C','S6',7),
(44,'SHANID M','S6',8),
(45,'MUHAMMED UMAIR TP','S6',9),
(46,'MUHAMMED SABITH U','S6',10),
(48,'MUHAMMED AFLAH TK','S6',11),
(49,'MUHAMMED SINAN P','S6',12),
-- S5
(53,'MUHAMMED HISHAM V','S5',1),
(54,'MUHAMMED AMEEN V','S5',2),
(55,'MUHAMMED NOUFAL P','S5',3),
(56,'MUBARIS HAREEF PK','S5',4),
(57,'MIDHLAJ TK','S5',5),
(58,'MUHAMMED RASAL V','S5',6),
(60,'MUHAMMED FASIL K','S5',7),
(61,'MUHAMMED SAHIL V','S5',8),
(62,'NADISH RAHMAN K','S5',9),
(63,'MUHAMMED MUSFIR K','S5',10),
(65,'MUHAMMED SINAN KT','S5',11),
(66,'MUHAMMED SHAMIL KM','S5',12),
(68,'MUHAMMED FARHAN PT','S5',13),
(69,'MUHAMMED SINAN P','S5',14),
(71,'MAJID CP','S5',15),
(72,'MUHAMMED ASHFAQ P','S5',16),
(73,'SHAHAL KP','S5',17),
(74,'MUHAMMED SHAMIL K','S5',18),
(75,'MUHAMMED SALEEL PT','S5',19),
(76,'MUHAMMED FAHEEM K','S5',20),
(77,'MUHAMMED RIZVAN K','S5',21),
-- S4
(78,'ABDURAHMAN M','S4',1),
(80,'MUHAMMED UNAIS PP','S4',2),
(82,'MUHAMMED NADIL K','S4',3),
(83,'MUHAMMED ADIL VP','S4',4),
(85,'MUHAMMED SABITH M','S4',5),
(86,'MUHAMMED SALA MATTIL','S4',6),
(87,'NIFAL AHAMMED P','S4',7),
(88,'MUHAMMED JINAN MP','S4',8),
(91,'MUHAMMED ADNAN K','S4',9),
(94,'MUHAMMED AFLAH MK','S4',10),
-- S3
(97,'MUHAMMED HISHAM PP','S3',1),
(98,'MUHAMMED ANZIL K','S3',2),
(99,'SAYYID MUHAMMED NASEEL PM','S3',3),
(100,'MUHAMMED MUBARAK CK','S3',4),
(102,'MUHAMMED IRFAN PT','S3',5),
(103,'MOHAMMED CIBIN PT','S3',6),
(104,'ANAS PP','S3',7),
(105,'MUHAMMED ANSHAD M','S3',8),
(107,'MUHAMMED ZIYAD PK','S3',9),
(108,'MUHAMMED SHAHIN KP','S3',10),
(109,'MUHAMMED ASLIF PP','S3',11),
(110,'MUHAMMED MINHAJ P','S3',12),
(112,'AFZAL RAHMAN UT','S3',13),
(113,'MUHAMMED RISHAL PK','S3',14),
(116,'MUHAMMED MUSHFIQUE EK','S3',15),
(117,'MUHAMMED SINAN K','S3',16),
(119,'MUHAMMED FARHAN A','S3',17),
(120,'MUHAMMED AJAS P','S3',18),
-- S2
(124,'MUHAMMAD MISHAL V','S2',1),
(125,'AFNAN TS','S2',2),
(126,'THAJUDHEEN THANGAL TP','S2',3),
(127,'MOHAMMED FAWAZ VP','S2',4),
(128,'MUHAMMED SHAMMAS K','S2',5),
(129,'MUHAMMED IRFAN TK','S2',6),
(130,'MUHAMMED AKMAL MK','S2',7),
(131,'ABDUL HADI KK','S2',8),
(133,'AHAMMED NABHAN MC','S2',9),
(134,'MUHAMMED MARVAN CT','S2',10),
(137,'RABEEH CT','S2',11),
(138,'MUHAMMED ASHMIL P','S2',12),
(139,'MUHAMMED ADIL K','S2',13),
(140,'MUHAMMED RAYYAN AT','S2',14),
(142,'MUHAMMED NAJIB P','S2',15),
-- S1
(144,'ADIL RAHMAN CP','S1',1),
(145,'AJVAD M','S1',2),
(146,'MOHAMMED AMEEN TV','S1',3),
(147,'MUHAMMAD SABEEH K','S1',4),
(148,'MUHAMMAD SABITH P','S1',5),
(149,'MUHAMMED AYYOOB AP','S1',6),
(150,'MUHAMMED HISHAM MM','S1',7),
(151,'MUHAMMED HISHAM P','S1',8),
(152,'MUHAMMED RAHANAS VK','S1',9),
(153,'MUHAMMED RAHEES CHEERANTHODI','S1',10),
(154,'MUHAMMED SHABIL M','S1',11),
(156,'MUHAMMED SHAMIL VF','S1',12),
(157,'MUHAMMED SHAMLAN V','S1',13),
(158,'MUHAMMED SINAN M','S1',14),
(159,'MUHAMMED SIYAD EP','S1',15),
(160,'MUHAMMED UNAIS V','S1',16),
(161,'SADIN MUHAMMED K','S1',17);
