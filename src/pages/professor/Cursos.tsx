import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Course { id: string; name: string; code: string; total_semesters: number }
interface Subject { id: string; name: string; code: string }
interface CourseSubject { id: string; course_id: string; semester_number: number; subject_id: string }

const emptyForm = { name: "", code: "", total_semesters: 2 };

const Cursos = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [links, setLinks] = useState<CourseSubject[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [grid, setGrid] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: s }, { data: l }] = await Promise.all([
      supabase.from("courses").select("id, name, code, total_semesters").order("name"),
      supabase.from("subjects").select("id, name, code").order("name"),
      supabase.from("course_subjects").select("id, course_id, semester_number, subject_id"),
    ]);
    setCourses(c || []);
    setSubjects(s || []);
    setLinks(l || []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setGrid({}); setOpen(true); };
  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({ name: c.name, code: c.code, total_semesters: c.total_semesters });
    const g: Record<number, string[]> = {};
    links.filter((l) => l.course_id === c.id).forEach((l) => { (g[l.semester_number] ||= []).push(l.subject_id); });
    setGrid(g);
    setOpen(true);
  };

  const toggle = (sem: number, sid: string) => {
    const cur = grid[sem] || [];
    setGrid({ ...grid, [sem]: cur.includes(sid) ? cur.filter((x) => x !== sid) : [...cur, sid] });
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim() || form.total_semesters < 1) {
      return toast({ title: "Preencha nome, sigla e semestres", variant: "destructive" });
    }
    setSaving(true);
    let courseId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("courses").update(form).eq("id", editing.id);
      if (error) { setSaving(false); return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); }
    } else {
      const { data, error } = await supabase.from("courses").insert(form).select("id").single();
      if (error || !data) { setSaving(false); return toast({ title: "Erro ao criar", description: error?.message, variant: "destructive" }); }
      courseId = data.id;
    }
    const wanted: { semester_number: number; subject_id: string }[] = [];
    for (let s = 1; s <= form.total_semesters; s++) (grid[s] || []).forEach((sid) => wanted.push({ semester_number: s, subject_id: sid }));
    const current = links.filter((l) => l.course_id === courseId);
    const toRemove = current.filter((c) => !wanted.some((w) => w.semester_number === c.semester_number && w.subject_id === c.subject_id));
    const toAdd = wanted.filter((w) => !current.some((c) => w.semester_number === c.semester_number && w.subject_id === c.subject_id));
    if (toRemove.length) await supabase.from("course_subjects").delete().in("id", toRemove.map((r) => r.id));
    if (toAdd.length) {
      const { error } = await supabase.from("course_subjects").insert(toAdd.map((a) => ({ ...a, course_id: courseId! })));
      if (error) toast({ title: "Erro na grade", description: error.message, variant: "destructive" });
    }
    setSaving(false);
    setOpen(false);
    toast({ title: "Curso salvo" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este curso? As turmas continuam existindo.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    load();
  };

  const semesters = Array.from({ length: Math.max(1, form.total_semesters || 1) }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Cursos</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cursos</CardTitle>
              <CardDescription>Cada curso tem seus semestres e as matérias de cada semestre</CardDescription>
            </div>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Curso</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.code}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {Array.from({ length: c.total_semesters }, (_, i) => i + 1).map((s) => (
                          <div key={s} className="flex flex-wrap items-center gap-1 text-sm">
                            <span className="text-muted-foreground w-10">{s}º:</span>
                            {links.filter((l) => l.course_id === c.id && l.semester_number === s).map((l) => (
                              <Badge key={l.id} variant="secondary">{subjects.find((x) => x.id === l.subject_id)?.code}</Badge>
                            ))}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {courses.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum curso cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Curso" : "Novo Curso"}</DialogTitle>
              <DialogDescription>Informe o curso e marque as matérias de cada semestre</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="cname">Nome do Curso</Label>
                <Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ccode">Sigla</Label>
                <Input id="ccode" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label htmlFor="csem">Semestres</Label>
                <Input id="csem" type="number" min={1} max={12} value={form.total_semesters}
                  onChange={(e) => setForm({ ...form, total_semesters: Math.min(12, parseInt(e.target.value) || 1) })} />
              </div>
            </div>
            <Tabs defaultValue="1">
              <TabsList className="flex-wrap h-auto">
                {semesters.map((s) => (
                  <TabsTrigger key={s} value={String(s)}>{s}º Semestre ({(grid[s] || []).length})</TabsTrigger>
                ))}
              </TabsList>
              {semesters.map((s) => (
                <TabsContent key={s} value={String(s)}>
                  <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                    {subjects.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma matéria cadastrada</p>}
                    {subjects.map((sub) => (
                      <label key={sub.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-muted">
                        <Checkbox checked={(grid[s] || []).includes(sub.id)} onCheckedChange={() => toggle(s, sub.id)} />
                        {sub.name} <span className="text-muted-foreground">({sub.code})</span>
                      </label>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            <Button onClick={save} disabled={saving} className="w-full">{saving ? "Salvando..." : "Salvar Curso"}</Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Cursos;
