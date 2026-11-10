import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CheckCheck, Save, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Block { order_index: number; subject_id: string; lessons_count: number; code: string; name: string }
interface Student { id: string; full_name: string }
type Missed = Record<string, number[]>; // studentId -> missed per block index

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const today = () => new Date().toLocaleDateString("sv-SE");

const Presenca = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [missed, setMissed] = useState<Missed>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dow = useMemo(() => new Date(date + "T12:00:00").getDay(), [date]);

  useEffect(() => {
    supabase.from("classes").select("id,name").order("name").then(({ data }) => setClasses(data || []));
  }, []);

  useEffect(() => {
    if (classId && date) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  const load = async () => {
    setLoading(true);
    const [sch, enr, subs, cs] = await Promise.all([
      supabase.from("class_schedules").select("*").eq("class_id", classId).eq("day_of_week", dow).order("order_index"),
      supabase.from("enrollments").select("student_id").eq("class_id", classId).eq("status", "active"),
      supabase.from("subjects").select("id,name,code"),
      supabase.from("class_subjects").select("id,subject_id").eq("class_id", classId),
    ]);
    const subMap = new Map((subs.data || []).map((s) => [s.id, s]));
    const bl: Block[] = (sch.data || [])
      .filter((b) => b.lessons_count > 0)
      .map((b) => ({ order_index: b.order_index, subject_id: b.subject_id, lessons_count: b.lessons_count, code: subMap.get(b.subject_id)?.code || "?", name: subMap.get(b.subject_id)?.name || "" }));
    const ids = (enr.data || []).map((e) => e.student_id);
    let st: Student[] = [];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      st = (data || []).sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    // existing attendance
    const csIds = (cs.data || []).map((c) => c.id);
    const csToSubject = new Map((cs.data || []).map((c) => [c.id, c.subject_id]));
    const existing = new Map<string, number>(); // student|subject -> missed
    if (csIds.length && ids.length) {
      const { data } = await supabase.from("attendance").select("student_id,class_subject_id,missed_classes").eq("attendance_date", date).in("class_subject_id", csIds);
      (data || []).forEach((a) => existing.set(`${a.student_id}|${csToSubject.get(a.class_subject_id)}`, a.missed_classes));
    }
    const m: Missed = {};
    st.forEach((s) => {
      const remaining = new Map<string, number>();
      m[s.id] = bl.map((b) => {
        const key = `${s.id}|${b.subject_id}`;
        if (!existing.has(key)) return 0;
        const left = remaining.has(b.subject_id) ? remaining.get(b.subject_id)! : existing.get(key)!;
        const v = Math.min(left, b.lessons_count);
        remaining.set(b.subject_id, left - v);
        return v;
      });
    });
    setBlocks(bl);
    setStudents(st);
    setMissed(m);
    setLoading(false);
  };

  const setRow = (sid: string, fn: (b: Block, i: number) => number) =>
    setMissed((p) => ({ ...p, [sid]: blocks.map(fn) }));

  const setCell = (sid: string, i: number, v: number) =>
    setMissed((p) => ({ ...p, [sid]: p[sid].map((x, j) => (j === i ? Math.max(0, Math.min(blocks[i].lessons_count, v)) : x)) }));

  const allPresent = () => {
    const m: Missed = {};
    students.forEach((s) => (m[s.id] = blocks.map(() => 0)));
    setMissed(m);
  };

  const statusFor = (row: number[], i: number) => {
    const missedHere = row[i];
    if (missedHere === 0) return "presente";
    if (missedHere === blocks[i].lessons_count) {
      const before = row.slice(0, i).some((x, j) => x < blocks[j].lessons_count);
      const after = row.slice(i + 1).some((x, j) => x < blocks[i + 1 + j].lessons_count);
      if (!before && after) return "atraso";
      if (before && !after) return "saida_antecipada";
      return "falta";
    }
    return "parcial";
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: cs } = await supabase.from("class_subjects").select("id,subject_id").eq("class_id", classId);
      const map = new Map((cs || []).map((c) => [c.subject_id, c.id]));
      for (const sid of new Set(blocks.map((b) => b.subject_id))) {
        if (!map.has(sid)) {
          const { data, error } = await supabase.from("class_subjects").insert({ class_id: classId, subject_id: sid }).select("id").single();
          if (error) throw error;
          map.set(sid, data.id);
        }
      }
      const rows: any[] = [];
      students.forEach((s) => {
        const row = missed[s.id] || [];
        const agg = new Map<string, { total: number; missed: number; statuses: string[] }>();
        blocks.forEach((b, i) => {
          const a = agg.get(b.subject_id) || { total: 0, missed: 0, statuses: [] };
          a.total += b.lessons_count;
          a.missed += row[i] || 0;
          a.statuses.push(statusFor(row, i));
          agg.set(b.subject_id, a);
        });
        agg.forEach((a, subId) => {
          const status = a.missed === 0 ? "presente" : a.statuses.find((x) => x !== "presente") || "falta";
          rows.push({
            student_id: s.id,
            class_subject_id: map.get(subId),
            attendance_date: date,
            total_classes: a.total,
            missed_classes: a.missed,
            present: a.missed < a.total,
            status,
          });
        });
      });
      const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,class_subject_id,attendance_date" });
      if (error) throw error;
      toast({ title: "Chamada salva", description: `${students.length} alunos registrados.` });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const totalLessons = blocks.reduce((a, b) => a + b.lessons_count, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/professor")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Lançar Presença</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardContent className="pt-6 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Escolha a turma" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <p className="h-10 flex items-center font-medium">{DAYS[dow]}</p>
            </div>
          </CardContent>
        </Card>

        {classId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Chamada</CardTitle>
                <CardDescription>
                  {blocks.length ? `${blocks.length} blocos, ${totalLessons} aulas no dia. Digite as faltas de cada bloco ou use os atalhos.` : ""}
                </CardDescription>
              </div>
              {blocks.length > 0 && students.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={allPresent}><CheckCheck className="mr-2 h-4 w-4" />Todos presentes</Button>
                  <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar Chamada"}</Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : blocks.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma aula cadastrada para {DAYS[dow]} nesta turma. Defina em Horários.</p>
              ) : students.length === 0 ? (
                <p className="text-muted-foreground">Nenhum aluno matriculado nesta turma.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        {blocks.map((b, i) => (
                          <TableHead key={i} className="text-center" title={b.name}>
                            {i + 1}º {b.code}<br /><span className="text-xs font-normal">{b.lessons_count} aulas</span>
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Assistidas</TableHead>
                        <TableHead>Atalhos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((s) => {
                        const row = missed[s.id] || [];
                        const totalMissed = row.reduce((a, b) => a + b, 0);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium whitespace-nowrap">{s.full_name}</TableCell>
                            {blocks.map((b, i) => {
                              const m = row[i] || 0;
                              const tone = m === 0 ? "bg-secondary/15 text-secondary" : m === b.lessons_count ? "bg-destructive/15 text-destructive" : "bg-accent text-accent-foreground";
                              return (
                                <TableCell key={i} className="text-center">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className={`rounded-md px-3 py-1 text-sm font-medium ${tone}`}>
                                        {b.lessons_count - m}/{b.lessons_count}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 space-y-3">
                                      <p className="text-sm font-medium">{b.name}</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-xs">Assistidas</Label>
                                          <Input type="number" min={0} max={b.lessons_count} value={b.lessons_count - m} onChange={(e) => setCell(s.id, i, b.lessons_count - Number(e.target.value))} />
                                        </div>
                                        <div>
                                          <Label className="text-xs">Faltas</Label>
                                          <Input type="number" min={0} max={b.lessons_count} value={m} onChange={(e) => setCell(s.id, i, Number(e.target.value))} />
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center font-medium">{totalLessons - totalMissed}/{totalLessons}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">Ocorrência <ChevronDown className="ml-1 h-3 w-3" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setRow(s.id, () => 0)}>Presente o dia todo</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRow(s.id, (b) => b.lessons_count)}>Falta o dia todo</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Chegou atrasado — entrou no:</DropdownMenuLabel>
                                  {blocks.slice(1).map((b, k) => (
                                    <DropdownMenuItem key={`a${k}`} onClick={() => setRow(s.id, (bb, i) => (i < k + 1 ? bb.lessons_count : 0))}>
                                      {k + 2}º bloco ({b.code})
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Saiu mais cedo — ficou até o:</DropdownMenuLabel>
                                  {blocks.slice(0, -1).map((b, k) => (
                                    <DropdownMenuItem key={`s${k}`} onClick={() => setRow(s.id, (bb, i) => (i > k ? bb.lessons_count : 0))}>
                                      {k + 1}º bloco ({b.code})
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

export default Presenca;
