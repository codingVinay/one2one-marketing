import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create authenticated client using the auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError)
      throw new Error('Unauthorized')
    }

    // Check if user is superuser using authenticated client
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    console.log('User ID:', user.id)
    console.log('User roles query result:', userRoles)
    console.log('Role error:', roleError)

    if (roleError) {
      console.error('Role check error:', roleError)
      throw new Error('Database error checking permissions')
    }

    const hasSuperuserRole = userRoles?.some(role => role.role === 'superuser')
    
    if (!hasSuperuserRole) {
      console.error('User does not have superuser role. Roles:', userRoles)
      throw new Error('Insufficient permissions')
    }

    console.log('Superuser verification passed')

    const { pendingUserId, assignToUserId } = await req.json()

    // Get pending user details
    const { data: pendingUser, error: fetchError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .eq('id', pendingUserId)
      .single()

    if (fetchError) throw fetchError

    // Create the actual user account using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: pendingUser.email,
      password: pendingUser.password_hash,
      email_confirm: true,
      user_metadata: {
        full_name: pendingUser.full_name,
      }
    })

    if (authError) throw authError

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: pendingUser.email,
        full_name: pendingUser.full_name,
        role: pendingUser.requested_role,
      })

    if (profileError) throw profileError

    // Create user role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: pendingUser.requested_role,
      })

    if (roleInsertError) throw roleInsertError

    // If it's a client and assigned to a user, create the client record
    if (pendingUser.requested_role === 'client' && assignToUserId) {
      const { error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({
          name: pendingUser.full_name || pendingUser.email,
          email: pendingUser.email,
          user_id: assignToUserId,
          client_user_id: authData.user.id,
          status: 'active',
        })

      if (clientError) throw clientError
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

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error approving user:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})