import { supabase } from "@/integrations/supabase/client";

export type AppRole = "coordenador" | "professor" | "aluno";

/** Home page for a user by role priority: coordenador > professor > aluno. */
export async function homeForUser(userId: string): Promise<string> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (roles.includes("coordenador")) return "/coordenador";
  if (roles.includes("professor")) return "/professor";
  if (roles.includes("aluno")) return "/aluno";
  return "/dashboard";
}
