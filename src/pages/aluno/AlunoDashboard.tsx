import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, BookOpen, GraduationCap, CalendarCheck, ClipboardList } from "lucide-react";
import { toast } from "sonner";

const AlunoDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (!roles?.some(r => r.role === "aluno")) {
        toast.error("Você não tem permissão para acessar esta área");
        navigate("/dashboard");
      }
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Logout realizado com sucesso!");
  };

  const menuItems = [
    {
      title: "Minhas Turmas",
      description: "Visualize as turmas em que você está matriculado",
      icon: BookOpen,
      route: "/aluno/turmas",
      color: "primary",
    },
    {
      title: "Minhas Notas",
      description: "Acompanhe suas notas e desempenho",
      icon: ClipboardList,
      route: "/aluno/notas",
      color: "secondary",
    },
    {
      title: "Minha Frequência",
      description: "Consulte seu histórico de presença",
      icon: CalendarCheck,
      route: "/aluno/frequencia",
      color: "accent",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleLogout} className="mb-2">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Área do Aluno</h1>
              <p className="text-sm text-muted-foreground">Acesse suas informações acadêmicas</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card
              key={item.route}
              className="hover:shadow-medium transition-shadow cursor-pointer group"
              onClick={() => navigate(item.route)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 bg-${item.color}/10 rounded-lg group-hover:bg-${item.color}/20 transition-colors`}>
                    <item.icon className={`w-6 h-6 text-${item.color}`} />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AlunoDashboard;
