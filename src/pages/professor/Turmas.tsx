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
import { ArrowLeft, Plus, Trash2, Users, BookOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Class {
  id: string;
  name: string;
  year: number;
  semester: number;
  course: string | null;
  course_id: string | null;
  city: string | null;
}
interface Course { id: string; name: string; code: string; total_semesters: number }
interface CourseSubject { course_id: string; semester_number: number; subject_id: string }

interface Subject { id: string; name: string; code: string; }

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
    course_id: "",
    city: "",
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [newStudents, setNewStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<{ id: string; class_id: string; subject_id: string }[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [subjectsClass, setSubjectsClass] = useState<Class | null>(null);
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
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
      setClasses((data as Class[]) || []);
    }
    const [{ data: subs }, { data: cs }, { data: crs }, { data: crsSubs }, { data: roles }] = await Promise.all([
      supabase.from("subjects").select("id, name, code").order("name"),
      supabase.from("class_subjects").select("id, class_id, subject_id"),
      supabase.from("courses").select("id, name, code, total_semesters").order("name"),
      supabase.from("course_subjects").select("course_id, semester_number, subject_id"),
      supabase.from("user_roles").select("user_id").eq("role", "aluno"),
    ]);
    setCourses(crs || []);
    setCourseSubjects(crsSubs || []);
    const ids = (roles || []).map((x) => x.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids).order("full_name");
      setAllStudents(profs || []);
    }
    setSubjects(subs || []);
    setClassSubjects(cs || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!formData.course_id) {
      toast({ title: "Escolha o curso", variant: "destructive" });
      return;
    }
    const course = courses.find((c) => c.id === formData.course_id);
    const { data: created, error } = await supabase.from("classes").insert({
      name: formData.name,
      year: formData.year,
      semester: formData.semester,
      course_id: formData.course_id,
      course: course?.name ?? null,
      city: formData.city || null,
      teacher_id: user?.id,
    }).select("id").single();

    if (!error && created && newStudents.length > 0) {
      const { error: enErr } = await supabase.from("enrollments").insert(
        newStudents.map((sid) => ({ student_id: sid, class_id: created.id, status: "active" }))
      );
      if (enErr) toast({ title: "Erro ao matricular alunos", description: enErr.message, variant: "destructive" });
    }

    if (!error && created && selectedSubjects.length > 0) {
      const { error: csError } = await supabase.from("class_subjects").insert(
        selectedSubjects.map((sid) => ({ class_id: created.id, subject_id: sid, teacher_id: user?.id }))
      );
      if (csError) toast({ title: "Erro ao vincular matérias", description: csError.message, variant: "destructive" });
    }

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
      setFormData({ name: "", year: new Date().getFullYear(), semester: 1, course_id: "", city: "" });
      setSelectedSubjects([]);
      setNewStudents([]);
      setStudentSearch("");
      fetchClasses();
    }
  };

  const selectedCourse = courses.find((c) => c.id === formData.course_id);
  const pickCourse = (courseId: string, semester: number) => {
    setFormData((f) => ({ ...f, course_id: courseId, semester }));
    setSelectedSubjects(
      courseSubjects.filter((cs) => cs.course_id === courseId && cs.semester_number === semester).map((cs) => cs.subject_id)
    );
  };
  const filteredStudents = allStudents.filter((st) =>
    st.full_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const openSubjects = (c: Class) => {
    setSubjectsClass(c);
    setEditSubjects(classSubjects.filter((cs) => cs.class_id === c.id).map((cs) => cs.subject_id));
    setSubjectsOpen(true);
  };

  const saveSubjects = async () => {
    if (!subjectsClass) return;
    const current = classSubjects.filter((cs) => cs.class_id === subjectsClass.id);
    const toAdd = editSubjects.filter((sid) => !current.some((c) => c.subject_id === sid));
    const toRemove = current.filter((c) => !editSubjects.includes(c.subject_id));
    const { data: { user } } = await supabase.auth.getUser();
    if (toAdd.length) {
      const { error } = await supabase.from("class_subjects").insert(
        toAdd.map((sid) => ({ class_id: subjectsClass.id, subject_id: sid, teacher_id: user?.id }))
      );
      if (error) return toast({ title: "Erro ao vincular", description: error.message, variant: "destructive" });
    }
    if (toRemove.length) {
      const { error } = await supabase.from("class_subjects").delete().in("id", toRemove.map((r) => r.id));
      if (error) return toast({ title: "Erro ao desvincular (pode haver notas lançadas)", description: error.message, variant: "destructive" });
    }
    toast({ title: "Matérias atualizadas" });
    setSubjectsOpen(false);
    fetchClasses();
  };

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const subjectList = (
    selected: string[],
    onToggle: (id: string) => void
  ) => (
    <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
      {subjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma matéria cadastrada</p>
      ) : (
        subjects.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-muted">
            <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => onToggle(s.id)} />
            {s.name} <span className="text-muted-foreground">({s.code})</span>
          </label>
        ))
      )}
    </div>
  );

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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Nova Turma</DialogTitle>
                  <DialogDescription>Preencha os dados da nova turma</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Curso</Label>
                    <Select value={formData.course_id} onValueChange={(v) => pickCourse(v, 1)}>
                      <SelectTrigger><SelectValue placeholder="Escolha o curso" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {courses.length === 0 && <p className="text-xs text-muted-foreground mt-1">Cadastre um curso primeiro na tela Cursos.</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Semestre</Label>
                      <Select value={formData.semester.toString()} onValueChange={(v) => pickCourse(formData.course_id, parseInt(v))} disabled={!selectedCourse}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: selectedCourse?.total_semesters || 1 }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}º Semestre</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Ex: Guarulhos" />
                    </div>
                    <div>
                      <Label htmlFor="year">Ano</Label>
                      <Input id="year" type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">Nome da Turma</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: DEV GUA 25/1S" required />
                  </div>
                  {selectedCourse && (
                    <div>
                      <Label>Matérias do {formData.semester}º semestre</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedSubjects.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Nenhuma matéria neste semestre do curso</span>
                        ) : selectedSubjects.map((sid) => (
                          <Badge key={sid} variant="secondary">{subjects.find((x) => x.id === sid)?.code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Alunos ({newStudents.length} selecionados)</Label>
                    <Input className="mt-1 mb-2" placeholder="Buscar aluno..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                    <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                      {filteredStudents.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aluno encontrado</p>}
                      {filteredStudents.map((st) => (
                        <label key={st.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-muted">
                          <Checkbox checked={newStudents.includes(st.id)} onCheckedChange={() => setNewStudents(toggle(newStudents, st.id))} />
                          {st.full_name}
                        </label>
                      ))}
                    </div>
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
                  <TableHead>Curso</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Semestre</TableHead>
                  <TableHead>Matérias</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">{classItem.name}</TableCell>
                    <TableCell>{courses.find((c) => c.id === classItem.course_id)?.code || classItem.course || "-"}</TableCell>
                    <TableCell>{classItem.city || "-"}</TableCell>
                    <TableCell>{classItem.year}</TableCell>
                    <TableCell>{classItem.semester}º Semestre</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {classSubjects
                          .filter((cs) => cs.class_id === classItem.id)
                          .map((cs) => (
                            <Badge key={cs.id} variant="secondary">
                              {subjects.find((s) => s.id === cs.subject_id)?.code}
                            </Badge>
                          ))}
                        <Button variant="ghost" size="sm" onClick={() => openSubjects(classItem)}>
                          <BookOpen className="mr-1 h-4 w-4" />
                          Vincular
                        </Button>
                      </div>
                    </TableCell>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhuma turma cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={subjectsOpen} onOpenChange={setSubjectsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Matérias - {subjectsClass?.name}</DialogTitle>
              <DialogDescription>Selecione as matérias desta turma</DialogDescription>
            </DialogHeader>
            {subjectList(editSubjects, (id) => setEditSubjects(toggle(editSubjects, id)))}
            <Button onClick={saveSubjects} className="w-full">Salvar</Button>
          </DialogContent>
        </Dialog>

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
