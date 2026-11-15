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
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { lessonsFromHours } from "@/lib/workload";

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  workload_hours: number | null;
  total_lessons: number | null;
}

const Materias = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    workload_hours: "",
  });
  const [editing, setEditing] = useState<Subject | null>(null);
  const [editHours, setEditHours] = useState("");

  const saveHours = async () => {
    if (!editing) return;
    const h = parseInt(editHours);
    if (!h || h <= 0) {
      toast({ title: "Informe uma carga horária válida", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("subjects").update({ workload_hours: h }).eq("id", editing.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Carga horária atualizada" });
      setEditing(null);
      fetchSubjects();
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar matérias",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSubjects(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("subjects").insert({
      name: formData.name,
      code: formData.code,
      description: formData.description || null,
      workload_hours: parseInt(formData.workload_hours),
    });

    if (error) {
      toast({
        title: "Erro ao criar matéria",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Matéria criada com sucesso!",
      });
      setOpen(false);
      setFormData({ name: "", code: "", description: "", workload_hours: "" });
      fetchSubjects();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    
    if (error) {
      toast({
        title: "Erro ao excluir matéria",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Matéria excluída com sucesso",
      });
      fetchSubjects();
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
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Matérias</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Matérias</CardTitle>
              <CardDescription>Lista de todas as matérias cadastradas</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Matéria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Matéria</DialogTitle>
                  <DialogDescription>Preencha os dados da nova matéria</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Matéria</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Código</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="hours">Carga Horária (horas)</Label>
                    <Input
                      id="hours"
                      type="number"
                      min={1}
                      value={formData.workload_hours}
                      onChange={(e) => setFormData({ ...formData, workload_hours: e.target.value })}
                      required
                    />
                    {Number(formData.workload_hours) > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Equivale a <strong>{lessonsFromHours(Number(formData.workload_hours))} aulas</strong> de 45 minutos
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Criar Matéria</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Carga Horária</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.code}</TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>
                      {subject.workload_hours
                        ? `${subject.workload_hours}h (${subject.total_lessons} aulas)`
                        : <span className="text-muted-foreground">Não definida</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{subject.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar carga horária"
                        onClick={() => { setEditing(subject); setEditHours(String(subject.workload_hours ?? "")); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(subject.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {subjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma matéria cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Carga Horária</DialogTitle>
              <DialogDescription>{editing?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="edit-hours">Carga Horária (horas)</Label>
              <Input id="edit-hours" type="number" min={1} value={editHours} onChange={(e) => setEditHours(e.target.value)} />
              {Number(editHours) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Equivale a <strong>{lessonsFromHours(Number(editHours))} aulas</strong> de 45 minutos
                </p>
              )}
            </div>
            <Button onClick={saveHours} className="w-full">Salvar</Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Materias;
