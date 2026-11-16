import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ error: 'Não autenticado' }, 401)
    const parsed = z.object({ password: z.string().min(6).max(72) }).safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return json({ error: 'A senha precisa ter pelo menos 6 caracteres' }, 400)
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: parsed.data.password,
      app_metadata: { ...user.app_metadata, must_change_password: false },
    })
    if (error) return json({ error: error.message }, 400)
    return json({ success: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro' }, 500)
  }
})
