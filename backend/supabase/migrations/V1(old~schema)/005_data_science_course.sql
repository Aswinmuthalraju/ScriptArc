-- ============================================================
-- ScriptArc — Migration 005: Data Science Course System
-- Adds lessons table, user_progress, extends courses/challenges,
-- and seeds "Data Science Fundamentals" with 25 challenges.
-- ============================================================

-- ─── 1. Extend courses table ─────────────────────────────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS level            text         DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS thumbnail_url    text,
  ADD COLUMN IF NOT EXISTS duration_hours   numeric(4,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_challenges int          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating           numeric(3,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrolled_count   int          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags             text[]       DEFAULT '{}';

-- ─── 2. Create lessons table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index      int         NOT NULL,
  title            text        NOT NULL,
  description      text,
  video_url        text,
  duration_minutes int         NOT NULL DEFAULT 15,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id);

-- ─── 3. Extend challenges table ──────────────────────────────
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS lesson_id         uuid    REFERENCES public.lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description       text,
  ADD COLUMN IF NOT EXISTS timestamp_seconds numeric,
  ADD COLUMN IF NOT EXISTS initial_code      text,
  ADD COLUMN IF NOT EXISTS language_id       int,
  ADD COLUMN IF NOT EXISTS challenge_type    text    NOT NULL DEFAULT 'coding',
  ADD COLUMN IF NOT EXISTS options           jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS correct_option    int     DEFAULT 0;

-- ─── 4. Create user_progress table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.user_progress (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id               uuid        NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id               uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed               boolean     NOT NULL DEFAULT false,
  stars_earned            int         NOT NULL DEFAULT 0,
  completed_challenge_ids uuid[]      NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user   ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson ON public.user_progress(lesson_id);

-- ============================================================
-- SEED: Data Science Fundamentals Course
-- ============================================================

INSERT INTO public.courses (id, title, description, level, thumbnail_url, duration_hours, total_challenges, rating, tags)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Data Science Fundamentals',
  'Master the foundations of data science through interactive video lessons and hands-on coding challenges. Learn Python, NumPy, and core data analysis techniques used by professionals.',
  'beginner',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
  2.5, 25, 4.9,
  ARRAY['Python', 'NumPy', 'Data Science', 'Machine Learning']
)
ON CONFLICT (id) DO UPDATE SET
  title            = EXCLUDED.title,
  description      = EXCLUDED.description,
  level            = EXCLUDED.level,
  thumbnail_url    = EXCLUDED.thumbnail_url,
  duration_hours   = EXCLUDED.duration_hours,
  total_challenges = EXCLUDED.total_challenges,
  rating           = EXCLUDED.rating,
  tags             = EXCLUDED.tags;

-- ─── Lessons ──────────────────────────────────────────────────
INSERT INTO public.lessons (id, course_id, order_index, title, description, video_url, duration_minutes)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 1,
   'What is Data Science',
   'An introduction to Data Science — its definition, importance, and the interdisciplinary skills behind it.',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 14),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 2,
   'Facets of Data',
   'Explore different types of data: structured, unstructured, metadata, and their real-world characteristics.',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 12),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 3,
   'Data Science Process',
   'Learn the end-to-end data science workflow from problem definition to model deployment and monitoring.',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 12),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 4,
   'Introduction to NumPy',
   'Get started with NumPy — the fundamental library for numerical computing in Python.',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 6),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 5,
   'Array Creation & Attributes',
   'Learn to create NumPy arrays of any shape and explore their key attributes and methods.',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 8)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title, 
  description = EXCLUDED.description, 
  video_url = EXCLUDED.video_url, 
  duration_minutes = EXCLUDED.duration_minutes;

-- ============================================================
-- LESSON 1 CHALLENGES  (4 MCQs — timestamps: 1:24, 3:55, 6:08, 11:58)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('00000000-0000-0000-0001-000000000001',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
 'mcq', 'What is Data Science?',
 'Which of the following best describes Data Science?',
 84,
 '["Storing structured data in databases","Gathering data, analyzing patterns, and making predictions","Writing code only for AI systems","Managing business transactions digitally"]',
 1, 1, 'easy',
 '["Data Science involves collecting data and using it to find meaningful patterns and make predictions."]'),

('00000000-0000-0000-0001-000000000002',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
 'mcq', 'Primary Goal of Data Science',
 'What is the primary goal of Data Science?',
 235,
 '["Build mobile applications","Extract insights and knowledge from data","Design user interfaces","Manage server infrastructure"]',
 1, 1, 'easy',
 '["Data scientists focus on turning raw data into actionable knowledge and insights."]'),

('00000000-0000-0000-0001-000000000003',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
 'mcq', 'Data Science Workflow',
 'Which of these is NOT a typical step in a Data Science workflow?',
 368,
 '["Data collection","Data cleaning","UI/UX design","Model building"]',
 2, 1, 'easy',
 '["Think about what data scientists do — they work with data, not user interfaces."]'),

('00000000-0000-0000-0001-000000000004',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
 'mcq', 'Interdisciplinary Nature',
 'Data Science combines expertise from which fields?',
 718,
 '["Marketing and sales only","Statistics, programming, and domain knowledge","Graphic design and art","Finance and accounting only"]',
 1, 1, 'easy',
 '["Data Science sits at the intersection of mathematics, computer science, and subject-matter expertise."]')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LESSON 2 CHALLENGES  (6 MCQs — 1:34, 4:07, 5:01, 6:20, 8:10, 9:41)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('00000000-0000-0000-0002-000000000001',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
 'mcq', 'Types of Data',
 'What are the two main categories of data?',
 94,
 '["Big data and small data","Structured and unstructured data","Fast and slow data","Internal and external data"]',
 1, 1, 'easy',
 '["Data can be organized in tables (structured) or exist as free-form content (unstructured)."]'),

('00000000-0000-0000-0002-000000000002',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
 'mcq', 'Where is Structured Data Stored?',
 'Structured data is typically stored in:',
 247,
 '["Text documents","Images","Relational databases","Audio files"]',
 2, 1, 'easy',
 '["Structured data has a defined schema with rows and columns — think spreadsheets and SQL tables."]'),

('00000000-0000-0000-0002-000000000003',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
 'mcq', 'Unstructured Data Example',
 'Which of the following is an example of unstructured data?',
 301,
 '["A spreadsheet of sales figures","A relational database table","A collection of social media posts","A CSV file"]',
 2, 1, 'easy',
 '["Unstructured data has no predefined format — emails, tweets, and videos are common examples."]'),

('00000000-0000-0000-0002-000000000004',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
 'mcq', 'What is Metadata?',
 'What is metadata?',
 380,
 '["Data about data","Very large datasets","Encrypted data","Missing values in a dataset"]',
 0, 1, 'easy',
 '["Meta means \"about\" — metadata describes other data (e.g., a photo''s creation date and GPS location)."]'),

('00000000-0000-0000-0002-000000000005',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
 'mcq', 'Most Common Data Type',
 'Which data type is most prevalent in real-world datasets?',
 490,
 '["Fully structured data only","Only unstructured data","Mixed structured and unstructured data","Binary data only"]',
 2, 1, 'easy',
 '["Real-world data is messy — most organizations deal with a mix of both structured and unstructured data."]'),

('00000000-0000-0000-0002-000000000006',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
 'mcq', 'Importance of Data Quality',
 'Why is data quality critical in Data Science?',
 581,
 '["It speeds up internet connections","Poor quality data leads to inaccurate insights and decisions","It reduces storage costs","It improves UI performance"]',
 1, 1, 'easy',
 '["Remember: garbage in, garbage out — models are only as good as the data they train on."]')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LESSON 3 CHALLENGES  (6 MCQs — 1:14, 3:32, 5:11, 6:21, 8:55, 9:35)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('00000000-0000-0000-0003-000000000001',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
 'mcq', 'First Step in DS Process',
 'What is the first step in the Data Science process?',
 74,
 '["Model training","Data visualization","Problem definition and data collection","Deployment"]',
 2, 1, 'easy',
 '["You can''t solve a problem you haven''t defined — the process always starts with understanding the question."]'),

('00000000-0000-0000-0003-000000000002',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
 'mcq', 'Data Cleaning',
 'Data cleaning involves:',
 212,
 '["Deleting all data","Handling missing values, duplicates, and errors","Encrypting sensitive information","Compressing data files"]',
 1, 1, 'easy',
 '["Raw data is rarely perfect — cleaning means fixing or removing incorrect, corrupted, or duplicate records."]'),

('00000000-0000-0000-0003-000000000003',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
 'mcq', 'Exploratory Data Analysis',
 'Exploratory Data Analysis (EDA) is used to:',
 311,
 '["Deploy machine learning models","Understand data patterns and distributions","Write database queries","Create web applications"]',
 1, 1, 'easy',
 '["EDA is the detective phase — you visualize and summarize data to understand what stories it tells."]'),

('00000000-0000-0000-0003-000000000004',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
 'mcq', 'Feature Engineering',
 'Feature engineering refers to:',
 381,
 '["Building software UI features","Creating or transforming variables to improve model performance","Hardware design","Network configuration"]',
 1, 1, 'easy',
 '["Features are the input variables for your model — engineering them means making raw data more useful for learning."]'),

('00000000-0000-0000-0003-000000000005',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
 'mcq', 'Model Evaluation Metrics',
 'Common model evaluation metrics include:',
 535,
 '["CPU speed and RAM usage","Accuracy, precision, recall, and F1-score","Color schemes and fonts","Server response times"]',
 1, 1, 'easy',
 '["These metrics measure how well the model''s predictions match the actual outcomes in the test set."]'),

('00000000-0000-0000-0003-000000000006',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
 'mcq', 'After Deployment',
 'After deploying a Data Science model, what comes next?',
 575,
 '["Deleting the training data","Monitoring and maintaining the model in production","Rebuilding the entire UI","Restarting the database server"]',
 1, 1, 'easy',
 '["A deployed model needs ongoing care — performance can degrade as the real world changes (data drift)."]')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LESSON 4 CHALLENGES  (5 MCQs — 0:57, 2:44, 3:29, 3:55, 4:14)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('00000000-0000-0000-0004-000000000001',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014',
 'mcq', 'NumPy Name Meaning',
 'What does "NumPy" stand for?',
 57,
 '["Numerical Python","New Universal Python","Numeric Utility Package","Number Processing Yield"]',
 0, 1, 'easy',
 '["NumPy was built specifically for numerical operations — think: numbers + Python."]'),

('00000000-0000-0000-0004-000000000002',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014',
 'mcq', 'NumPy Primary Data Structure',
 'What is the primary data structure in NumPy?',
 164,
 '["Python list","Python dictionary","ndarray (N-dimensional array)","Python tuple"]',
 2, 1, 'easy',
 '["NumPy''s power comes from its array object — it can represent data of any number of dimensions."]'),

('00000000-0000-0000-0004-000000000003',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014',
 'mcq', 'NumPy vs Python Lists',
 'What is the key advantage of NumPy arrays over Python lists?',
 209,
 '["They can store mixed data types","They are significantly faster for numerical computations","They have more string methods","They use more memory"]',
 1, 1, 'easy',
 '["NumPy arrays store data in contiguous memory and use C-level operations — much faster than Python loops."]'),

('00000000-0000-0000-0004-000000000004',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014',
 'mcq', 'Importing NumPy',
 'What is the conventional way to import NumPy in Python?',
 235,
 '["import numpy","import numpy as np","from numpy import all","import Numpy as NP"]',
 1, 1, 'easy',
 '["The alias np is used by the entire Python data science community for consistency."]'),

('00000000-0000-0000-0004-000000000005',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014',
 'mcq', 'NumPy Use Cases',
 'NumPy is primarily used for:',
 254,
 '["Web development","Scientific computing and numerical operations","Database management","Front-end styling"]',
 1, 1, 'easy',
 '["NumPy underpins almost all scientific Python libraries — pandas, scikit-learn, and TensorFlow all rely on it."]')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LESSON 5 CHALLENGES  (3 MCQs + 1 Coding — 0:52, 3:48, 4:54, 6:50)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('00000000-0000-0000-0005-000000000001',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000015',
 'mcq', 'Creating an Array of Zeros',
 'Which NumPy function creates an array filled with zeros?',
 52,
 '["np.zeros()","np.empty()","np.ones()","np.array(0)"]',
 0, 1, 'easy',
 '["NumPy has dedicated factory functions for common patterns — np.zeros, np.ones, np.full."]'),

('00000000-0000-0000-0005-000000000003',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000015',
 'mcq', 'Array Shape Attribute',
 'The shape attribute of a NumPy array returns:',
 294,
 '["The total number of elements","A tuple representing the size of each dimension","The data type of elements","The memory address of the array"]',
 1, 1, 'easy',
 '["Shape tells you the size along each axis — (2, 5) means 2 rows and 5 columns."]'),

('00000000-0000-0000-0005-000000000004',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000015',
 'mcq', 'np.arange Result',
 'What does np.arange(10, 20) create?',
 410,
 '["An array from 0 to 20","An array from 10 to 19","An array from 10 to 20 inclusive","An array of 10 zeros"]',
 1, 1, 'easy',
 '["arange works like Python range — the stop value is exclusive, so (10, 20) gives [10, 11, ..., 19]."]')

ON CONFLICT (id) DO NOTHING;

-- Coding challenge at 3:48 (228s) — insert separately for clarity
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES (
  '00000000-0000-0000-0005-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000015',
  'coding',
  'Create NumPy Arrays of Different Dimensions',
  'Task
Complete the missing parts of the code to create 0D, 1D, 2D, and 3D NumPy arrays.
Note: You can use different numbers inside the arrays for your submission.',
  228,
  E'import numpy as np\n\n# arr0 → 0D array\narr0 = \n\n# arr1 → 1D array\narr1 = \n\n# arr2 → 2D array\narr2 = \n\n# arr3 → 3D array\narr3 = \n\nprint(arr0)\nprint(arr1)\nprint(arr2)\nprint(arr3._____)',
  71,
  2,
  'medium',
  '["Use np.array() and provide different nested lists depending on the dimension", "Use .ndim to print the dimension"]',
  E'import numpy as np\n\n# arr0 → 0D array\narr0 = np.array(42)\n\n# arr1 → 1D array\narr1 = np.array([1, 2, 3, 4, 5])\n\n# arr2 → 2D array\narr2 = np.array([[1, 2, 3], [4, 5, 6]])\n\n# arr3 → 3D array\narr3 = np.array([[[1, 2, 3], [4, 5, 6]], [[7, 8, 9], [10, 11, 12]]])\n\nprint(arr0)\nprint(arr1)\nprint(arr2)\nprint(arr3.ndim)'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  initial_code = EXCLUDED.initial_code,
  hints = EXCLUDED.hints,
  solution = EXCLUDED.solution;
