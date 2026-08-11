import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !user) throw new Error('Authentication failed')

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (!roles?.some((r: { role: string }) => r.role === 'superuser')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const userId = body.userId ? String(body.userId) : ''
    const email = body.email ? String(body.email).trim().toLowerCase() : ''

    if (!userId && !email) {
      return new Response(JSON.stringify({ error: 'userId or email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let targetId = userId
    if (!targetId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers()
      const found = list?.users?.find((u: any) => (u.email || '').toLowerCase() === email)
      targetId = found?.id ?? ''
    }

    if (targetId === user.id) {
      return new Response(JSON.stringify({ error: 'You cannot delete your own account' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (targetId) {
      const { data: targetRoles } = await supabaseAdmin
        .from('user_roles').select('role').eq('user_id', targetId)
      if (targetRoles?.some((r: { role: string }) => r.role === 'superuser')) {
        return new Response(JSON.stringify({ error: 'Cannot delete a superuser account' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Clean up dependent data
      await supabaseAdmin.from('clients').delete().eq('client_user_id', targetId)
      await supabaseAdmin.from('clients').delete().eq('user_id', targetId)
      await supabaseAdmin.from('user_roles').delete().eq('user_id', targetId)
      await supabaseAdmin.from('profiles').delete().eq('id', targetId)
      await supabaseAdmin.from('pending_users').delete().eq('requested_by_user_id', targetId)

      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(targetId)
      if (delError && (delError as any).status !== 404) throw delError
    }

    if (email) {
      await supabaseAdmin.from('pending_users').delete().eq('email', email)
      await supabaseAdmin.from('password_reset_otps').delete().eq('email', email)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('delete-user failed:', (error as Error).message)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
