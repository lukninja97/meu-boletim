import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
}

interface SubjectInfo {
  id: string;
  name: string;
  code: string;
}

interface ClassInfo {
  id: string;
  name: string;
  course: string | null;
  year: number;
  semester: number;
}

interface SubjectGrade {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  average: number | null;
  count: number;
}

interface TurmaGrades {
  classId: string;
  className: string;
  course: string | null;
  year: number;
  semester: number;
  subjects: SubjectGrade[];
}

const gradeTone = (value: number) =>
  value >= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";

const MinhasNotas = () => {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<TurmaGrades[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotas();
  }, []);

  const fetchNotas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", user.id);

    if (enrollmentsError) {
      toast({
        title: "Erro ao carregar notas",
        description: enrollmentsError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const classIds = Array.from(new Set(enrollmentsData?.map(e => e.class_id) || []));
    if (classIds.length === 0) {
      setLoading(false);
      return;
    }

    const [{ data: classesData }, { data: classSubjectsData }] = await Promise.all([
      supabase.from("classes").select("id, name, course, year, semester").in("id", classIds),
      supabase.from("class_subjects").select("id, class_id, subject_id").in("class_id", classIds),
    ]);

    const classSubjectIds = classSubjectsData?.map(cs => cs.id) || [];

    const [{ data: gradesData }, { data: subjectsData }] = await Promise.all([
      classSubjectIds.length > 0
        ? supabase
            .from("grades")
            .select("id, class_subject_id, grade_value")
            .eq("student_id", user.id)
            .in("class_subject_id", classSubjectIds)
        : Promise.resolve({ data: [] as { id: string; class_subject_id: string; grade_value: number }[] }),
      Array.from(new Set(classSubjectsData?.map(cs => cs.subject_id) || [])).length > 0
        ? supabase
            .from("subjects")
            .select("id, name, code")
            .in("id", Array.from(new Set(classSubjectsData?.map(cs => cs.subject_id) || [])))
        : Promise.resolve({ data: [] as SubjectInfo[] }),
    ]);

    const subjectsMap = (subjectsData || []).reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as { [key: string]: SubjectInfo });

    const gradesByClassSubject = (gradesData || []).reduce((acc, g) => {
      (acc[g.class_subject_id] ||= []).push(g.grade_value);
      return acc;
    }, {} as { [key: string]: number[] });

    const turmaCards = (classesData || [])
      .map((cls: ClassInfo) => {
        const links: ClassSubject[] = (classSubjectsData || []).filter(cs => cs.class_id === cls.id);
        const subjects: SubjectGrade[] = links
          .map(cs => {
            const info = subjectsMap[cs.subject_id];
            const values = gradesByClassSubject[cs.id] || [];
            const average =
              values.length > 0 ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
            return {
              subjectId: cs.subject_id,
              subjectName: info?.name || "-",
              subjectCode: info?.code || "-",
              average,
              count: values.length,
            };
          })
          .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "pt-BR"));


        return {
          classId: cls.id,
          className: cls.name,
          course: cls.course ?? null,
          year: cls.year,
          semester: cls.semester,
          subjects,
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className, "pt-BR"));

    setTurmas(turmaCards);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/aluno")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Minhas Notas</h1>
              <p className="text-sm text-muted-foreground">
                Suas notas por turma e matéria
              </p>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {turmas.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma turma vinculada</CardTitle>
              <CardDescription>
                Você ainda não está matriculado em nenhuma turma. Fale com a secretaria.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {turmas.map(turma => (
              <Card key={turma.classId} className="h-full">
                <CardHeader className="bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{turma.className}</CardTitle>
                      <CardDescription>
                        {turma.course ? `${turma.course} · ` : ""}
                        {turma.year} · {turma.semester}º semestre
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <ul className="divide-y divide-border">
                    {turma.subjects.map(subject => (
                      <li
                        key={subject.subjectId}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate font-medium text-foreground">
                            {subject.subjectName}
                          </span>
                          <span className="text-xs text-muted-foreground">{subject.subjectCode}</span>
                        </span>
                        {subject.average === null ? (
                          <span className="shrink-0 text-sm text-muted-foreground">Sem nota</span>
                        ) : (
                          <span
                            className={`inline-flex min-w-12 justify-center rounded-lg px-3 py-1 text-base font-bold ${gradeTone(
                              subject.average
                            )}`}
                          >
                            {subject.average}
                          </span>
                        )}
                      </li>
                    ))}
                    {turma.subjects.length === 0 && (
                      <li className="py-3 text-sm text-muted-foreground">
                        Nenhuma matéria vinculada a esta turma
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MinhasNotas;
