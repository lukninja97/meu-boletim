import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify the requesting user is a professor
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('User authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'professor')
      .single()

    if (!roleData) {
      console.error('User is not a professor')
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only professors can list students' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log('Fetching students list')

    // Get all users with student role
    const { data: studentRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'aluno')

    if (rolesError) {
      console.error('Error fetching student roles:', rolesError)
      return new Response(
        JSON.stringify({ error: rolesError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!studentRoles || studentRoles.length === 0) {
      return new Response(
        JSON.stringify({ students: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const userIds = studentRoles.map(r => r.user_id)

    // Get profiles for all students
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
      .order('full_name', { ascending: true })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch emails using admin API
    const studentsWithEmail = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        
        if (userError) {
          console.error(`Error fetching user ${profile.id}:`, userError)
        }
        
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: userData?.user?.email || 'N/A'
        }
      })
    )

    console.log(`Successfully fetched ${studentsWithEmail.length} students`)

    return new Response(
      JSON.stringify({ students: studentsWithEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
