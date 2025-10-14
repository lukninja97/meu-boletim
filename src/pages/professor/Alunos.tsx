import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, user_roles!inner(role)")
      .eq("user_roles.role", "aluno")
      .order("full_name", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar alunos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Buscar emails dos usuários
      const studentsWithEmail = await Promise.all(
        (data || []).map(async (student) => {
          const { data: userData } = await supabase.auth.admin.getUserById(student.id);
          return {
            ...student,
            email: userData.user?.email,
          };
        })
      );
      setStudents(studentsWithEmail as Student[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        toast({
          title: "Erro ao criar aluno",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      if (!authData.user) {
        toast({
          title: "Erro ao criar aluno",
          description: "Não foi possível criar o usuário",
          variant: "destructive",
        });
        return;
      }

      // Atribuir role de aluno
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "aluno",
      });

      if (roleError) {
        toast({
          title: "Erro ao atribuir perfil de aluno",
          description: roleError.message,
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
      toast({
        title: "Erro ao cadastrar aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
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
              <CardTitle>Alunos</CardTitle>
              <CardDescription>Lista de todos os alunos cadastrados</CardDescription>
            </div>
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
