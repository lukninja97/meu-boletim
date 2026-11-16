import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { homeForUser } from "@/lib/roles";
import { KeyRound } from "lucide-react";

const PrimeiroAcesso = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast({ title: "A senha precisa ter pelo menos 6 caracteres", variant: "destructive" });
    if (password !== confirm) return toast({ title: "As senhas não conferem", variant: "destructive" });
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("complete-first-access", { body: { password } });
    if (error || data?.error) {
      setSaving(false);
      return toast({ title: "Erro ao salvar senha", description: data?.error ?? error?.message, variant: "destructive" });
    }
    await supabase.auth.refreshSession();
    const { data: { user } } = await supabase.auth.getUser();
    toast({ title: "Senha definida com sucesso!" });
    navigate(user ? await homeForUser(user.id) : "/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Primeiro acesso</CardTitle>
          <CardDescription>Defina a sua própria senha para continuar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Nova senha</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirmar senha</Label>
              <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando..." : "Salvar senha"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrimeiroAcesso;
