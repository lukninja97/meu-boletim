import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const CreateSchema = z.object({
  action: z.literal('create'),
  role: z.enum(['professor', 'coordenador']),
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
})
const ListSchema = z.object({ action: z.literal('list') })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const body = await req.json().catch(() => ({}))

    // Caller (may be absent only for bootstrapping the very first coordinator)
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(jwt)
    let isCoord = false
    if (user) {
      const { data } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'coordenador').maybeSingle()
      isCoord = !!data
    }

    if (body.action === 'list') {
      if (!ListSchema.safeParse(body).success) return json({ error: 'Requisição inválida' }, 400)
      if (!isCoord) return json({ error: 'Apenas coordenadores' }, 403)
      const { data: roles } = await admin.from('user_roles').select('user_id').eq('role', 'professor')
      const ids = (roles ?? []).map((r) => r.user_id)
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const teachers = (list?.users ?? [])
        .filter((u) => ids.includes(u.id))
        .map((u) => ({
          id: u.id,
          email: u.email,
          full_name: (u.user_metadata?.full_name ?? u.user_metadata?.name ?? '') as string,
          must_change_password: !!u.app_metadata?.must_change_password,
          created_at: u.created_at,
        }))
      return json({ teachers })
    }

    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) return json({ error: 'Dados inválidos: confira nome, e-mail e senha (mínimo 6 caracteres)' }, 400)
    const { role, full_name, email, password } = parsed.data

    if (!isCoord) {
      // Bootstrap: allow creating a coordinator only while none exists
      const { count } = await admin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'coordenador')
      if (!(role === 'coordenador' && (count ?? 0) === 0)) return json({ error: 'Apenas coordenadores' }, 403)
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name },
      app_metadata: { must_change_password: true },
    })
    if (error || !created.user) {
      const msg = error?.message?.includes('already') ? 'Este e-mail já está cadastrado' : (error?.message ?? 'Falha ao criar')
      return json({ error: msg }, 400)
    }
    const { error: roleErr } = await admin.from('user_roles').insert({ user_id: created.user.id, role })
    if (roleErr) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: 'Falha ao atribuir perfil' }, 500)
    }
    return json({ success: true, id: created.user.id })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro' }, 500)
  }
})
