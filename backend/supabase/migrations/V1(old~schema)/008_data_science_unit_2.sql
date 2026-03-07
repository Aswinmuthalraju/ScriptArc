-- ============================================================
-- ScriptArc — Migration 008: Data Science Course Full Rebuild
-- Replaces zero-padded UUIDs with proper ones, adds Unit 2,
-- and distributes challenges across the correct lectures.
-- ============================================================

-- Course UUID
-- DS Course: d5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c

-- ─── Step 1: Wipe old data (cascading from course) ──────────
-- user_progress, challenges, lessons all cascade from course
DELETE FROM public.user_progress WHERE course_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.challenges    WHERE course_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.lessons       WHERE course_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.courses       WHERE id        = '00000000-0000-0000-0000-000000000001';

-- ─── Step 2: Re-insert Course with clean UUID ───────────────
INSERT INTO public.courses (id, title, description, level, thumbnail_url, duration_hours, total_challenges, rating, tags)
VALUES (
  'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c',
  'Data Science Fundamentals',
  'Master the foundations of data science through interactive video lessons and hands-on coding challenges. Learn Python, NumPy, and core data analysis techniques used by professionals.',
  'beginner',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
  6, 25, 4.9,
  ARRAY['Python', 'NumPy', 'Data Science', 'Machine Learning']
);

-- ─── Step 3: Insert all 21 Lessons ──────────────────────────
INSERT INTO public.lessons (id, course_id, order_index, title, description, video_url, duration_minutes)
VALUES
  -- ── Unit 1 (11 Lectures) ──
  ('a7b1c2d3-e4f5-4a01-8b6c-d7e8f9a0b1c2', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 1,
   'Introduction to Data Science',
   'Unit 1: An introduction to Data Science — its definition, importance, and interdisciplinary skills.',
   '', 14),

  ('b8c2d3e4-f5a6-4b02-9c7d-e8f9a0b1c2d3', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 2,
   'Facets of Data',
   'Unit 1: Explore different types of data — structured, unstructured, metadata.',
   '', 12),

  ('c9d3e4f5-a6b7-4c03-8d8e-f9a0b1c2d3e4', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 3,
   'The Data Science Process',
   'Unit 1: End-to-end data science workflow from problem definition to deployment.',
   '', 12),

  ('d0e4f5a6-b7c8-4d04-9e9f-a0b1c2d3e4f5', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 4,
   'Introduction to NumPy',
   'Unit 1: Getting started with NumPy — the fundamental library for numerical computing.',
   '', 6),

  ('e1f5a6b7-c8d9-4e05-8faf-b1c2d3e4f5a6', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 5,
   'Creating Arrays and their Attributes',
   'Unit 1: Learn to create NumPy arrays of any shape and explore key attributes.',
   '', 8),

  ('f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 6,
   'Array Attributes Demonstration',
   'Unit 1: Hands-on demonstration of NumPy array attributes and methods.',
   '', 10),

  ('a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 7,
   'Basic Array Operations',
   'Unit 1: Perform arithmetic, broadcasting, and element-wise operations on arrays.',
   '', 10),

  ('b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 8,
   'Joining, Splitting, Searching, and Sorting Arrays',
   'Unit 1: Combine, split, search, and sort NumPy arrays.',
   '', 10),

  ('c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 9,
   'Array Indexing, Slicing, and Iterating',
   'Unit 1: Access, slice, and iterate through array elements efficiently.',
   '', 10),

  ('d6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 10,
   'Copying Arrays, Shape Manipulation, and Identity Functions',
   'Unit 1: Deep copies, reshaping, and identity/eye functions.',
   '', 10),

  ('e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 11,
   'Exploring Data using Series and Data Frames',
   'Unit 1: Introduction to Pandas Series and DataFrames for data exploration.',
   '', 10),

  -- ── Unit 2 (10 Lectures) ──
  ('f8a2b3c4-d5e6-4f12-9a6b-c8d9e0f1a2b3', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 12,
   'Handling Large Volumes of Data',
   'Unit 2: Techniques and strategies for working with large datasets.',
   '', 10),

  ('a9b3c4d5-e6f7-4a13-8b7c-d9e0f1a2b3c4', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 13,
   'General Techniques for Handling Large Volumes of Data',
   'Unit 2: Sampling, chunking, and memory-efficient data processing.',
   '', 10),

  ('b0c4d5e6-f7a8-4b14-9c8d-e0f1a2b3c4d5', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 14,
   'General Tips for Handling Large Amounts of Data',
   'Unit 2: Practical tips for optimizing data pipelines.',
   '', 10),

  ('c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 15,
   'Data Wrangling',
   'Unit 2: Reshaping, transforming, and preparing messy data for analysis.',
   '', 10),

  ('d2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 16,
   'Combining and Merging Data Sets',
   'Unit 2: Joining, merging, and concatenating datasets in Pandas.',
   '', 10),

  ('e3f7a8b9-c0d1-4e17-8fba-b3c4d5e6f7a8', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 17,
   'Reshaping and Pivoting',
   'Unit 2: Pivot tables, melt, stack, and unstack operations.',
   '', 10),

  ('f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 18,
   'Handling Missing Values',
   'Unit 2: Detecting, filling, and dropping missing data.',
   '', 10),

  ('a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 19,
   'Data Cleaning and Preparation',
   'Unit 2: End-to-end data cleaning workflows.',
   '', 10),

  ('b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 20,
   'Data Transformation',
   'Unit 2: Applying functions, mapping, replacing, and binning data.',
   '', 10),

  ('c7d1e2f3-a4b5-4c21-8dfe-f7a8b9c0d1e2', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 21,
   'String Manipulations',
   'Unit 2: Vectorized string operations in Pandas.',
   '', 10);


-- ============================================================
-- CHALLENGES: Lecture 1 — Introduction to Data Science (4 MCQs)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('1a2b3c4d-e5f6-4a01-8b01-1c2d3e4f5a6b',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a7b1c2d3-e4f5-4a01-8b6c-d7e8f9a0b1c2',
 'mcq', 'What is Data Science?',
 'Which of the following best describes Data Science?',
 84,
 '["Storing structured data in databases","Gathering data, analyzing patterns, and making predictions","Writing code only for AI systems","Managing business transactions digitally"]',
 1, 1, 'easy',
 '["Data Science involves collecting data and using it to find meaningful patterns and make predictions."]'),

('2b3c4d5e-f6a7-4b02-9c02-2d3e4f5a6b7c',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a7b1c2d3-e4f5-4a01-8b6c-d7e8f9a0b1c2',
 'mcq', 'Primary Goal of Data Science',
 'What is the primary goal of Data Science?',
 235,
 '["Build mobile applications","Extract insights and knowledge from data","Design user interfaces","Manage server infrastructure"]',
 1, 1, 'easy',
 '["Data scientists focus on turning raw data into actionable knowledge and insights."]'),

('3c4d5e6f-a7b8-4c03-8d03-3e4f5a6b7c8d',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a7b1c2d3-e4f5-4a01-8b6c-d7e8f9a0b1c2',
 'mcq', 'Data Science Workflow',
 'Which of these is NOT a typical step in a Data Science workflow?',
 368,
 '["Data collection","Data cleaning","UI/UX design","Model building"]',
 2, 1, 'easy',
 '["Think about what data scientists do — they work with data, not user interfaces."]'),

('4d5e6f7a-b8c9-4d04-9e04-4f5a6b7c8d9e',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a7b1c2d3-e4f5-4a01-8b6c-d7e8f9a0b1c2',
 'mcq', 'Interdisciplinary Nature',
 'Data Science combines expertise from which fields?',
 718,
 '["Marketing and sales only","Statistics, programming, and domain knowledge","Graphic design and art","Finance and accounting only"]',
 1, 1, 'easy',
 '["Data Science sits at the intersection of mathematics, computer science, and subject-matter expertise."]');


-- ============================================================
-- CHALLENGES: Lecture 2 — Facets of Data (6 MCQs)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('5e6f7a8b-c9d0-4e05-8f05-5a6b7c8d9e0f',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b8c2d3e4-f5a6-4b02-9c7d-e8f9a0b1c2d3',
 'mcq', 'Types of Data',
 'What are the two main categories of data?',
 94,
 '["Big data and small data","Structured and unstructured data","Fast and slow data","Internal and external data"]',
 1, 1, 'easy',
 '["Data can be organized in tables (structured) or exist as free-form content (unstructured)."]'),

('6f7a8b9c-d0e1-4f06-9a06-6b7c8d9e0f1a',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b8c2d3e4-f5a6-4b02-9c7d-e8f9a0b1c2d3',
 'mcq', 'Where is Structured Data Stored?',
 'Structured data is typically stored in:',
 247,
 '["Text documents","Images","Relational databases","Audio files"]',
 2, 1, 'easy',
 '["Structured data has a defined schema with rows and columns — think spreadsheets and SQL tables."]'),

('7a8b9c0d-e1f2-4a07-8b07-7c8d9e0f1a2b',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b8c2d3e4-f5a6-4b02-9c7d-e8f9a0b1c2d3',
 'mcq', 'Unstructured Data Example',
 'Which of the following is an example of unstructured data?',
 301,
 '["A spreadsheet of sales figures","A relational database table","A collection of social media posts","A CSV file"]',
 2, 1, 'easy',
 '["Unstructured data has no predefined format — emails, tweets, and videos are common examples."]'),

('8b9c0d1e-f2a3-4b08-9c08-8d9e0f1a2b3c',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b8c2d3e4-f5a6-4b02-9c7d-e8f9a0b1c2d3',
 'mcq', 'What is Metadata?',
 'What is metadata?',
 380,
 '["Data about data","Very large datasets","Encrypted data","Missing values in a dataset"]',
 0, 1, 'easy',
 '["Meta means \"about\" — metadata describes other data (e.g., a photo''s creation date and GPS location)."]'),

('9c0d1e2f-a3b4-4c09-8d09-9e0f1a2b3c4d',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b8c2d3e4-f5a6-4b02-9c7d-e8f9a0b1c2d3',
 'mcq', 'Most Common Data Type',
 'Which data type is most prevalent in real-world datasets?',
 490,
 '["Fully structured data only","Only unstructured data","Mixed structured and unstructured data","Binary data only"]',
 2, 1, 'easy',
 '["Real-world data is messy — most organizations deal with a mix of both structured and unstructured data."]'),

('ad1e2f3a-b4c5-4d10-9e10-af1a2b3c4d5e',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b8c2d3e4-f5a6-4b02-9c7d-e8f9a0b1c2d3',
 'mcq', 'Importance of Data Quality',
 'Why is data quality critical in Data Science?',
 581,
 '["It speeds up internet connections","Poor quality data leads to inaccurate insights and decisions","It reduces storage costs","It improves UI performance"]',
 1, 1, 'easy',
 '["Remember: garbage in, garbage out — models are only as good as the data they train on."]');


-- ============================================================
-- CHALLENGES: Lecture 3 — The Data Science Process (6 MCQs)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('be2f3a4b-c5d6-4e11-8f11-ba2b3c4d5e6f',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c9d3e4f5-a6b7-4c03-8d8e-f9a0b1c2d3e4',
 'mcq', 'First Step in DS Process',
 'What is the first step in the Data Science process?',
 74,
 '["Model training","Data visualization","Problem definition and data collection","Deployment"]',
 2, 1, 'easy',
 '["You can''t solve a problem you haven''t defined — the process always starts with understanding the question."]'),

('cf3a4b5c-d6e7-4f12-9a12-cb3c4d5e6f7a',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c9d3e4f5-a6b7-4c03-8d8e-f9a0b1c2d3e4',
 'mcq', 'Data Cleaning',
 'Data cleaning involves:',
 212,
 '["Deleting all data","Handling missing values, duplicates, and errors","Encrypting sensitive information","Compressing data files"]',
 1, 1, 'easy',
 '["Raw data is rarely perfect — cleaning means fixing or removing incorrect, corrupted, or duplicate records."]'),

('da4b5c6d-e7f8-4a13-8b13-dc4d5e6f7a8b',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c9d3e4f5-a6b7-4c03-8d8e-f9a0b1c2d3e4',
 'mcq', 'Exploratory Data Analysis',
 'Exploratory Data Analysis (EDA) is used to:',
 311,
 '["Deploy machine learning models","Understand data patterns and distributions","Write database queries","Create web applications"]',
 1, 1, 'easy',
 '["EDA is the detective phase — you visualize and summarize data to understand what stories it tells."]'),

('eb5c6d7e-f8a9-4b14-9c14-ed5e6f7a8b9c',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c9d3e4f5-a6b7-4c03-8d8e-f9a0b1c2d3e4',
 'mcq', 'Feature Engineering',
 'Feature engineering refers to:',
 381,
 '["Building software UI features","Creating or transforming variables to improve model performance","Hardware design","Network configuration"]',
 1, 1, 'easy',
 '["Features are the input variables for your model — engineering them means making raw data more useful for learning."]'),

('fc6d7e8f-a9b0-4c15-8d15-fe6f7a8b9c0d',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c9d3e4f5-a6b7-4c03-8d8e-f9a0b1c2d3e4',
 'mcq', 'Model Evaluation Metrics',
 'Common model evaluation metrics include:',
 535,
 '["CPU speed and RAM usage","Accuracy, precision, recall, and F1-score","Color schemes and fonts","Server response times"]',
 1, 1, 'easy',
 '["These metrics measure how well the model''s predictions match the actual outcomes in the test set."]'),

('ad7e8f9a-b0c1-4d16-9e16-af7a8b9c0d1e',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c9d3e4f5-a6b7-4c03-8d8e-f9a0b1c2d3e4',
 'mcq', 'After Deployment',
 'After deploying a Data Science model, what comes next?',
 575,
 '["Deleting the training data","Monitoring and maintaining the model in production","Rebuilding the entire UI","Restarting the database server"]',
 1, 1, 'easy',
 '["A deployed model needs ongoing care — performance can degrade as the real world changes (data drift)."]');


-- ============================================================
-- CHALLENGES: Lecture 4 — Introduction to NumPy (5 MCQs)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('be8f9a0b-c1d2-4e17-8f17-ba8b9c0d1e2f',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd0e4f5a6-b7c8-4d04-9e9f-a0b1c2d3e4f5',
 'mcq', 'NumPy Name Meaning',
 'What does "NumPy" stand for?',
 57,
 '["Numerical Python","New Universal Python","Numeric Utility Package","Number Processing Yield"]',
 0, 1, 'easy',
 '["NumPy was built specifically for numerical operations — think: numbers + Python."]'),

('cf9a0b1c-d2e3-4f18-9a18-cb9c0d1e2f3a',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd0e4f5a6-b7c8-4d04-9e9f-a0b1c2d3e4f5',
 'mcq', 'NumPy Primary Data Structure',
 'What is the primary data structure in NumPy?',
 164,
 '["Python list","Python dictionary","ndarray (N-dimensional array)","Python tuple"]',
 2, 1, 'easy',
 '["NumPy''s power comes from its array object — it can represent data of any number of dimensions."]'),

('da0b1c2d-e3f4-4a19-8b19-dc0d1e2f3a4b',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd0e4f5a6-b7c8-4d04-9e9f-a0b1c2d3e4f5',
 'mcq', 'NumPy vs Python Lists',
 'What is the key advantage of NumPy arrays over Python lists?',
 209,
 '["They can store mixed data types","They are significantly faster for numerical computations","They have more string methods","They use more memory"]',
 1, 1, 'easy',
 '["NumPy arrays store data in contiguous memory and use C-level operations — much faster than Python loops."]'),

('eb1c2d3e-f4a5-4b20-9c20-ed1e2f3a4b5c',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd0e4f5a6-b7c8-4d04-9e9f-a0b1c2d3e4f5',
 'mcq', 'Importing NumPy',
 'What is the conventional way to import NumPy in Python?',
 235,
 '["import numpy","import numpy as np","from numpy import all","import Numpy as NP"]',
 1, 1, 'easy',
 '["The alias np is used by the entire Python data science community for consistency."]'),

('fc2d3e4f-a5b6-4c21-8d21-fe2f3a4b5c6d',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd0e4f5a6-b7c8-4d04-9e9f-a0b1c2d3e4f5',
 'mcq', 'NumPy Use Cases',
 'NumPy is primarily used for:',
 254,
 '["Web development","Scientific computing and numerical operations","Database management","Front-end styling"]',
 1, 1, 'easy',
 '["NumPy underpins almost all scientific Python libraries — pandas, scikit-learn, and TensorFlow all rely on it."]');


-- ============================================================
-- CHALLENGES: Lecture 5 — Creating Arrays (3 MCQs + 1 Coding)
-- ============================================================
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
('ad3e4f5a-b6c7-4d22-9e22-af3a4b5c6d7e',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e1f5a6b7-c8d9-4e05-8faf-b1c2d3e4f5a6',
 'mcq', 'Creating an Array of Zeros',
 'Which NumPy function creates an array filled with zeros?',
 52,
 '["np.zeros()","np.empty()","np.ones()","np.array(0)"]',
 0, 1, 'easy',
 '["NumPy has dedicated factory functions for common patterns — np.zeros, np.ones, np.full."]'),

('be4f5a6b-c7d8-4e23-8f23-ba4b5c6d7e8f',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e1f5a6b7-c8d9-4e05-8faf-b1c2d3e4f5a6',
 'mcq', 'Array Shape Attribute',
 'The shape attribute of a NumPy array returns:',
 294,
 '["The total number of elements","A tuple representing the size of each dimension","The data type of elements","The memory address of the array"]',
 1, 1, 'easy',
 '["Shape tells you the size along each axis — (2, 5) means 2 rows and 5 columns."]'),

('cf5a6b7c-d8e9-4f24-9a24-cb5c6d7e8f9a',
 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e1f5a6b7-c8d9-4e05-8faf-b1c2d3e4f5a6',
 'mcq', 'np.arange Result',
 'What does np.arange(10, 20) create?',
 410,
 '["An array from 0 to 20","An array from 10 to 19","An array from 10 to 20 inclusive","An array of 10 zeros"]',
 1, 1, 'easy',
 '["arange works like Python range — the stop value is exclusive, so (10, 20) gives [10, 11, ..., 19]."]');

-- Coding challenge for Lecture 5
INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES (
  'da6b7c8d-e9f0-4a25-8b25-dc6d7e8f9a0b',
  'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c',
  'e1f5a6b7-c8d9-4e05-8faf-b1c2d3e4f5a6',
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
);
