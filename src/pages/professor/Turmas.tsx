import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Class {
  id: string;
  name: string;
  year: number;
  semester: number;
}

interface Student {
  id: string;
  full_name: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  profiles: Student;
}

const Turmas = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear(),
    semester: 1,
  });
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Enrollment[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("year", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar turmas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClasses(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("classes").insert({
      name: formData.name,
      year: formData.year,
      semester: formData.semester,
      teacher_id: user?.id,
    });

    if (error) {
      toast({
        title: "Erro ao criar turma",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Turma criada com sucesso!",
      });
      setOpen(false);
      setFormData({ name: "", year: new Date().getFullYear(), semester: 1 });
      fetchClasses();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    
    if (error) {
      toast({
        title: "Erro ao excluir turma",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Turma excluída com sucesso",
      });
      fetchClasses();
    }
  };

  const fetchEnrollmentData = async (classId: string) => {
    // Buscar alunos matriculados
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("id, student_id")
      .eq("class_id", classId);

    if (enrollError) {
      toast({
        title: "Erro ao carregar matrículas",
        description: enrollError.message,
        variant: "destructive",
      });
      return;
    }

    // Buscar dados dos alunos matriculados
    const enrolledWithProfiles = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", enrollment.student_id)
          .single();
        
        return {
          ...enrollment,
          profiles: profile as Student,
        };
      })
    );

    setEnrolledStudents(enrolledWithProfiles as Enrollment[]);

    // Buscar todos os alunos: primeiro buscar IDs na user_roles, depois profiles
    const { data: alunoRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "aluno");

    if (rolesError) {
      toast({
        title: "Erro ao carregar alunos",
        description: rolesError.message,
        variant: "destructive",
      });
      return;
    }

    const alunoIds = (alunoRoles || []).map(r => r.user_id);
    
    if (alunoIds.length === 0) {
      setAvailableStudents([]);
      return;
    }

    const { data: allStudents, error: studentsError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", alunoIds);

    if (studentsError) {
      toast({
        title: "Erro ao carregar perfis",
        description: studentsError.message,
        variant: "destructive",
      });
      return;
    }

    // Filtrar alunos que não estão matriculados
    const enrolledIds = enrollments?.map(e => e.student_id) || [];
    const available = (allStudents || []).filter(
      student => !enrolledIds.includes(student.id)
    );

    setAvailableStudents(available);
  };

  const handleOpenEnrollment = async (classItem: Class) => {
    setSelectedClass(classItem);
    await fetchEnrollmentData(classItem.id);
    setEnrollmentOpen(true);
  };

  const handleEnroll = async (studentId: string) => {
    if (!selectedClass) return;

    const { error } = await supabase.from("enrollments").insert({
      student_id: studentId,
      class_id: selectedClass.id,
      status: "active",
    });

    if (error) {
      toast({
        title: "Erro ao matricular aluno",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Aluno matriculado com sucesso",
      });
      fetchEnrollmentData(selectedClass.id);
    }
  };

  const handleUnenroll = async (enrollmentId: string) => {
    if (!selectedClass) return;

    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);

    if (error) {
      toast({
        title: "Erro ao remover matrícula",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Matrícula removida com sucesso",
      });
      fetchEnrollmentData(selectedClass.id);
    }
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
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Turmas</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Turmas</CardTitle>
              <CardDescription>Lista de todas as turmas cadastradas</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Turma
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Turma</DialogTitle>
                  <DialogDescription>Preencha os dados da nova turma</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Turma</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Ano</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="semester">Semestre</Label>
                    <Select
                      value={formData.semester.toString()}
                      onValueChange={(value) => setFormData({ ...formData, semester: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1º Semestre</SelectItem>
                        <SelectItem value="2">2º Semestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Criar Turma</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Semestre</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">{classItem.name}</TableCell>
                    <TableCell>{classItem.year}</TableCell>
                    <TableCell>{classItem.semester}º Semestre</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEnrollment(classItem)}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Gerenciar
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(classItem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {classes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma turma cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={enrollmentOpen} onOpenChange={setEnrollmentOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Alunos - {selectedClass?.name}</DialogTitle>
              <DialogDescription>
                Adicione ou remova alunos desta turma
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Alunos Disponíveis</h3>
                <div className="space-y-2">
                  {availableStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum aluno disponível</p>
                  ) : (
                    availableStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{student.full_name}</span>
                        <Button
                          size="sm"
                          onClick={() => handleEnroll(student.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Alunos Matriculados</h3>
                <div className="space-y-2">
                  {enrolledStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum aluno matriculado</p>
                  ) : (
                    enrolledStudents.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{enrollment.profiles.full_name}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUnenroll(enrollment.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Turmas;
