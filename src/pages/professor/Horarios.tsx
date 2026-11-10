import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DAYS = [
  { n: 1, label: "Segunda" },
  { n: 2, label: "Terça" },
  { n: 3, label: "Quarta" },
  { n: 4, label: "Quinta" },
  { n: 5, label: "Sexta" },
  { n: 6, label: "Sábado" },
];

type Subject = { id: string; name: string; code: string };

const Horarios = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grid, setGrid] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
  }, []);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      const { data: links } = await supabase.from("class_subjects").select("subject_id").eq("class_id", classId);
      const ids = (links || []).map((l) => l.subject_id);
      const { data: subs } = ids.length
        ? await supabase.from("subjects").select("id, name, code").in("id", ids).order("name")
        : { data: [] as Subject[] };
      setSubjects(subs || []);
      const { data: sched } = await supabase.from("class_schedules").select("subject_id, day_of_week, lessons_count").eq("class_id", classId);
      const g: Record<string, number> = {};
      (sched || []).forEach((s) => (g[`${s.subject_id}-${s.day_of_week}`] = s.lessons_count));
      setGrid(g);
    })();
  }, [classId]);

  const setCell = (sid: string, d: number, v: string) => {
    const n = Math.max(0, Math.min(20, parseInt(v) || 0));
    setGrid((g) => ({ ...g, [`${sid}-${d}`]: n }));
  };

  const save = async () => {
    setSaving(true);
    const rows = subjects.flatMap((s) =>
      DAYS.map((d) => ({ class_id: classId, subject_id: s.id, day_of_week: d.n, lessons_count: grid[`${s.id}-${d.n}`] || 0 }))
    );
    const { error } = await supabase.from("class_schedules").upsert(rows, { onConflict: "class_id,subject_id,day_of_week" });
    setSaving(false);
    toast(error ? { title: "Erro ao salvar", description: error.message, variant: "destructive" } : { title: "Horário salvo!" });
  };

  const total = (d: number) => subjects.reduce((acc, s) => acc + (grid[`${s.id}-${d}`] || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/professor")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Horários</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader><CardTitle>Escolha a turma</CardTitle></CardHeader>
          <CardContent>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="max-w-sm"><SelectValue placeholder="Selecione uma turma" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {classId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Aulas por dia</CardTitle>
              <Button onClick={save} disabled={saving || !subjects.length}>
                <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar Horário"}
              </Button>
            </CardHeader>
            <CardContent>
              {!subjects.length ? (
                <p className="text-muted-foreground">Esta turma não tem matérias vinculadas. Vincule pela página de Turmas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matéria</TableHead>
                        {DAYS.map((d) => <TableHead key={d.n} className="text-center">{d.label}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.code} <span className="text-muted-foreground font-normal">— {s.name}</span></TableCell>
                          {DAYS.map((d) => (
                            <TableCell key={d.n}>
                              <Input type="number" min={0} max={20} className="w-16 mx-auto text-center"
                                value={grid[`${s.id}-${d.n}`] ?? 0}
                                onChange={(e) => setCell(s.id, d.n, e.target.value)} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-semibold">Total de aulas</TableCell>
                        {DAYS.map((d) => <TableCell key={d.n} className="text-center font-semibold">{total(d.n)}</TableCell>)}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Horarios;
