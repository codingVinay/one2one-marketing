import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'
import { sendEmail, credentialsEmailHtml } from '../_shared/sendEmail.ts'


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Approve User Function Started ===')
    
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get auth header and verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      throw new Error('No authorization header')
    }

    // Create client with auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('User authentication failed:', userError)
      throw new Error('Authentication failed')
    }

    console.log('Authenticated user:', user.id)

    // Check if user is superuser
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (roleError) {
      console.error('Role check failed:', roleError)
      throw new Error('Database error checking permissions')
    }

    const hasSuperuserRole = userRoles?.some(role => role.role === 'superuser')
    if (!hasSuperuserRole) {
      console.error('User is not superuser. Roles:', userRoles)
      throw new Error('Insufficient permissions')
    }

    console.log('Superuser verified')

    // Get request data
    const { pendingUserId, assignToUserId } = await req.json()
    console.log('Processing pending user:', pendingUserId)
    console.log('Assigning to user:', assignToUserId)

    // Get pending user
    const { data: pendingUser, error: fetchError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .eq('id', pendingUserId)
      .single()

    if (fetchError || !pendingUser) {
      console.error('Failed to fetch pending user:', fetchError)
      throw new Error('Pending user not found')
    }

    console.log('Found pending user:', pendingUser.email)

    // Create (invite) or link auth user (idempotent). No password is set here —
    // the user chooses their own password via the registration link.
    console.log('Creating or linking user account...')
    const origin = req.headers.get('origin') ?? ''
    const redirectTo = `${origin}/set-password`

    const invite = await generateRegistrationLink(supabaseAdmin, {
      email: pendingUser.email,
      fullName: pendingUser.full_name || pendingUser.email,
      role: pendingUser.requested_role,
      redirectTo,
    })

    if (invite.error || !invite.userId) {
      throw new Error(invite.error ?? 'Failed to create registration link')
    }

    const authUserId: string | null = invite.userId
    const isNewUser = invite.isNewUser
    const actionUrl = invite.actionUrl



    if (!authUserId) {
      throw new Error('No auth user id available after create/link step')
    }

    // Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUserId,
        email: pendingUser.email,
        full_name: pendingUser.full_name || pendingUser.email,
        role: pendingUser.requested_role,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile upsert failed:', profileError)
      throw new Error(`Failed to upsert profile: ${profileError.message}`)
    }

    console.log('Profile ensured')

    // Ensure user role (one role per user: unique on user_id)
    const { data: existingRole, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('id, role')
      .eq('user_id', authUserId)
      .maybeSingle()

    if (roleCheckError) {
      console.error('Role check failed:', roleCheckError)
      throw new Error(`Database error checking existing role: ${roleCheckError.message}`)
    }

    if (!existingRole) {
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authUserId,
          role: pendingUser.requested_role,
        })
      if (roleInsertError) {
        console.error('Role creation failed:', roleInsertError)
        throw new Error(`Failed to create role: ${roleInsertError.message}`)
      }
      console.log('Role created')
    } else if (existingRole.role !== pendingUser.requested_role) {
      // Never downgrade a superuser
      if (existingRole.role === 'superuser') {
        throw new Error('Cannot change the role of a superuser account')
      }
      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: pendingUser.requested_role })
        .eq('id', existingRole.id)
      if (roleUpdateError) {
        console.error('Role update failed:', roleUpdateError)
        throw new Error(`Failed to update role: ${roleUpdateError.message}`)
      }
      console.log(`Role updated from ${existingRole.role} to ${pendingUser.requested_role}`)
    } else {
      console.log('Role already correct, skipping')
    }

    // Create or update client record if needed
    if (pendingUser.requested_role === 'client' && assignToUserId) {
      const { data: existingClient, error: existingClientError } = await supabaseAdmin
        .from('clients')
        .select('id, user_id')
        .eq('client_user_id', authUserId)
        .maybeSingle()

      if (existingClientError) {
        console.error('Client lookup failed:', existingClientError)
        throw new Error(`Failed to lookup existing client: ${existingClientError.message}`)
      }

      if (!existingClient) {
        const { error: clientError } = await supabaseAdmin
          .from('clients')
          .insert({
            name: pendingUser.full_name || pendingUser.email,
            email: pendingUser.email,
            user_id: assignToUserId,
            client_user_id: authUserId,
            status: 'active',
          })

        if (clientError) {
          console.error('Client creation failed:', clientError)
          throw new Error(`Failed to create client: ${clientError.message}`)
        }
        console.log('Client record created')
      } else if (existingClient.user_id !== assignToUserId) {
        const { error: clientUpdateError } = await supabaseAdmin
          .from('clients')
          .update({ user_id: assignToUserId, status: 'active' })
          .eq('id', existingClient.id)

        if (clientUpdateError) {
          console.error('Client update failed:', clientUpdateError)
          throw new Error(`Failed to update client assignment: ${clientUpdateError.message}`)
        }
        console.log('Client assignment updated')
      } else {
        console.log('Client record already exists with correct assignment')
      }
    }

    // Update pending user status
    const { error: updateError } = await supabaseAdmin
      .from('pending_users')
      .update({
        status: 'approved',
        approved_by_user_id: user.id,
        assigned_to_user_id: assignToUserId,
      })
      .eq('id', pendingUserId)

    if (updateError) {
      console.error('Status update failed:', updateError)
      throw new Error(`Failed to update status: ${updateError.message}`)
    }

    console.log('=== Approval completed successfully ===')

    let emailSent = false
    let emailError: string | null = null
    if (actionUrl) {
      const result = await sendEmail({
        to: pendingUser.email,
        toName: pendingUser.full_name || pendingUser.email,
        subject: isNewUser ? 'Complete your registration' : 'Set your password',
        html: invitationEmailHtml({
          fullName: pendingUser.full_name || pendingUser.email,
          email: pendingUser.email,
          actionUrl,
          roleLabel: pendingUser.requested_role === 'client' ? 'client' : 'admin',
        }),
      })
      emailSent = result.sent
      emailError = result.error ?? null
    }


    return new Response(
      JSON.stringify({ success: true, emailSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== Approval failed ===')

    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})