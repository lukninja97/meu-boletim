import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  subjects?: Subject;
}

interface EnrolledStudent {
  id: string;
  full_name: string;
  existing_grade?: {
    id: string;
    grade_value: number;
    observations: string | null;
  };
}

interface GradeInput {
  student_id: string;
  grade_value: string;
  observations: string;
}

interface HistoricalGrade {
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

const Notas = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Estados para seleção de contexto
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGradeType, setSelectedGradeType] = useState<string>("prova");
  const [gradeDate, setGradeDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  // Estados para alunos e notas
  const [classSubjectId, setClassSubjectId] = useState<string>("");
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Map<string, GradeInput>>(new Map());
  
  // Estados para histórico
  const [historicalGrades, setHistoricalGrades] = useState<HistoricalGrade[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassSubjects();
      setSelectedSubject("");
      setEnrolledStudents([]);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      const cs = classSubjects.find(cs => cs.subject_id === selectedSubject);
      if (cs) {
        setClassSubjectId(cs.id);
      }
    }
  }, [selectedSubject, classSubjects]);

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id)
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar turmas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClasses(data || []);
    }
  };

  const fetchClassSubjects = async () => {
    const { data, error } = await supabase
      .from("class_subjects")
      .select("id, class_id, subject_id, subjects(id, name)")
      .eq("class_id", selectedClass);

    if (error) {
      toast({
        title: "Erro ao carregar matérias",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClassSubjects(data || []);
    }
  };

  const fetchEnrolledStudents = async () => {
    if (!selectedClass || !classSubjectId || !selectedGradeType || !gradeDate) {
      toast({
        title: "Seleção incompleta",
        description: "Selecione turma, matéria, tipo e data antes de buscar alunos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Buscar alunos matriculados
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("class_id", selectedClass)
      .eq("status", "active");

    if (enrollError) {
      toast({
        title: "Erro ao carregar matrículas",
        description: enrollError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const studentIds = (enrollments || []).map(e => e.student_id);

    if (studentIds.length === 0) {
      setEnrolledStudents([]);
      setLoading(false);
      toast({
        title: "Nenhum aluno matriculado",
        description: "Não há alunos matriculados nesta turma",
      });
      return;
    }

    // Buscar perfis dos alunos
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds)
      .order("full_name");

    if (profilesError) {
      toast({
        title: "Erro ao carregar alunos",
        description: profilesError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Buscar notas existentes
    const { data: existingGrades, error: gradesError } = await supabase
      .from("grades")
      .select("id, student_id, grade_value, observations")
      .eq("class_subject_id", classSubjectId)
      .eq("grade_type", selectedGradeType)
      .eq("grade_date", gradeDate)
      .in("student_id", studentIds);

    if (gradesError) {
      toast({
        title: "Erro ao carregar notas existentes",
        description: gradesError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Mesclar perfis com notas existentes
    const studentsWithGrades = (profiles || []).map(profile => {
      const existingGrade = (existingGrades || []).find(g => g.student_id === profile.id);
      return {
        ...profile,
        existing_grade: existingGrade || undefined
      };
    });

    setEnrolledStudents(studentsWithGrades);

    // Inicializar inputs com notas existentes
    const initialInputs = new Map<string, GradeInput>();
    studentsWithGrades.forEach(student => {
      initialInputs.set(student.id, {
        student_id: student.id,
        grade_value: student.existing_grade?.grade_value?.toString() || "",
        observations: student.existing_grade?.observations || "",
      });
    });
    setGradeInputs(initialInputs);

    setLoading(false);
    toast({
      title: `${studentsWithGrades.length} alunos carregados`,
      description: "Preencha as notas e clique em Salvar",
    });
  };

  const handleGradeChange = (studentId: string, field: "grade_value" | "observations", value: string) => {
    const current = gradeInputs.get(studentId) || {
      student_id: studentId,
      grade_value: "",
      observations: "",
    };

    const updated = { ...current, [field]: value };
    const newInputs = new Map(gradeInputs);
    newInputs.set(studentId, updated);
    setGradeInputs(newInputs);
  };

  const handleSaveGrades = async () => {
    // Validar e filtrar notas a serem salvas
    const gradesToSave = Array.from(gradeInputs.values())
      .filter(input => input.grade_value !== "")
      .map(input => {
        const gradeValue = parseFloat(input.grade_value);
        if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 10) {
          return null;
        }
        return {
          student_id: input.student_id,
          class_subject_id: classSubjectId,
          grade_value: gradeValue,
          grade_type: selectedGradeType,
          grade_date: gradeDate,
          observations: input.observations || null,
        };
      })
      .filter(g => g !== null);

    if (gradesToSave.length === 0) {
      toast({
        title: "Nenhuma nota válida",
        description: "Preencha ao menos uma nota válida (0-10) antes de salvar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Usar upsert para inserir ou atualizar
    const { error } = await supabase
      .from("grades")
      .upsert(gradesToSave, {
        onConflict: "student_id,class_subject_id,grade_type,grade_date",
        ignoreDuplicates: false,
      });

    if (error) {
      toast({
        title: "Erro ao salvar notas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Notas salvas com sucesso!",
        description: `${gradesToSave.length} nota(s) salva(s)`,
      });
      // Recarregar alunos com notas atualizadas
      await fetchEnrolledStudents();
    }

    setLoading(false);
  };

  const fetchHistoricalGrades = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("grades")
      .select("*")
      .order("grade_date", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const gradesWithDetails = await Promise.all(
      (data || []).map(async (grade) => {
        const [studentData, classSubjectData] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", grade.student_id).maybeSingle(),
          supabase.from("class_subjects")
            .select("class_id, subject_id")
            .eq("id", grade.class_subject_id)
            .maybeSingle()
        ]);

        let classData = null;
        let subjectData = null;

        if (classSubjectData.data) {
          const [classResult, subjectResult] = await Promise.all([
            supabase.from("classes").select("name").eq("id", classSubjectData.data.class_id).maybeSingle(),
            supabase.from("subjects").select("name").eq("id", classSubjectData.data.subject_id).maybeSingle()
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

    setHistoricalGrades(gradesWithDetails as any);
    setLoading(false);
  };

  const toggleHistory = () => {
    if (!showHistory) {
      fetchHistoricalGrades();
    }
    setShowHistory(!showHistory);
  };

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

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Card de Lançamento de Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Lançamento de Notas</CardTitle>
            <CardDescription>Selecione a turma, matéria e tipo de avaliação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seleção de Contexto */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Turma</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Matéria</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                  disabled={!selectedClass}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSubjects.map((cs) => (
                      <SelectItem key={cs.id} value={cs.subject_id}>
                        {cs.subjects?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade_type">Tipo de Avaliação</Label>
                <Select value={selectedGradeType} onValueChange={setSelectedGradeType}>
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
                <Label htmlFor="grade_date">Data</Label>
                <Input
                  id="grade_date"
                  type="date"
                  value={gradeDate}
                  onChange={(e) => setGradeDate(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={fetchEnrolledStudents} disabled={loading || !selectedClass || !selectedSubject}>
              {loading ? "Carregando..." : "Buscar Alunos"}
            </Button>

            {/* Tabela de Alunos */}
            {enrolledStudents.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Aluno</TableHead>
                        <TableHead className="w-[15%]">Nota Atual</TableHead>
                        <TableHead className="w-[20%]">Nova Nota (0-10)</TableHead>
                        <TableHead className="w-[25%]">Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrolledStudents.map((student) => {
                        const input = gradeInputs.get(student.id) || {
                          student_id: student.id,
                          grade_value: "",
                          observations: "",
                        };

                        return (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.full_name}
                            </TableCell>
                            <TableCell>
                              {student.existing_grade
                                ? student.existing_grade.grade_value.toFixed(2)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="10"
                                value={input.grade_value}
                                onChange={(e) =>
                                  handleGradeChange(student.id, "grade_value", e.target.value)
                                }
                                className="w-24"
                                placeholder="0-10"
                              />
                            </TableCell>
                            <TableCell>
                              <Textarea
                                value={input.observations}
                                onChange={(e) =>
                                  handleGradeChange(student.id, "observations", e.target.value)
                                }
                                className="min-w-[200px]"
                                rows={1}
                                placeholder="Observações opcionais"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {Array.from(gradeInputs.values()).filter(i => i.grade_value !== "").length} de {enrolledStudents.length} notas preenchidas
                  </p>
                  <Button onClick={handleSaveGrades} disabled={loading} size="lg">
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Todas as Notas
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Histórico */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Histórico de Notas</CardTitle>
              <CardDescription>Últimas notas registradas no sistema</CardDescription>
            </div>
            <Button variant="outline" onClick={toggleHistory}>
              {showHistory ? "Ocultar Histórico" : "Ver Histórico"}
            </Button>
          </CardHeader>
          {showHistory && (
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
                  {historicalGrades.map((grade) => (
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
                  {historicalGrades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma nota encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Notas;
