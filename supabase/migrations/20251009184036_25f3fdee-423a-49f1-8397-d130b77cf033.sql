-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('professor', 'aluno');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create class_subjects table (many-to-many relationship)
CREATE TABLE public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (class_id, subject_id)
);

-- Create enrollments table (students in classes)
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  UNIQUE (student_id, class_id)
);

-- Create grades table
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_subject_id UUID REFERENCES public.class_subjects(id) ON DELETE CASCADE NOT NULL,
  grade_value DECIMAL(5,2) NOT NULL CHECK (grade_value >= 0 AND grade_value <= 10),
  grade_type TEXT NOT NULL CHECK (grade_type IN ('prova', 'trabalho', 'participacao', 'final')),
  grade_date DATE NOT NULL,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_subject_id UUID REFERENCES public.class_subjects(id) ON DELETE CASCADE NOT NULL,
  attendance_date DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (student_id, class_subject_id, attendance_date)
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário'));
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Professors can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'professor'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Professors can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'professor'));

-- RLS Policies for classes
CREATE POLICY "Professors can manage classes"
  ON public.classes FOR ALL
  USING (public.has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can view their classes"
  ON public.classes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'aluno') AND
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.student_id = auth.uid()
      AND enrollments.class_id = classes.id
    )
  );

-- RLS Policies for subjects
CREATE POLICY "Everyone can view subjects"
  ON public.subjects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Professors can manage subjects"
  ON public.subjects FOR ALL
  USING (public.has_role(auth.uid(), 'professor'));

-- RLS Policies for class_subjects
CREATE POLICY "Professors can manage class subjects"
  ON public.class_subjects FOR ALL
  USING (public.has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can view their class subjects"
  ON public.class_subjects FOR SELECT
  USING (
    public.has_role(auth.uid(), 'aluno') AND
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.student_id = auth.uid()
      AND enrollments.class_id = class_subjects.class_id
    )
  );

-- RLS Policies for enrollments
CREATE POLICY "Professors can manage enrollments"
  ON public.enrollments FOR ALL
  USING (public.has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can view their own enrollments"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = student_id);

-- RLS Policies for grades
CREATE POLICY "Professors can manage grades"
  ON public.grades FOR ALL
  USING (public.has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can view their own grades"
  ON public.grades FOR SELECT
  USING (auth.uid() = student_id);

-- RLS Policies for attendance
CREATE POLICY "Professors can manage attendance"
  ON public.attendance FOR ALL
  USING (public.has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can view their own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = student_id);

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_class_id ON public.enrollments(class_id);
CREATE INDEX idx_grades_student_id ON public.grades(student_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_class_subjects_class_id ON public.class_subjects(class_id);