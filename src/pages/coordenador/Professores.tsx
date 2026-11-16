import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Teacher { id: string; email: string; full_name: string; must_change_password: boolean }

const Professores = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-staff", { body: { action: "list" } });
    if (error || data?.error) toast({ title: "Erro ao carregar professores", description: data?.error ?? error?.message, variant: "destructive" });
    setTeachers(data?.teachers ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("manage-staff", { body: { action: "create", role: "professor", ...form } });
    setSaving(false);
    if (error || data?.error) return toast({ title: "Erro ao cadastrar", description: data?.error ?? error?.message, variant: "destructive" });
    toast({ title: "Professor cadastrado", description: "Ele vai definir a própria senha no primeiro acesso." });
    setForm({ full_name: "", email: "", password: "" });
    setOpen(false);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/coordenador")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gerenciar Professores</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Novo Professor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Professor</DialogTitle>
                  <DialogDescription>A senha abaixo é só para o primeiro acesso. O professor define a dele ao entrar.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>Nome completo</Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Senha de primeiro acesso</Label>
                    <Input value={form.password} minLength={6} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
                  <Button type="submit" className="w-full" disabled={saving}>{saving ? "Cadastrando..." : "Cadastrar"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-muted-foreground">Carregando...</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.full_name || "-"}</TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>{t.must_change_password
                        ? <Badge variant="secondary">Aguardando primeiro acesso</Badge>
                        : <Badge>Ativo</Badge>}</TableCell>
                    </TableRow>
                  ))}
                  {teachers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum professor</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Professores;
