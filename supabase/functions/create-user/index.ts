import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'
import { sendEmail, invitationEmailHtml } from '../_shared/sendEmail.ts'
import { generateRegistrationLink } from '../_shared/inviteLink.ts'

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
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Not authenticated. Please sign in again.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: claimsData } = await supabaseAdmin.auth.getClaims(jwt)
    let callerId = (claimsData?.claims?.sub as string) ?? null
    if (!callerId) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(jwt)
      callerId = user?.id ?? null
    }
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Your session has expired. Please sign in again.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)

    if (!roles?.some((r: { role: string }) => r.role === 'superuser')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const fullName = String(body.fullName ?? '').trim()
    const role = String(body.role ?? '')

    if (!email || !email.includes('@') || email.length > 255) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!fullName || fullName.length > 255) {
      return new Response(JSON.stringify({ error: 'Full name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!['user', 'client'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const origin = req.headers.get('origin') ?? ''
    const redirectTo = `${origin}/set-password`

    const invite = await generateRegistrationLink(supabaseAdmin, { email, fullName, role, redirectTo })

    if (invite.error || !invite.userId || !invite.actionUrl) {
      return new Response(JSON.stringify({ error: invite.error ?? 'Failed to create registration link' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!invite.isNewUser) {
      return new Response(JSON.stringify({ error: 'A user with this email already exists' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = invite.userId

    await supabaseAdmin.from('profiles').upsert({
      id: newUserId, email, full_name: fullName, role,
    }, { onConflict: 'id' })

    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id, role')
      .eq('user_id', newUserId)
      .maybeSingle()

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUserId, role })
      if (roleError) throw roleError
    } else if (existingRole.role !== role && existingRole.role !== 'superuser') {
      await supabaseAdmin.from('user_roles').update({ role }).eq('id', existingRole.id)
    }

    const emailResult = await sendEmail({
      to: email,
      toName: fullName,
      subject: 'Complete your registration',
      html: invitationEmailHtml({
        fullName,
        email,
        actionUrl: invite.actionUrl,
        roleLabel: role === 'client' ? 'client' : 'admin',
      }),
    })

    return new Response(JSON.stringify({
      success: true,
      userId: newUserId,
      emailSent: emailResult.sent,
      emailError: emailResult.error ?? null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('create-user failed:', (error as Error).message)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
