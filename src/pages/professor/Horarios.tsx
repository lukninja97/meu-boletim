import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
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
type Block = { subject_id: string; lessons_count: number };

const Horarios = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [days, setDays] = useState<Record<number, Block[]>>({});
  const [day, setDay] = useState(1);
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
      const { data: sched } = await supabase
        .from("class_schedules")
        .select("subject_id, day_of_week, lessons_count, order_index")
        .eq("class_id", classId)
        .gt("lessons_count", 0)
        .order("order_index");
      const d: Record<number, Block[]> = {};
      (sched || []).forEach((s) => {
        (d[s.day_of_week] ||= []).push({ subject_id: s.subject_id, lessons_count: s.lessons_count });
      });
      setDays(d);
    })();
  }, [classId]);

  const blocks = days[day] || [];
  const update = (fn: (b: Block[]) => Block[]) => setDays((d) => ({ ...d, [day]: fn([...(d[day] || [])]) }));

  const move = (i: number, dir: -1 | 1) =>
    update((b) => {
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      [b[i], b[j]] = [b[j], b[i]];
      return b;
    });

  const save = async () => {
    setSaving(true);
    const { error: delErr } = await supabase.from("class_schedules").delete().eq("class_id", classId);
    let error = delErr;
    if (!error) {
      const rows = DAYS.flatMap((d) =>
        (days[d.n] || [])
          .filter((b) => b.subject_id && b.lessons_count > 0)
          .map((b, i) => ({ class_id: classId, subject_id: b.subject_id, day_of_week: d.n, lessons_count: b.lessons_count, order_index: i + 1 }))
      );
      if (rows.length) ({ error } = await supabase.from("class_schedules").insert(rows));
    }
    setSaving(false);
    toast(error ? { title: "Erro ao salvar", description: error.message, variant: "destructive" } : { title: "Horário salvo!" });
  };

  const total = (n: number) => (days[n] || []).reduce((a, b) => a + (b.lessons_count || 0), 0);

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
              <CardTitle>Ordem das aulas do dia</CardTitle>
              <Button onClick={save} disabled={saving || !subjects.length}>
                <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar Horário"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!subjects.length ? (
                <p className="text-muted-foreground">Esta turma não tem matérias vinculadas. Vincule pela página de Turmas.</p>
              ) : (
                <>
                  <Tabs value={String(day)} onValueChange={(v) => setDay(Number(v))}>
                    <TabsList className="flex-wrap h-auto">
                      {DAYS.map((d) => (
                        <TabsTrigger key={d.n} value={String(d.n)}>
                          {d.label} <span className="ml-1 text-muted-foreground">({total(d.n)})</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>

                  {blocks.length === 0 && <p className="text-muted-foreground">Nenhuma aula neste dia.</p>}

                  <div className="space-y-2">
                    {blocks.map((b, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                        <span className="w-8 text-center font-bold text-primary">{i + 1}º</span>
                        <Select value={b.subject_id} onValueChange={(v) => update((x) => { x[i] = { ...x[i], subject_id: v }; return x; })}>
                          <SelectTrigger className="w-64"><SelectValue placeholder="Matéria" /></SelectTrigger>
                          <SelectContent>
                            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" min={1} max={20} className="w-20 text-center" value={b.lessons_count}
                          onChange={(e) => update((x) => { x[i] = { ...x[i], lessons_count: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)) }; return x; })} />
                        <span className="text-sm text-muted-foreground">aulas</span>
                        <div className="ml-auto flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Descer"><ArrowDown className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => update((x) => x.filter((_, k) => k !== i))} aria-label="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => update((x) => [...x, { subject_id: "", lessons_count: 1 }])}>
                      <Plus className="mr-2 h-4 w-4" /> Adicionar bloco
                    </Button>
                    <span className="font-semibold">Total do dia: {total(day)} aulas</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Horarios;
