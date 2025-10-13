import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Enrollment {
  id: string;
  class_id: string;
  enrollment_date: string;
  status: string;
}

interface Class {
  id: string;
  name: string;
  year: number;
  semester: number;
}

const MinhasTurmas = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<{ [key: string]: Class }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", user.id);

    if (enrollmentsError) {
      toast({
        title: "Erro ao carregar matrículas",
        description: enrollmentsError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setEnrollments(enrollmentsData || []);

    // Buscar informações das turmas
    const classIds = enrollmentsData?.map(e => e.class_id) || [];
    if (classIds.length > 0) {
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .in("id", classIds);

      if (!classesError && classesData) {
        const classesMap = classesData.reduce((acc, cls) => {
          acc[cls.id] = cls;
          return acc;
        }, {} as { [key: string]: Class });
        setClasses(classesMap);
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
          <h1 className="text-2xl font-bold text-foreground">Minhas Turmas</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Turmas Matriculadas</CardTitle>
            <CardDescription>Lista de turmas em que você está matriculado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Turma</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Semestre</TableHead>
                  <TableHead>Data de Matrícula</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => {
                  const classInfo = classes[enrollment.class_id];
                  return (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {classInfo?.name || "-"}
                      </TableCell>
                      <TableCell>{classInfo?.year || "-"}</TableCell>
                      <TableCell>{classInfo?.semester || "-"}º Semestre</TableCell>
                      <TableCell>
                        {new Date(enrollment.enrollment_date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          enrollment.status === "active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {enrollment.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {enrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Você não está matriculado em nenhuma turma
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

export default MinhasTurmas;
