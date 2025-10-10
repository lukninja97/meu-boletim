import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Grade {
  id: string;
  grade_value: number;
  grade_type: string;
  grade_date: string;
  observations: string | null;
  student_id: string;
  class_subject_id: string;
  profiles?: { full_name: string };
  class_subjects?: {
    classes?: { name: string };
    subjects?: { name: string };
  };
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  classes?: { name: string };
  subjects?: { name: string };
}

interface Student {
  id: string;
  full_name: string;
}

const Notas = () => {
  const navigate = useNavigate();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState({
    student_id: "",
    class_subject_id: "",
    grade_value: "",
    grade_type: "prova",
    grade_date: new Date().toISOString().split("T")[0],
    observations: "",
  });

  useEffect(() => {
    fetchGrades();
    fetchClassSubjects();
    fetchStudents();
  }, []);

  const fetchGrades = async () => {
    const { data, error } = await supabase
      .from("grades")
      .select("*")
      .order("grade_date", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar notas",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const gradesWithDetails = await Promise.all(
      (data || []).map(async (grade) => {
        const [studentData, classSubjectData] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", grade.student_id).single(),
          supabase.from("class_subjects")
            .select("class_id, subject_id")
            .eq("id", grade.class_subject_id)
            .single()
        ]);

        let classData = null;
        let subjectData = null;

        if (classSubjectData.data) {
          const [classResult, subjectResult] = await Promise.all([
            supabase.from("classes").select("name").eq("id", classSubjectData.data.class_id).single(),
            supabase.from("subjects").select("name").eq("id", classSubjectData.data.subject_id).single()
          ]);
          classData = classResult.data;
          subjectData = subjectResult.data;
        }

        return {
          ...grade,
          profiles: studentData.data,
          class_subjects: {
            classes: classData,
            subjects: subjectData,
          },
        };
      })
    );

    setGrades(gradesWithDetails as any);
    setLoading(false);
  };

  const fetchClassSubjects = async () => {
    const { data, error } = await supabase
      .from("class_subjects")
      .select(`
        id,
        class_id,
        subject_id,
        classes:class_id(name),
        subjects:subject_id(name)
      `);

    if (error) {
      toast({
        title: "Erro ao carregar turmas/matérias",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClassSubjects(data || []);
    }
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name");

    if (error) {
      toast({
        title: "Erro ao carregar alunos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStudents(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("grades").insert({
      student_id: formData.student_id,
      class_subject_id: formData.class_subject_id,
      grade_value: parseFloat(formData.grade_value),
      grade_type: formData.grade_type,
      grade_date: formData.grade_date,
      observations: formData.observations || null,
    });

    if (error) {
      toast({
        title: "Erro ao lançar nota",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Nota lançada com sucesso",
      });
      setFormData({
        student_id: "",
        class_subject_id: "",
        grade_value: "",
        grade_type: "prova",
        grade_date: new Date().toISOString().split("T")[0],
        observations: "",
      });
      setOpen(false);
      fetchGrades();
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
          <Button variant="ghost" onClick={() => navigate("/professor")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Notas</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Notas Lançadas</CardTitle>
              <CardDescription>Histórico de notas registradas</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Lançar Nota
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Lançar Nova Nota</DialogTitle>
                  <DialogDescription>Preencha os dados da nota</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student">Aluno</Label>
                    <Select
                      value={formData.student_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, student_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um aluno" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class_subject">Turma/Matéria</Label>
                    <Select
                      value={formData.class_subject_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, class_subject_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione turma/matéria" />
                      </SelectTrigger>
                      <SelectContent>
                        {classSubjects.map((cs) => (
                          <SelectItem key={cs.id} value={cs.id}>
                            {cs.classes?.name} - {cs.subjects?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade_type">Tipo de Avaliação</Label>
                    <Select
                      value={formData.grade_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, grade_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prova">Prova</SelectItem>
                        <SelectItem value="trabalho">Trabalho</SelectItem>
                        <SelectItem value="participacao">Participação</SelectItem>
                        <SelectItem value="projeto">Projeto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade_value">Nota</Label>
                    <Input
                      id="grade_value"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.grade_value}
                      onChange={(e) =>
                        setFormData({ ...formData, grade_value: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade_date">Data</Label>
                    <Input
                      id="grade_date"
                      type="date"
                      value={formData.grade_date}
                      onChange={(e) =>
                        setFormData({ ...formData, grade_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações</Label>
                    <Textarea
                      id="observations"
                      value={formData.observations}
                      onChange={(e) =>
                        setFormData({ ...formData, observations: e.target.value })
                      }
                      placeholder="Observações opcionais"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    Lançar Nota
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Matéria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">
                      {grade.profiles?.full_name || "-"}
                    </TableCell>
                    <TableCell>
                      {grade.class_subjects?.classes?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {grade.class_subjects?.subjects?.name || "-"}
                    </TableCell>
                    <TableCell className="capitalize">{grade.grade_type}</TableCell>
                    <TableCell>{grade.grade_value.toFixed(2)}</TableCell>
                    <TableCell>{new Date(grade.grade_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {grades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma nota lançada
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

export default Notas;
