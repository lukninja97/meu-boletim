import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Grade {
  id: string;
  grade_value: number;
  grade_type: string;
  grade_date: string;
  observations: string | null;
  class_subject_id: string;
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  className?: string;
  subjectName?: string;
}

const MinhasNotas = () => {
  const navigate = useNavigate();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classSubjects, setClassSubjects] = useState<{ [key: string]: ClassSubject }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: gradesData, error: gradesError } = await supabase
      .from("grades")
      .select("*")
      .eq("student_id", user.id)
      .order("grade_date", { ascending: false });

    if (gradesError) {
      toast({
        title: "Erro ao carregar notas",
        description: gradesError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setGrades(gradesData || []);

    // Buscar informações de turmas e matérias
    const classSubjectIds = gradesData?.map(g => g.class_subject_id) || [];
    if (classSubjectIds.length > 0) {
      const { data: csData } = await supabase
        .from("class_subjects")
        .select("*")
        .in("id", classSubjectIds);

      if (csData) {
        // Buscar nomes das turmas e matérias
        const classIds = csData.map(cs => cs.class_id);
        const subjectIds = csData.map(cs => cs.subject_id);

        const [{ data: classesData }, { data: subjectsData }] = await Promise.all([
          supabase.from("classes").select("id, name").in("id", classIds),
          supabase.from("subjects").select("id, name").in("id", subjectIds)
        ]);

        const classesMap = classesData?.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {}) || {};
        const subjectsMap = subjectsData?.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {}) || {};

        const csMap = csData.reduce((acc, cs) => {
          acc[cs.id] = {
            ...cs,
            className: classesMap[cs.class_id] || "-",
            subjectName: subjectsMap[cs.subject_id] || "-"
          };
          return acc;
        }, {} as { [key: string]: ClassSubject });

        setClassSubjects(csMap);
      }
    }

    setLoading(false);
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
          <h1 className="text-2xl font-bold text-foreground">Minhas Notas</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Notas</CardTitle>
            <CardDescription>Acompanhe seu desempenho acadêmico</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Matéria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => {
                  const cs = classSubjects[grade.class_subject_id];
                  return (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{cs?.className || "-"}</TableCell>
                      <TableCell>{cs?.subjectName || "-"}</TableCell>
                      <TableCell>{grade.grade_type}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          grade.grade_value >= 70 ? "text-green-600" : 
                          grade.grade_value >= 50 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {grade.grade_value.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(grade.grade_date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {grade.observations || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {grades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma nota lançada ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MinhasNotas;
