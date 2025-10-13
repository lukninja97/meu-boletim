import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Attendance {
  id: string;
  attendance_date: string;
  present: boolean;
  class_subject_id: string;
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  className?: string;
  subjectName?: string;
}

const MinhaFrequencia = () => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [classSubjects, setClassSubjects] = useState<{ [key: string]: ClassSubject }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", user.id)
      .order("attendance_date", { ascending: false });

    if (attendanceError) {
      toast({
        title: "Erro ao carregar frequência",
        description: attendanceError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setAttendance(attendanceData || []);

    // Buscar informações de turmas e matérias
    const classSubjectIds = attendanceData?.map(a => a.class_subject_id) || [];
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

  const calculateAttendanceRate = () => {
    if (attendance.length === 0) return 0;
    const presentCount = attendance.filter(a => a.present).length;
    return ((presentCount / attendance.length) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/aluno")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Minha Frequência</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Presença</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {calculateAttendanceRate()}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {attendance.filter(a => a.present).length} de {attendance.length} aulas
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Presença</CardTitle>
            <CardDescription>Registro de frequência em aulas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Matéria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => {
                  const cs = classSubjects[record.class_subject_id];
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{cs?.className || "-"}</TableCell>
                      <TableCell>{cs?.subjectName || "-"}</TableCell>
                      <TableCell>
                        {new Date(record.attendance_date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.present ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">Presente</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-red-600">Ausente</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {attendance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum registro de frequência encontrado
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

export default MinhaFrequencia;
