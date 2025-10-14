-- Adicionar constraint única para permitir upsert de notas
-- Garante que cada aluno tenha apenas uma nota por tipo de avaliação por data em cada turma/matéria
ALTER TABLE grades 
ADD CONSTRAINT unique_grade_per_student_subject_type_date 
UNIQUE (student_id, class_subject_id, grade_type, grade_date);