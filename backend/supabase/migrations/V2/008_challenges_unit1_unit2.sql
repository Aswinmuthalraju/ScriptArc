-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 008: Added Challenges for Unit 1 & 2 Data Science
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- Lecture 6
-- Lesson ID: f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('aca63827-1c56-4915-a0e0-a05cd7016912', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7',
 'mcq', 'Knowledge Check', 'Which NumPy attribute is used to find the number of dimensions of an array?', 3,
 '["size", "shape", "ndim", "dtype"]', 2, 2, 'easy', '["ndim returns the number of dimensions of a NumPy array."]'),
  ('0f4157ba-a0fa-4f25-b110-d69274ceefbf', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7',
 'mcq', 'Knowledge Check', 'Which attribute returns the total number of elements in a NumPy array?', 40,
 '["shape", "size", "dtype", "ndim"]', 1, 2, 'easy', '["size gives the total number of elements present in the array."]'),
  ('782c884a-1ca7-42e5-8baf-94d67bfad75b', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7',
 'mcq', 'Knowledge Check', 'What does the shape attribute return in a NumPy array?', 60,
 '["Total elements", "Number of dimensions", "Structure of rows and columns", "Data type of elements"]', 2, 2, 'easy', '["shape returns the dimensions of the array (rows, columns, etc.)."]'),
  ('950ea183-897f-439c-af69-26a0a5ef024a', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7',
 'mcq', 'Knowledge Check', 'What is the default integer data type returned by NumPy when dtype is not specified?', 75,
 '["int32", "int16", "int64", "float64"]', 2, 2, 'easy', '["If dtype is not specified, NumPy usually uses int64 by default."]'),
  ('4fee3689-05c3-414f-a35f-ae58dfc5d925', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7',
 'mcq', 'Knowledge Check', 'What does the itemsize attribute represent in a NumPy array?', 96,
 '["Total memory of the array", "Size of each element in bytes", "Number of elements in array", "Number of rows"]', 1, 2, 'easy', '["itemsize returns the memory size of each element in bytes."]'),
  ('98721e40-80a5-43af-9150-986603ffb159', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7',
 'mcq', 'Knowledge Check', 'If an array uses int64, what will be the size of each element?', 96,
 '["2 bytes", "4 bytes", "8 bytes", "16 bytes"]', 2, 2, 'easy', '["int64 -> 64 bits = 8 bytes"]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('5b5355d3-680f-4df4-8f03-594d7a74a75f', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f2a6b7c8-d9e0-4f06-9a0b-c2d3e4f5a6b7',
 'coding', 'Hands-on Exercise', 'Complete the code to find dimension, size, and shape of a NumPy array.', 120,
 E'import numpy as np

arr = np.array([10,20,30])

print("Dimension:", arr._____)
print("Total Elements:", arr._____)
print("Shape:", arr._____)', 71, 4, 'medium', '[]',
 E'import numpy as np

arr = np.array([10,20,30])

print("Dimension:", arr.ndim)
print("Total Elements:", arr.size)
print("Shape:", arr.shape)');

-- ────────────────────────────────────────────────────────────
-- Lecture 7
-- Lesson ID: a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('6af0f2b3-2853-4318-9483-fb5a5020a4c5', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8',
 'mcq', 'Knowledge Check', 'Which NumPy function is used to join two arrays along a specified axis?', 56,
 '["np.join()", "np.concatenate()", "np.append()", "np.combine()"]', 1, 2, 'easy', '["np.concatenate() joins arrays along a specified axis."]'),
  ('373c728d-731d-49ac-b58c-93b630dc4e21', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8',
 'mcq', 'Knowledge Check', 'What happens when axis = 0 is used in np.concatenate()?', 104,
 '["Horizontal stacking", "Vertical stacking", "Diagonal stacking", "Array splitting"]', 1, 2, 'easy', '["axis = 0 joins arrays vertically (row-wise)."]'),
  ('a6bfcd0a-ee2e-40d6-9158-736de4e2f081', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8',
 'mcq', 'Knowledge Check', 'Which NumPy function is specifically used for horizontal stacking of arrays?', 149,
 '["np.vstack()", "np.concatenate()", "np.hstack()", "np.split()"]', 2, 2, 'easy', '["np.hstack() joins arrays horizontally (column-wise)."]'),
  ('49de85de-3e36-48fa-a348-ba7993973a84', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8',
 'mcq', 'Knowledge Check', 'What is the limitation of the np.split() function?', 227,
 '["It works only on 2D arrays", "It can split arrays only into equal parts", "It cannot split arrays", "It only works on strings"]', 1, 2, 'easy', '["np.split() can divide arrays only into equal-sized subarrays."]'),
  ('d881ab78-310a-40d6-8e21-df78517395ca', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8',
 'mcq', 'Knowledge Check', 'Which NumPy function allows splitting arrays even if they cannot be divided equally?', 314,
 '["np.divide()", "np.array_split()", "np.break()", "np.cut()"]', 1, 2, 'easy', '["np.array_split() can divide arrays even when equal division is not possible."]'),
  ('4ec777fe-db95-4ba9-b5db-a575a445114a', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8',
 'mcq', 'Knowledge Check', 'Which function is used to find the index of elements satisfying a condition in NumPy?', 490,
 '["np.search()", "np.where()", "np.find()", "np.locate()"]', 1, 2, 'easy', '["np.where() returns the indices of elements that satisfy a condition."]'),
  ('c775880f-2cc9-4e13-9577-766e80024ac9', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8',
 'mcq', 'Knowledge Check', 'What does np.sort() do by default?', 613,
 '["Sorts columns", "Sorts rows", "Sorts diagonally", "Randomizes the array"]', 1, 2, 'easy', '["By default, np.sort() sorts along the last axis (row-wise for 2D arrays)."]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('c374257b-86cb-4a6d-aafe-4c75ff7731ca', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a3b7c8d9-e0f1-4a07-8b1c-d3e4f5a6b7c8',
 'coding', 'Hands-on Exercise', 'Complete the code to join two arrays horizontally using NumPy.', 120,
 E'import numpy as np

arr1 = np.array([[1,2,3]])
arr2 = np.array([[4,5,6]])

result = np._____(arr1, arr2)

print(result)', 71, 4, 'medium', '[]',
 E'import numpy as np

arr1 = np.array([[1,2,3]])
arr2 = np.array([[4,5,6]])

result = np.hstack((arr1, arr2))

print(result)');

-- ────────────────────────────────────────────────────────────
-- Lecture 8
-- Lesson ID: b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('07a03616-6c1e-482f-8e55-5f56a27b14dc', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9',
 'mcq', 'Knowledge Check', 'What is array indexing in NumPy used for?', 44,
 '["Sorting array elements", "Accessing elements using their position", "Deleting elements from arrays", "Creating arrays"]', 1, 2, 'easy', '["Indexing allows us to access elements in an array using their position."]'),
  ('80a661d8-d61d-4dff-a388-90bcd2ef2d2a', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9',
 'mcq', 'Knowledge Check', 'At what index does NumPy array indexing start?', 75,
 '["-1", "1", "0", "2"]', 2, 2, 'easy', '["Array indexing in Python starts from 0."]'),
  ('560b3637-55d4-4c3d-8ae0-d9f9353a6081', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9',
 'mcq', 'Knowledge Check', 'What does the negative index -1 represent in an array?', 164,
 '["First element", "Last element", "Middle element", "Second element"]', 1, 2, 'easy', '["Negative indexing counts from the end of the array, so -1 refers to the last element."]'),
  ('a904a6ec-c078-4042-b60e-f7a150a539fa', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9',
 'mcq', 'Knowledge Check', 'In a 2D NumPy array, what does array[1, :] represent?', 239,
 '["First column", "Second row", "Second column", "Entire array"]', 1, 2, 'easy', '["array[1, :] selects row index 1 (second row) and all columns."]'),
  ('7253f8a7-7633-44f8-a7cd-b62df2e5eea4', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9',
 'mcq', 'Knowledge Check', 'In array slicing syntax array[start:stop:step], what does the stop index represent?', 381,
 '["Inclusive value", "Exclusive value", "Always zero", "Optional only for strings"]', 1, 2, 'easy', '["The stop index is exclusive, meaning that element is not included."]'),
  ('533c6775-d90a-401a-8bbe-aafcc8343ae7', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9',
 'mcq', 'Knowledge Check', 'What does the slicing expression array[3:] return?', 530,
 '["Elements from index 0 to 3", "Elements from index 3 to the end", "Only element at index 3", "Reverse array"]', 1, 2, 'easy', '["array[3:] returns all elements starting from index 3 to the end."]'),
  ('6f6c1f55-13d8-435d-bd61-1f949a46f1b9', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9',
 'mcq', 'Knowledge Check', 'Which loop is commonly used to iterate through elements of a NumPy array?', 712,
 '["while loop", "for loop", "do-while loop", "switch loop"]', 1, 2, 'easy', '["A for loop is typically used to iterate through array elements."]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('dec48654-6b6d-494e-8aaf-494c4b05ecd2', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b4c8d9e0-f1a2-4b08-9c2d-e4f5a6b7c8d9',
 'coding', 'Hands-on Exercise', 'Complete the code to print elements from index 2 to index 5 using slicing.', 120,
 E'import numpy as np

arr = np.array([1,3,5,7,9,11])

result = arr[_____:_____]

print(result)', 71, 4, 'medium', '[]',
 E'import numpy as np

arr = np.array([1,3,5,7,9,11])

result = arr[2:6]

print(result)');

-- ────────────────────────────────────────────────────────────
-- Lecture 9
-- Lesson ID: c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('43a758a0-7649-4903-9860-537968199458', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'mcq', 'Knowledge Check', 'In NumPy arrays, indexing starts from which value?', 61,
 '["1", "-1", "0", "Depends on array size"]', 2, 2, 'easy', '["NumPy arrays follow zero-based indexing, meaning the first element has index 0."]'),
  ('59f52ace-daae-45a7-8263-97267e01ae31', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'mcq', 'Knowledge Check', 'Which of the following represents negative indexing in Python arrays?', 82,
 '["0,1,2,3", "1,2,3,4", "-1,-2,-3,-4", "A,B,C,D"]', 2, 2, 'easy', '["Negative indexing accesses elements from the end of the array, where -1 refers to the last element."]'),
  ('230c321e-8530-4c8f-bd1a-7d426f11ad77', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'mcq', 'Knowledge Check', 'Given the array:
arr = [1,3,5,7,9]
What will be the output of:
arr[[0,2,4]]', 131,
 '["1,3,5", "1,5,9", "3,7,9", "5,7,9"]', 1, 2, 'easy', '["Index 0,2,4 correspond to values 1,5,9."]'),
  ('c9ad16c3-9015-43b5-b9ea-5ab3963a128b', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'mcq', 'Knowledge Check', 'In the command:
array[1, :]
What does : represent?', 197,
 '["Select all rows", "Select all columns", "Skip values", "Reverse array"]', 1, 2, 'easy', '[": selects all columns of the specified row."]'),
  ('9305a6ff-ba28-40a3-896c-26d058ac0ce3', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'mcq', 'Knowledge Check', 'In 3D array indexing, the first index represents:', 278,
 '["Column", "Slice", "Row", "Dimension size"]', 1, 2, 'easy', '["For 3D arrays: array[slice, row, column]"]'),
  ('f534dda4-7723-4e28-947e-d2fc6be49499', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'mcq', 'Knowledge Check', 'What does array slicing allow you to do?', 387,
 '["Delete array elements", "Access part of an array", "Reverse arrays", "Merge arrays"]', 1, 2, 'easy', '["Slicing extracts a subset of elements from an array."]'),
  ('cad062c3-3b82-47c4-bce4-eba4bc85c28d', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'mcq', 'Knowledge Check', 'In Python slicing syntax:
array[start : stop : step]
What does stop represent?', 425,
 '["Included index", "Exclusive index", "Last element always", "Step size"]', 1, 2, 'easy', '["The stop index is exclusive, meaning that element is not included."]'),
  ('8acb2a54-627e-48fc-9d65-9ca06e1574f9', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'mcq', 'Knowledge Check', 'Which loop is commonly used to iterate through array elements?', 712,
 '["while loop", "for loop", "do-while loop", "switch loop"]', 1, 2, 'easy', '["for x in array: is the standard method to iterate through NumPy arrays."]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('dce61af6-6de3-4b29-a230-5d596ba9e2f4', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c5d9e0f1-a2b3-4c09-8d3e-f5a6b7c8d9e0',
 'coding', 'Hands-on Exercise', 'Complete the code to print the element at index 2 of a NumPy array.', 120,
 E'import numpy as np

arr = np.array([10,20,30,40,50])

print(arr[_____])', 71, 4, 'medium', '[]',
 E'import numpy as np

arr = np.array([10,20,30,40,50])

print(arr[2])');

-- ────────────────────────────────────────────────────────────
-- Lecture 10
-- Lesson ID: d6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('a7e54aa3-0b5c-443e-9150-e4775d16425c', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1',
 'mcq', 'Knowledge Check', 'What does the array.copy() method do in NumPy?', 54,
 '["Deletes the original array", "Creates a reference to the same array", "Creates a new independent copy of the array", "Sorts the array"]', 2, 2, 'easy', '["copy() creates a new array independent of the original, so changes in the copy do not affect the original array."]'),
  ('2e88f07b-fc4c-44bb-a399-7bda112741d1', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1',
 'mcq', 'Knowledge Check', 'Which NumPy function is used to change the shape of an array without changing its data?', 127,
 '["reshape()", "resize()", "split()", "concatenate()"]', 0, 2, 'easy', '["reshape() changes the dimensions of the array while keeping the same data."]'),
  ('10218c83-8fe5-49c0-aa1e-5f4099d1414b', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1',
 'mcq', 'Knowledge Check', 'What does reshape(-1) do in NumPy?', 173,
 '["Deletes the array", "Flattens the array into one dimension", "Converts array into matrix", "Splits the array"]', 1, 2, 'easy', '["reshape(-1) converts a multi-dimensional array into a 1D array."]'),
  ('2c517df2-8069-4ac4-915b-d6e1579761cd', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1',
 'mcq', 'Knowledge Check', 'Which function creates an identity matrix in NumPy?', 210,
 '["np.matrix()", "np.identity()", "np.diagonal()", "np.ones()"]', 1, 2, 'easy', '["np.identity() creates a square matrix with 1s on the diagonal and 0s elsewhere."]'),
  ('86982683-c254-41f6-9206-7987c5bb39e5', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1',
 'mcq', 'Knowledge Check', 'What is the default data type of values created using np.identity()?', 285,
 '["Integer", "Float", "Boolean", "String"]', 1, 2, 'easy', '["If dtype is not specified, NumPy uses float values by default."]'),
  ('d69a5055-84d0-4d0f-90e2-f2f743a3a659', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1',
 'mcq', 'Knowledge Check', 'What is the purpose of the k parameter in the np.eye() function?', 325,
 '["Controls array size", "Sets the diagonal offset", "Defines array datatype", "Sorts diagonal values"]', 1, 2, 'easy', '["k shifts the diagonal position above or below the main diagonal."]'),
  ('47f003fa-9404-443f-891e-4970c99890ad', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1',
 'mcq', 'Knowledge Check', 'What is the key difference between np.identity() and np.eye()?', 452,
 '["np.eye() only creates square matrices", "np.identity() supports rectangular matrices", "np.eye() can create rectangular matrices and diagonal offsets", "Both are identical"]', 2, 2, 'easy', '["np.eye() is more flexible, allowing rectangular matrices and diagonal offsets."]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('7de0a8a4-e1a1-42eb-9b29-919d32f9aeef', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd6e0f1a2-b3c4-4d10-9e4f-a6b7c8d9e0f1',
 'coding', 'Hands-on Exercise', 'Complete the code to reshape a 1D array into a 3x4 matrix.', 120,
 E'import numpy as np

arr = np.array(range(1,13))

new_arr = arr._____(_____,_____)

print(new_arr)', 71, 4, 'medium', '[]',
 E'import numpy as np

arr = np.array(range(1,13))

new_arr = arr.reshape(3,4)

print(new_arr)');

-- ────────────────────────────────────────────────────────────
-- Lecture 11
-- Lesson ID: e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('e97abb37-4644-4c5b-8f09-34b997226925', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'mcq', 'Knowledge Check', 'What is a Pandas Series?', 46,
 '["A two-dimensional table", "A one-dimensional labeled array", "A matrix with rows and columns", "A NumPy sorting function"]', 1, 2, 'easy', '["A Pandas Series is a 1-dimensional labeled array capable of holding different data types."]'),
  ('053a0288-3bbd-472a-b9a7-29747c0c968b', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'mcq', 'Knowledge Check', 'Which of the following operations can be performed on both Series and DataFrames?', 83,
 '["Vectorized operations", "Indexing", "Aggregation functions", "All of the above"]', 3, 2, 'easy', '["Both Series and DataFrames support indexing, vectorized operations, aggregation, and missing value handling."]'),
  ('024dee2d-6585-41f6-b0a3-6e04a6b5d575', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'mcq', 'Knowledge Check', 'Which command is used to create a Series from a list in Pandas?', 122,
 '["pd.array()", "pd.Series()", "pd.DataFrame()", "pd.list()"]', 1, 2, 'easy', '["pd.Series() creates a Series from lists, dictionaries, or arrays."]'),
  ('7cdd71d8-ebb0-4a09-b755-7e3c8bd67a1d', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'mcq', 'Knowledge Check', 'What must be true for vectorized operations between two Series?', 246,
 '["Same data values", "Same array size", "Same datatype", "Same column name"]', 1, 2, 'easy', '["Vectorized operations require Series of the same size for element-wise calculations."]'),
  ('111a4b06-783e-4984-b472-57970dcb7879', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'mcq', 'Knowledge Check', 'Which Pandas function is used to check missing values in a Series?', 372,
 '["checknull()", "isna()", "findnull()", "missing()"]', 1, 2, 'easy', '["isna() returns True for missing values and False otherwise."]'),
  ('ab03f8d7-4934-4337-becc-a48ebb83167c', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'mcq', 'Knowledge Check', 'Which function is used to replace missing values in a Series?', 498,
 '["replace()", "fillna()", "update()", "addna()"]', 1, 2, 'easy', '["fillna() replaces missing values with specified values."]'),
  ('9e2ebf14-4bc7-4750-9b80-d52c99e18c1e', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'mcq', 'Knowledge Check', 'What does df.loc[] represent in a DataFrame?', 702,
 '["Position-based indexing", "Label-based indexing", "Sorting function", "Aggregation method"]', 1, 2, 'easy', '["loc[] accesses rows and columns using labels."]'),
  ('62054626-a58e-4d91-8783-c86389606e86', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'mcq', 'Knowledge Check', 'Which DataFrame function is used for position-based indexing?', 747,
 '["df.loc[]", "df.iloc[]", "df.index()", "df.access()"]', 1, 2, 'easy', '["iloc[] is used for integer-position based indexing."]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('ac94ee4e-bdb4-4e48-a0a0-61780c63793f', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e7f1a2b3-c4d5-4e11-8f5a-b7c8d9e0f1a2',
 'coding', 'Hands-on Exercise', 'Complete the code to create a Pandas Series and print the first element.', 120,
 E'import pandas as pd

data = [10,20,30,40]

s = pd._____(data)

print(s[_____])', 71, 4, 'medium', '[]',
 E'import pandas as pd

data = [10,20,30,40]

s = pd.Series(data)

print(s[0])');

-- ────────────────────────────────────────────────────────────
-- Unit 2.1
-- Lesson ID: f8a2b3c4-d5e6-4f12-9a6b-c8d9e0f1a2b3
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('54217aad-5aa9-4eee-84bc-7c786909370f', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f8a2b3c4-d5e6-4f12-9a6b-c8d9e0f1a2b3',
 'mcq', 'Knowledge Check', 'What is the primary challenge when dealing with large volumes of data in data science?', 57,
 '["Lack of programming languages", "Difficulty in visualizing data", "Limited memory and computational resources", "Lack of internet connectivity"]', 2, 2, 'easy', '["Handling large datasets often leads to memory overload, CPU limitations, and slower processing speeds."]'),
  ('2d8b5e1b-f57c-4d03-b68b-301c272f5dac', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f8a2b3c4-d5e6-4f12-9a6b-c8d9e0f1a2b3',
 'mcq', 'Knowledge Check', 'What happens when the computer tries to load more data into RAM than its capacity?', 144,
 '["The computer deletes the data", "The operating system swaps data from RAM to disk", "The CPU stops functioning", "The algorithm automatically compresses the data"]', 1, 2, 'easy', '["When RAM is insufficient, the operating system performs memory swapping, moving data from RAM to disk, which reduces performance."]'),
  ('799311cd-066d-477e-bea8-d9a55680bf78', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f8a2b3c4-d5e6-4f12-9a6b-c8d9e0f1a2b3',
 'mcq', 'Knowledge Check', 'In a bottleneck situation, what typically happens in a computing system?', 229,
 '["All components work equally fast", "Some components remain idle while one component slows the process", "The algorithm stops immediately", "The RAM increases automatically"]', 1, 2, 'easy', '["A bottleneck occurs when one component (CPU, RAM, Disk, or Network) slows down the system while other components wait idle."]'),
  ('0c56125c-e92a-4650-bd74-190b274b6ccf', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f8a2b3c4-d5e6-4f12-9a6b-c8d9e0f1a2b3',
 'mcq', 'Knowledge Check', 'Why is reading data directly from a hard drive slower compared to RAM?', 304,
 '["Hard drives store less data", "Hard drives have slower data access speeds than RAM", "RAM is used only for graphics", "Hard drives cannot store large files"]', 1, 2, 'easy', '["Hard drives have significantly slower access times compared to RAM, making data processing slower when reading directly from disk."]');

-- ────────────────────────────────────────────────────────────
-- Unit 2.2
-- Lesson ID: a9b3c4d5-e6f7-4a13-8b7c-d9e0f1a2b3c4
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('24ef193b-c4c0-4372-96c9-2d28d55ee7d0', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a9b3c4d5-e6f7-4a13-8b7c-d9e0f1a2b3c4',
 'mcq', 'Knowledge Check', 'Which of the following is NOT mentioned as a general technique for handling large volumes of data?', 55,
 '["Choosing the right algorithm", "Choosing the right data structure", "Choosing the right tool", "Increasing internet bandwidth"]', 3, 2, 'easy', '["The lecture states three solutions: using the right algorithm, right data structure, and right tool."]'),
  ('3899d4e1-fdfc-41a9-93f3-a505f836b672', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a9b3c4d5-e6f7-4a13-8b7c-d9e0f1a2b3c4',
 'mcq', 'Knowledge Check', 'In online learning algorithms, what does “mini-batch learning” mean?', 144,
 '["Feeding the entire dataset at once", "Feeding the algorithm with small portions of data based on hardware capacity", "Feeding the algorithm with one observation per year", "Storing all data permanently in memory"]', 1, 2, 'easy', '["Mini-batch learning processes small chunks of data, making it suitable for systems with limited memory."]'),
  ('dd1854f2-d59e-4c63-a001-b838e557f743', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a9b3c4d5-e6f7-4a13-8b7c-d9e0f1a2b3c4',
 'mcq', 'Knowledge Check', 'In the MapReduce model, which phase groups similar keys together before aggregation?', 232,
 '["Map phase", "Shuffle and sort phase", "Reduce phase", "Storage phase"]', 1, 2, 'easy', '["The shuffle and sort phase groups data with the same keys before the final aggregation step in the reduce phase."]'),
  ('28d7d81f-0cce-4385-8cc9-675d9a25ca2e', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a9b3c4d5-e6f7-4a13-8b7c-d9e0f1a2b3c4',
 'mcq', 'Knowledge Check', 'Which data structure allows fast data retrieval using key–value pairs?', 318,
 '["Tree", "Hash function (hash table)", "Sparse matrix", "Linked list"]', 1, 2, 'easy', '["A hash table stores data using key\u2013value pairs and allows fast lookup using hash functions."]'),
  ('d5b1e1fb-95fe-42ea-87ff-56e7ce7e12ef', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a9b3c4d5-e6f7-4a13-8b7c-d9e0f1a2b3c4',
 'mcq', 'Knowledge Check', 'What is a sparse matrix?', 398,
 '["A matrix with equal numbers of zeros and ones", "A matrix with mostly zero values and few non-zero elements", "A matrix containing only floating point values", "A matrix used only in machine learning"]', 1, 2, 'easy', '["A sparse matrix contains many zeros and very few meaningful values, allowing memory-efficient storage."]'),
  ('d52d9b50-531f-4c4c-a06e-9f016cb3604b', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a9b3c4d5-e6f7-4a13-8b7c-d9e0f1a2b3c4',
 'mcq', 'Knowledge Check', 'What is the role of Numba in Python?', 517,
 '["It compresses large datasets", "It converts Python code to machine code during runtime (Just-In-Time compilation)", "It visualizes data using graphs", "It stores data in a database"]', 1, 2, 'easy', '["Numba is a Just-In-Time (JIT) compiler that converts Python code into machine code at runtime to improve performance."]');

-- ────────────────────────────────────────────────────────────
-- Unit 2.3
-- Lesson ID: b0c4d5e6-f7a8-4b14-9c8d-e0f1a2b3c4d5
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('06350cc2-9f1c-493c-a4ef-fba08ace60f4', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b0c4d5e6-f7a8-4b14-9c8d-e0f1a2b3c4d5',
 'mcq', 'Knowledge Check', 'What does the phrase “Don’t reinvent the wheel” mean in data science?', 59,
 '["Build all tools from scratch", "Use existing tools and libraries developed by others", "Avoid using programming languages", "Only use manual calculations"]', 1, 2, 'easy', '["Instead of building everything from scratch, data scientists should use existing optimized libraries and tools."]'),
  ('c7d429da-1589-4019-9671-a7b8f6a88393', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b0c4d5e6-f7a8-4b14-9c8d-e0f1a2b3c4d5',
 'mcq', 'Knowledge Check', 'How can hardware be used efficiently when handling large datasets?', 103,
 '["Run tasks sequentially and wait for each step to finish", "Run different processes in parallel whenever possible", "Always store data on disk before processing", "Turn off the CPU during execution"]', 1, 2, 'easy', '["Running processes in parallel ensures that components like CPU, sensors, and processing units do not remain idle."]'),
  ('323df7bb-5963-4ecb-9e3e-ee4c525b4e0c', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b0c4d5e6-f7a8-4b14-9c8d-e0f1a2b3c4d5',
 'mcq', 'Knowledge Check', 'Why is reducing computing needs important when working with large data?', 146,
 '["It increases memory consumption", "It reduces system performance", "It allows large datasets to be processed efficiently using fewer resources", "It eliminates the need for algorithms"]', 2, 2, 'easy', '["Reducing computing needs helps optimize memory usage and processing power, making large data processing more efficient."]');

-- ────────────────────────────────────────────────────────────
-- Unit 2.4
-- Lesson ID: c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('626eba74-4665-4f8c-acc3-a4a8723df569', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6',
 'mcq', 'Knowledge Check', 'What is Data Wrangling?', 55,
 '["Storing raw data without modification", "Transforming raw data into a usable format for analysis", "Deleting unnecessary data permanently", "Visualizing data using graphs"]', 1, 2, 'easy', '["Data wrangling is the process of transforming and mapping raw data into a usable format for analytics."]'),
  ('81f99042-d848-41ba-b8d4-6ec878d13de2', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6',
 'mcq', 'Knowledge Check', 'Which of the following is a real-world application of data wrangling mentioned in the lecture?', 143,
 '["Video editing", "Fraud detection and customer behavior analysis", "Game development", "Hardware manufacturing"]', 1, 2, 'easy', '["Data wrangling helps analyze patterns such as fraud detection and customer purchasing behavior."]'),
  ('77e99187-0cd7-4b01-92bb-15bc574fc32b', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6',
 'mcq', 'Knowledge Check', 'What is the main objective of the Data Discovery step in data wrangling?', 260,
 '["Remove duplicate data", "Understand the structure and content of the dataset", "Publish the dataset", "Normalize the dataset"]', 1, 2, 'easy', '["Data discovery helps understand the nature, format, and structure of the dataset and identify potential issues like missing values or outliers."]'),
  ('492f816a-75eb-4ccd-9d17-b57a7709109a', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6',
 'mcq', 'Knowledge Check', 'What happens during the Data Organization stage?', 336,
 '["Data is deleted", "Data is visualized using charts", "Data is restructured into a suitable format for analysis", "Data is encrypted"]', 2, 2, 'easy', '["Data organization reshapes and structures the data into formats suitable for analysis (often tabular form)."]'),
  ('09679a8c-cd8f-47bf-8f63-f8aa99018485', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6',
 'mcq', 'Knowledge Check', 'Which operation is commonly used in the Data Cleaning step?', 413,
 '["Creating dashboards", "Removing duplicates and handling missing values", "Writing SQL queries", "Publishing reports"]', 1, 2, 'easy', '["Data cleaning removes outliers, duplicates, and missing values to ensure accuracy."]'),
  ('0e193214-e4b3-4a1b-9350-45144646d733', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6',
 'mcq', 'Knowledge Check', 'What is the purpose of Data Enrichment?', 495,
 '["Delete old data", "Add additional information to improve data quality and completeness", "Encrypt the dataset", "Reduce dataset size"]', 1, 2, 'easy', '["Data enrichment improves datasets by adding useful information or features."]'),
  ('3acbfa3d-80e3-4996-97da-a94f426ea3df', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6',
 'mcq', 'Knowledge Check', 'What is checked during the Data Validation stage?', 533,
 '["Internet speed", "Data accuracy and consistency", "Hardware performance", "Programming syntax"]', 1, 2, 'easy', '["Data validation ensures the data is accurate, complete, and follows predefined rules."]'),
  ('264790ea-7120-4189-9694-3d9944dbc65e', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c1d5e6f7-a8b9-4c15-8d9e-f1a2b3c4d5e6',
 'mcq', 'Knowledge Check', 'What is the final stage of the Data Wrangling process?', 613,
 '["Data Cleaning", "Data Discovery", "Data Publishing", "Data Transformation"]', 2, 2, 'easy', '["After processing and validation, the data is published or stored in formats like CSV, Excel, SQL, or dashboards."]');

-- ────────────────────────────────────────────────────────────
-- Unit 2.5(a)
-- Lesson ID: d2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('87f119f2-c8c1-4eaa-9abf-e21ee655b37e', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7',
 'mcq', 'Knowledge Check', 'Which of the following is the correct order of operations mentioned in the data wrangling process?', 58,
 '["Merge -> Transform -> Clean -> Reshape", "Clean -> Transform -> Merge -> Reshape", "Transform -> Clean -> Publish -> Merge", "Merge -> Clean -> Transform -> Analyze"]', 1, 2, 'easy', '["The lecture explains four main steps: cleaning, transforming, merging, and reshaping the dataset."]'),
  ('0b719db2-70a8-4e1c-ad15-8ace2848b4ed', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7',
 'mcq', 'Knowledge Check', 'Which pandas function is commonly used to merge two dataframes based on a key?', 144,
 '["pd.reshape()", "pd.merge()", "pd.drop()", "pd.sort()"]', 1, 2, 'easy', '["pd.merge() merges two dataframes based on a common key, similar to SQL join operations."]'),
  ('5d84a958-165b-4bb8-8efc-1b84bf7950b3', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7',
 'mcq', 'Knowledge Check', 'What does an INNER JOIN return when merging two datasets?', 319,
 '["All records from both datasets", "Only the records that are common in both datasets", "Only records from the first dataset", "Only records from the second dataset"]', 1, 2, 'easy', '["Inner join returns only the matching records from both dataframes."]'),
  ('72bc2adc-b439-4396-b28a-facf0e5ea007', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7',
 'mcq', 'Knowledge Check', 'What does an OUTER JOIN return when merging datasets?', 359,
 '["Only matching records", "Only records from the first dataframe", "All records from both datasets, filling missing values with None/NaN", "Only records from the second dataframe"]', 2, 2, 'easy', '["Outer join performs a union of both datasets, including unmatched records."]'),
  ('4f6ead29-4a9d-4609-b151-21723c48c5e6', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7',
 'mcq', 'Knowledge Check', 'What happens in a LEFT JOIN?', 443,
 '["Only records from the second dataframe are kept", "All records from the first dataframe are kept, matching records from the second dataframe are added", "Only common records are returned", "Both datasets are ignored"]', 1, 2, 'easy', '["Left join keeps all records from the left dataframe (df1) and adds matching values from df2."]'),
  ('7119ef89-2c46-4ffe-be23-06546e84114c', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7',
 'mcq', 'Knowledge Check', 'In a RIGHT JOIN, priority is given to which dataset?', 529,
 '["First dataframe", "Second dataframe", "Both dataframes equally", "Neither dataframe"]', 1, 2, 'easy', '["Right join prioritizes the right dataframe (df2) and includes all its rows."]'),
  ('654f2e41-a7f0-46ee-bebf-7f9ee5f580b5', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7',
 'mcq', 'Knowledge Check', 'When merging two datasets without specifying a column, pandas merges based on:', 691,
 '["Random columns", "Common column names", "File size", "Data type"]', 1, 2, 'easy', '["If no column is specified, pandas automatically merges using common column names."]'),
  ('5a43c26b-9aac-40da-bdb1-df0dd4760400', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'd2e6f7a8-b9c0-4d16-9eaf-a2b3c4d5e6f7',
 'mcq', 'Knowledge Check', 'What does concatenation do in data processing?', 997,
 '["Deletes duplicate data", "Joins datasets together along rows or columns", "Converts data into JSON format", "Sorts data alphabetically"]', 1, 2, 'easy', '["Concatenation joins datasets row-wise (axis=0) or column-wise (axis=1)."]');

-- ────────────────────────────────────────────────────────────
-- Unit 2.5(b)
-- Lesson ID: e3f7a8b9-c0d1-4e17-8fba-b3c4d5e6f7a8
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('e77128d9-382c-4f42-aa6a-3ab91a3d5a3c', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e3f7a8b9-c0d1-4e17-8fba-b3c4d5e6f7a8',
 'coding', 'Hands-on Exercise', 'Fill the blanks to convert columns into rows using stack.', 120,
 E'_____ pandas as pd

data = {
    ''Math'':[90,85],
    ''Science'':[88,92]
}

df = pd._____(data)

stacked = df._____

print(_____)', 71, 4, 'medium', '[]',
 E'import pandas as pd

data = {
    ''Math'':[90,85],
    ''Science'':[88,92]
}

df = pd.DataFrame(data)

stacked = df.stack()

print(stacked)');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('0435f471-9052-4825-b257-8f9e629b8e59', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e3f7a8b9-c0d1-4e17-8fba-b3c4d5e6f7a8',
 'coding', 'Hands-on Exercise', 'Fill the blanks to convert rows back to columns using unstack.', 120,
 E'_____ pandas as pd

data = {
    ''Math'':[90,85],
    ''Science'':[88,92]
}

df = pd._____(data)

stacked = df.stack()

unstacked = stacked._____

print(_____)', 71, 4, 'medium', '[]',
 E'import pandas as pd

data = {
    ''Math'':[90,85],
    ''Science'':[88,92]
}

df = pd.DataFrame(data)

stacked = df.stack()

unstacked = stacked.unstack()

print(unstacked)');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('204217c2-465b-446a-9c7c-45d7f756b33a', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'e3f7a8b9-c0d1-4e17-8fba-b3c4d5e6f7a8',
 'coding', 'Hands-on Exercise', 'Complete the code to reshape a NumPy array into 2 rows and 3 columns.', 120,
 E'_____ numpy as np

arr = np._____(6)

reshaped = arr._____(2,3)

print(_____)', 71, 4, 'medium', '[]',
 E'import numpy as np

arr = np.arange(6)

reshaped = arr.reshape(2,3)

print(reshaped)');

-- ────────────────────────────────────────────────────────────
-- Unit 2.6(a)
-- Lesson ID: a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('fc77d148-66fe-4bb8-a2e8-63001413398b', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0',
 'mcq', 'Knowledge Check', 'Which of the following is NOT a step in data cleaning mentioned in the lecture?', 58,
 '["Standardizing capitalization", "Removing duplicates", "Detecting outliers", "Training machine learning models"]', 3, 2, 'easy', '["Data cleaning includes standardization, removing outliers, handling missing values, removing irrelevant data, converting data types, and removing duplicates."]'),
  ('437a8a8c-3a1b-42b4-8365-67551dc3ac76', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0',
 'mcq', 'Knowledge Check', 'What is the purpose of data discretization?', 147,
 '["Convert data into numerical format", "Divide continuous data into categories or bins", "Remove duplicate records", "Normalize the dataset"]', 1, 2, 'easy', '["Data discretization divides continuous data into categories (e.g., young, middle age, senior)."]'),
  ('9319a7ec-21ca-4e43-9a93-53353d521f99', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0',
 'mcq', 'Knowledge Check', 'Why is standardizing capitalization important in data cleaning?', 272,
 '["To improve hardware performance", "To ensure the program treats similar text values as the same entity", "To reduce dataset size", "To remove duplicate rows automatically"]', 1, 2, 'easy', '["Different capitalizations like \"Alice\", \"ALICE\", \"alice\" can be treated as different values unless standardized."]'),
  ('9762c06b-e297-4c9b-828e-d1510e993f8a', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0',
 'mcq', 'Knowledge Check', 'Which statistical method is used in the lecture to detect outliers?', 353,
 '["Linear regression", "Interquartile Range (IQR)", "K-Means clustering", "Logistic regression"]', 1, 2, 'easy', '["Outliers are detected using the Interquartile Range (IQR) method."]'),
  ('c650e5b4-e4b1-4c6f-bd0e-b0d44946b18f', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0',
 'mcq', 'Knowledge Check', 'Which pandas function is used to handle missing values by replacing them with a mean value?', 393,
 '["drop()", "fillna()", "replace()", "merge()"]', 1, 2, 'easy', '["fillna() fills missing values using mean, median, or other values."]'),
  ('d818fc74-4c0c-4021-b8d4-8f900b2e5136', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0',
 'mcq', 'Knowledge Check', 'What does df.drop_duplicates() do?', 578,
 '["Removes rows with missing values", "Converts data types", "Removes duplicate rows from a dataset", "Normalizes the dataset"]', 2, 2, 'easy', '["drop_duplicates() removes repeated rows to maintain data accuracy."]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('a32039cf-3ba3-4b19-b13c-9a6d834f9b17', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'a5b9c0d1-e2f3-4a19-8bdc-d5e6f7a8b9c0',
 'coding', 'Hands-on Exercise', 'Complete the code to handle missing values using pandas.', 120,
 E'_____ pandas as pd

data = {
    "salary":[50000,60000,None,55000,None]
}

df = pd._____(data)

df["salary"] = df["salary"]._____(df["salary"].mean())

print(_____)', 71, 4, 'medium', '[]',
 E'import pandas as pd

data = {
    "salary":[50000,60000,None,55000,None]
}

df = pd.DataFrame(data)

df["salary"] = df["salary"].fillna(df["salary"].mean())

print(df)');

-- ────────────────────────────────────────────────────────────
-- Unit 2.6(b)
-- Lesson ID: f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('1017b7f1-b6cc-43a9-b61f-00a319aa058c', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9',
 'mcq', 'Knowledge Check', 'Which pandas function is used to replace missing values with the mean of the column?', 61,
 '["dropna()", "fillna()", "merge()", "concat()"]', 1, 2, 'easy', '["fillna() replaces missing values using methods like mean, median, or a fixed value."]'),
  ('86bb4d4e-d215-4016-b2ea-8fe78903d490', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9',
 'mcq', 'Knowledge Check', 'What is Listwise Deletion?', 107,
 '["Replacing missing values with averages", "Removing only missing values", "Removing the entire row or column that contains missing values", "Replacing missing values using regression"]', 2, 2, 'easy', '["Listwise deletion removes entire rows (or columns) that contain missing values."]'),
  ('af6d8bba-0599-417e-8d7b-fb45ee0ca902', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9',
 'mcq', 'Knowledge Check', 'Why is Pairwise Deletion sometimes preferred over Listwise Deletion?', 147,
 '["It removes all data completely", "It keeps more useful data for calculations", "It converts missing values to zero", "It duplicates rows"]', 1, 2, 'easy', '["Pairwise deletion removes missing values only for specific operations, preserving more data."]'),
  ('59752d8b-df0e-41ad-9ad5-9550225c5bed', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9',
 'mcq', 'Knowledge Check', 'What is Data Imputation?', 276,
 '["Removing duplicate rows", "Replacing missing values with estimated values", "Sorting datasets", "Encrypting datasets"]', 1, 2, 'easy', '["Imputation replaces missing values using statistical or predictive techniques."]'),
  ('dc600f83-275d-454f-89ad-edc7bc5909f2', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9',
 'mcq', 'Knowledge Check', 'Which method predicts missing values using regression models?', 321,
 '["Pairwise deletion", "Regression imputation", "Multiple deletion", "Random sampling"]', 1, 2, 'easy', '["Regression imputation predicts missing values using relationships between variables."]'),
  ('5980ac1e-88b2-43fa-b332-8087a4c1446c', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9',
 'mcq', 'Knowledge Check', 'What does the fit_transform() function do in imputation?', 522,
 '["Deletes missing values", "Calculates statistics and replaces missing values", "Converts data types", "Sorts the dataset"]', 1, 2, 'easy', '["fit() computes the statistic (like mean) and transform() replaces missing values."]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('8ace4242-39df-4ac4-b021-d7d73659c850', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'f4a8b9c0-d1e2-4f18-9acb-c4d5e6f7a8b9',
 'coding', 'Hands-on Exercise', '', 120,
 E'Complete the code to replace missing values using sklearn SimpleImputer.
from sklearn._____ import SimpleImputer

data = pd.DataFrame({
    "blood_pressure":[120,115,None,130]
})

imputer = SimpleImputer(strategy="_____")

data["blood_pressure"] = imputer._____ (data[["blood_pressure"]])

print(data)', 71, 4, 'medium', '[]',
 E'import pandas as pd
from sklearn.impute import SimpleImputer

data = pd.DataFrame({
    "blood_pressure":[120,115,None,130]
})

imputer = SimpleImputer(strategy="mean")

data["blood_pressure"] = imputer.fit_transform(data[["blood_pressure"]])

print(data)');

-- ────────────────────────────────────────────────────────────
-- Unit 2.7
-- Lesson ID: b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('ddb93a06-ee8f-408d-a03e-369942f0a31b', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1',
 'mcq', 'Knowledge Check', 'What is the main purpose of data transformation?', 58,
 '["Delete datasets permanently", "Convert and structure data into a useful format for analysis", "Only visualize the data", "Compress the data into ZIP files"]', 1, 2, 'easy', '["Data transformation converts raw or unstructured data into a structured format suitable for analysis and decision-making."]'),
  ('9aa3d4be-d240-47ae-8d98-8f9533050a0f', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1',
 'mcq', 'Knowledge Check', 'Which of the following is the first step in the data transformation process?', 136,
 '["Data aggregation", "Data smoothing", "Data discretization", "Data normalization"]', 1, 2, 'easy', '["The first step is data smoothing, which removes noise and irregularities from the dataset."]'),
  ('98e4e8fe-dca7-405c-b2f1-2a89a95f517f', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1',
 'mcq', 'Knowledge Check', 'What is Attribute Construction?', 268,
 '["Deleting unnecessary columns", "Creating new attributes from existing data", "Sorting data alphabetically", "Converting strings into integers"]', 1, 2, 'easy', '["Attribute construction creates new useful features from existing attributes to improve analysis."]'),
  ('4b47579e-b2f6-432c-acb6-edb8fab9af86', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1',
 'mcq', 'Knowledge Check', 'What does data generalization do?', 341,
 '["Deletes detailed data", "Converts detailed values into broader categories", "Encrypts data", "Visualizes data in graphs"]', 1, 2, 'easy', '["Generalization converts specific values into higher-level categories, such as age groups."]'),
  ('d71980aa-4bdb-4982-83a1-93a86cb7ccb1', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1',
 'mcq', 'Knowledge Check', 'Which pandas function is used in the lecture to group data and compute aggregated results?', 495,
 '["merge()", "groupby()", "reshape()", "append()"]', 1, 2, 'easy', '["groupby() is used for data aggregation, such as calculating total sales by region."]'),
  ('67fbb4ce-69c9-4448-a4c1-0fca08cfa823', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1',
 'mcq', 'Knowledge Check', 'What is the purpose of data discretization?', 614,
 '["Convert categorical data into numbers", "Convert continuous values into intervals or bins", "Delete missing values", "Compress large datasets"]', 1, 2, 'easy', '["Discretization groups continuous data into intervals or bins such as low, medium, and high."]');

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   initial_code, language_id, star_value, difficulty, hints, solution)
VALUES
('f78f58a0-86f7-4e4d-8cca-7e571a07b4d9', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'b6c0d1e2-f3a4-4b20-9ced-e6f7a8b9c0d1',
 'coding', 'Hands-on Exercise', 'Complete the code to group sales by region and compute total sales.', 120,
 E'_____ pandas as pd

data = {
    "region":["North","South","North","East"],
    "sales":[200,150,300,250]
}

df = pd._____(data)

result = df._____("region")["sales"]._____()

print(result)', 71, 4, 'medium', '[]',
 E'import pandas as pd

data = {
    "region":["North","South","North","East"],
    "sales":[200,150,300,250]
}

df = pd.DataFrame(data)

result = df.groupby("region")["sales"].sum()

print(result)');

-- ────────────────────────────────────────────────────────────
-- Unit 2.8
-- Lesson ID: c7d1e2f3-a4b5-4c21-8dfe-f7a8b9c0d1e2
-- ────────────────────────────────────────────────────────────

INSERT INTO public.challenges
  (id, course_id, lesson_id, challenge_type, title, description, timestamp_seconds,
   options, correct_option, star_value, difficulty, hints)
VALUES
  ('1a265fc0-0624-4d94-8930-3c34381386ac', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c7d1e2f3-a4b5-4c21-8dfe-f7a8b9c0d1e2',
 'mcq', 'Knowledge Check', 'In Python, what is a string?', 50,
 '["A collection of numbers", "A sequence of characters enclosed in quotes", "A type of loop", "A mathematical function"]', 1, 2, 'easy', '["A string is a sequence of characters enclosed in single or double quotes."]'),
  ('6b97b0f9-b28c-439e-abbd-4221d71708a1', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c7d1e2f3-a4b5-4c21-8dfe-f7a8b9c0d1e2',
 'mcq', 'Knowledge Check', 'What is string padding?', 94,
 '["Removing characters from a string", "Adding extra characters to the beginning or end of a string", "Splitting a string into words", "Searching a string"]', 1, 2, 'easy', '["Padding adds extra characters or spaces to format text properly."]'),
  ('ad34ed8b-fba9-4f14-91e2-012b9ccfc62a', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c7d1e2f3-a4b5-4c21-8dfe-f7a8b9c0d1e2',
 'mcq', 'Knowledge Check', 'Which Python method is used to divide a string into multiple substrings?', 206,
 '["split()", "strip()", "find()", "join()"]', 0, 2, 'easy', '["split() divides a string into multiple substrings using a delimiter."]'),
  ('98fc1558-4d01-4956-a590-646d4fb79ed1', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c7d1e2f3-a4b5-4c21-8dfe-f7a8b9c0d1e2',
 'mcq', 'Knowledge Check', 'Which function removes unwanted characters from the beginning and end of a string?', 328,
 '["strip()", "concat()", "search()", "append()"]', 0, 2, 'easy', '["strip() removes leading and trailing characters."]'),
  ('3d703a67-5079-47ab-8bc2-ee2f144bd939', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c7d1e2f3-a4b5-4c21-8dfe-f7a8b9c0d1e2',
 'mcq', 'Knowledge Check', 'Which operator is used for string concatenation in Python?', 412,
 '["*", "+", "/", "="]', 1, 2, 'easy', '["The + operator joins two strings together."]'),
  ('2fb2d490-8982-4519-ab16-06eb4010d65f', 'd5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c', 'c7d1e2f3-a4b5-4c21-8dfe-f7a8b9c0d1e2',
 'mcq', 'Knowledge Check', 'Which Python method is used to search for a substring inside a string?', 450,
 '["split()", "strip()", "find()", "append()"]', 2, 2, 'easy', '["find() returns the index position of the substring in the string."]');

COMMIT;
