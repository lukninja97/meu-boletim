import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Student {
  id: string;
  full_name: string;
  email?: string;
}

const Alunos = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-students');

      if (error) {
        console.error('Error fetching students:', error);
        toast({
          title: "Erro ao carregar alunos",
          description: error.message,
          variant: "destructive",
        });
        setStudents([]);
      } else {
        setStudents(data.students || []);
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro ao carregar alunos",
        description: error.message,
        variant: "destructive",
      });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.functions.invoke('create-student', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
        },
      });

      if (error) {
        console.error('Error creating student:', error);
        
        // Tratamento específico para email duplicado
        const errorMessage = error.message.toLowerCase().includes('already registered') || 
                            error.message.toLowerCase().includes('email') 
          ? "Email já cadastrado. Use outro endereço."
          : error.message;
        
        toast({
          title: "Erro ao criar aluno",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Aluno cadastrado com sucesso!",
        description: "O aluno pode fazer login com as credenciais fornecidas.",
      });

      setOpen(false);
      setFormData({ full_name: "", email: "", password: "" });
      fetchStudents();
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro ao cadastrar aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('delete-student', {
        body: { user_id: id },
      });

      if (error) {
        console.error('Error deleting student:', error);
        toast({
          title: "Erro ao excluir aluno",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Aluno excluído com sucesso",
        });
        fetchStudents();
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro ao excluir aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const pick = (r: Record<string, any>, keys: string[]) => {
        const k = Object.keys(r).find((x) => keys.includes(norm(x)));
        return k ? String(r[k]).trim() : "";
      };
      let ok = 0;
      const fails: string[] = [];
      for (const [i, r] of rows.entries()) {
        const full_name = pick(r, ["nome", "nome completo", "name", "full_name"]);
        const email = pick(r, ["email", "e-mail"]);
        const password = pick(r, ["senha", "password"]);
        if (!full_name || !email || password.length < 6) {
          fails.push(`Linha ${i + 2}: dados incompletos (senha mín. 6)`);
          continue;
        }
        const { error } = await supabase.functions.invoke("create-student", { body: { full_name, email, password } });
        if (error) fails.push(`Linha ${i + 2} (${email}): não cadastrado`);
        else ok++;
      }
      toast({
        title: `${ok} aluno(s) cadastrado(s)`,
        description: fails.length ? `${fails.length} com erro: ${fails.slice(0, 3).join("; ")}${fails.length > 3 ? "..." : ""}` : "Importação concluída.",
        variant: fails.length && !ok ? "destructive" : "default",
      });
      fetchStudents();
    } catch (err: any) {
      toast({ title: "Erro ao ler arquivo", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
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
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Alunos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Alunos
                <Badge variant="secondary">{students.length}</Badge>
              </CardTitle>
              <CardDescription>
                {students.length === 1
                  ? "1 aluno cadastrado"
                  : `${students.length} alunos cadastrados`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button variant="outline" disabled={importing} onClick={() => fileRef.current?.click()} title="Colunas: nome, email, senha">
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importando..." : "Importar CSV/Excel"}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Aluno
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
                  <DialogDescription>Preencha os dados do novo aluno</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full">Cadastrar Aluno</Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(student.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum aluno cadastrado
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

export default Alunos;
