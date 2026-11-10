import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, ClipboardList, LogOut, UserPlus, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ProfessorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado com sucesso",
      description: "Até logo!",
    });
    navigate("/auth");
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Área do Professor</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/professor/alunos")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Alunos
              </CardTitle>
              <CardDescription>Gerenciar alunos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Cadastre e gerencie alunos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/professor/turmas")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Turmas
              </CardTitle>
              <CardDescription>Gerenciar turmas e matrículas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Cadastre e gerencie suas turmas</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/professor/materias")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-secondary" />
                Matérias
              </CardTitle>
              <CardDescription>Gerenciar matérias</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Cadastre e vincule matérias às turmas</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/professor/notas")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-accent" />
                Notas
              </CardTitle>
              <CardDescription>Lançar e consultar notas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Registre as notas dos alunos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/professor/presenca")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Presença
              </CardTitle>
              <CardDescription>Registrar frequência</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Controle a presença dos alunos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/professor/horarios")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                Horário
              </CardTitle>
              <CardDescription>Aulas por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Defina quantas aulas de cada matéria por dia</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProfessorDashboard;
