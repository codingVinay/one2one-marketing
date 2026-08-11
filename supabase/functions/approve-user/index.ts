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

    // Create or link auth user (idempotent)
    console.log('Creating or linking user account...')
    let authUserId: string | null = null
    let isNewUser = false


    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: pendingUser.email,
      password: pendingUser.password_hash, // expected to be plain text
      email_confirm: true,
      user_metadata: {
        full_name: pendingUser.full_name || pendingUser.email,
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      const status = (authError as any)?.status
      const code = (authError as any)?.code
      if (status === 422 || code === 'email_exists') {
        console.log('User already exists. Looking up existing user by email...')
        const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) {
          console.error('Failed to list users:', listError)
          throw new Error(`Email exists but failed to list users: ${listError.message}`)
        }
        const existing = usersPage?.users?.find((u: any) => (u.email || '').toLowerCase() === pendingUser.email.toLowerCase())
        if (!existing) {
          throw new Error('Email exists but could not find existing user in listUsers result')
        }
        authUserId = existing.id
        console.log('Linked to existing user:', authUserId)
      } else {
        throw new Error(`Failed to create user: ${authError.message}`)
      }
    } else {
      authUserId = authData.user.id
      console.log('User created with ID:', authUserId)
    }

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

    // Ensure user role
    const { data: existingRole, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', authUserId)
      .eq('role', pendingUser.requested_role)
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
    } else {
      console.log('Role already exists, skipping insert')
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

    return new Response(
      JSON.stringify({ success: true }),
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