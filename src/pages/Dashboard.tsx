import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, BookOpen, Users, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

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
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-white shadow-soft border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sistema Escolar</h1>
                <p className="text-sm text-muted-foreground">
                  Bem-vindo, {user?.user_metadata?.name || user?.email}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Escolha seu perfil para acessar as funcionalidades do sistema
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-medium transition-shadow cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Área do Professor</CardTitle>
              </div>
              <CardDescription>
                Gerencie turmas, alunos e lance notas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Cadastrar e gerenciar turmas
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Adicionar e editar alunos
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Lançar notas e frequência
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Gerar relatórios
                </li>
              </ul>
              <Button className="w-full" disabled>
                Em breve
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-shadow cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors">
                  <ClipboardList className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle className="text-xl">Área do Aluno</CardTitle>
              </div>
              <CardDescription>
                Visualize suas notas e acompanhe seu progresso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                  Visualizar notas por matéria
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                  Acompanhar progresso
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                  Histórico escolar completo
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                  Download de boletins
                </li>
              </ul>
              <Button variant="secondary" className="w-full" disabled>
                Em breve
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Próximas Funcionalidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O sistema está em desenvolvimento. Em breve você poderá acessar todas as funcionalidades
              de gestão escolar, incluindo controle de turmas, lançamento de notas, visualização de
              boletins e muito mais.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
