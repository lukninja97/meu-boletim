import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { absencePercent, absenceTone } from "@/lib/absence";

interface SubjectRow { subjectId: string; name: string; code: string; pct: number }
interface TurmaCard { classId: string; name: string; course: string | null; year: number; semester: number; subjects: SubjectRow[] }

const MinhaFrequencia = () => {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<TurmaCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: enr, error } = await supabase.from("enrollments").select("class_id").eq("student_id", user.id);
    if (error) {
      toast({ title: "Erro ao carregar frequência", description: error.message, variant: "destructive" });
      setLoading(false); return;
    }
    const classIds = Array.from(new Set((enr || []).map(e => e.class_id)));
    if (!classIds.length) { setLoading(false); return; }

    const [{ data: classes }, { data: links }] = await Promise.all([
      supabase.from("classes").select("id, name, course, year, semester").in("id", classIds),
      supabase.from("class_subjects").select("id, class_id, subject_id").in("class_id", classIds),
    ]);
    const csIds = (links || []).map(l => l.id);
    const subjIds = Array.from(new Set((links || []).map(l => l.subject_id)));
    const [{ data: att }, { data: subjects }] = await Promise.all([
      csIds.length ? supabase.from("attendance").select("class_subject_id, total_classes, missed_classes").eq("student_id", user.id).in("class_subject_id", csIds) : Promise.resolve({ data: [] as any[] }),
      subjIds.length ? supabase.from("subjects").select("id, name, code, total_lessons").in("id", subjIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const subjMap: Record<string, any> = {};
    (subjects || []).forEach((s: any) => { subjMap[s.id] = s; });
    const agg: Record<string, { missed: number; given: number }> = {};
    (att || []).forEach((a: any) => {
      const x = (agg[a.class_subject_id] ||= { missed: 0, given: 0 });
      x.missed += a.missed_classes || 0; x.given += a.total_classes || 0;
    });

    setTurmas((classes || []).map((c: any) => ({
      classId: c.id, name: c.name, course: c.course ?? null, year: c.year, semester: c.semester,
      subjects: (links || []).filter(l => l.class_id === c.id).map(l => {
        const s = subjMap[l.subject_id]; const a = agg[l.id] || { missed: 0, given: 0 };
        return { subjectId: l.subject_id, name: s?.name || "-", code: s?.code || "-", pct: absencePercent(a.missed, s?.total_lessons ?? null, a.given) };
      }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/aluno")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Minha Frequência</h1>
          <p className="text-sm text-muted-foreground">Porcentagem de ausência por turma e matéria</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {turmas.length === 0 ? (
          <Card><CardHeader><CardTitle>Nenhuma turma vinculada</CardTitle>
            <CardDescription>Você ainda não está matriculado em nenhuma turma. Fale com a secretaria.</CardDescription></CardHeader></Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {turmas.map(t => (
              <Card key={t.classId} className="h-full">
                <CardHeader className="bg-muted/40">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <CardDescription>{t.course ? `${t.course} · ` : ""}{t.year} · {t.semester}º semestre</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <ul className="divide-y divide-border">
                    {t.subjects.map(s => (
                      <li key={s.subjectId} className="flex items-center justify-between gap-3 py-3">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate font-medium text-foreground">{s.name}</span>
                          <span className="text-xs text-muted-foreground">{s.code}</span>
                        </span>
                        <span className={`inline-flex min-w-14 justify-center rounded-lg px-3 py-1 text-base font-bold ${absenceTone(s.pct)}`}>{s.pct}%</span>
                      </li>
                    ))}
                    {t.subjects.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nenhuma matéria vinculada a esta turma</li>}
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

export default MinhaFrequencia;
