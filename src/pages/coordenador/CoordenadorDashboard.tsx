import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, ClipboardList, LogOut, UserPlus, Clock, Award } from "lucide-react";

const items = [
  { path: "/professor/cursos", title: "Cursos", desc: "Cadastre cursos, semestres e grade", icon: GraduationCap },
  { path: "/professor/materias", title: "Matérias", desc: "Cadastre matérias e carga horária", icon: BookOpen },
  { path: "/professor/turmas", title: "Turmas", desc: "Visualizar turmas", icon: Users },
  { path: "/professor/alunos", title: "Alunos", desc: "Visualizar alunos", icon: UserPlus },
  { path: "/professor/notas", title: "Notas", desc: "Visualizar notas", icon: Award },
  { path: "/professor/presenca", title: "Presença", desc: "Visualizar frequência", icon: ClipboardList },
  { path: "/professor/horarios", title: "Horário", desc: "Visualizar horários", icon: Clock },
];

const CoordenadorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      setUser(session?.user ?? null);
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Área do Coordenador</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(({ path, title, desc, icon: Icon }) => (
            <Card key={path} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(path)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" /> {title}
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CoordenadorDashboard;
