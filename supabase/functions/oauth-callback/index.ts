import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { code, state, provider, clientId, userId } = await req.json();
    
    console.log(`OAuth callback for provider: ${provider}`);

    // Validate state
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', provider)
      .eq('client_id', clientId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateData) {
      throw new Error('Invalid or expired state');
    }

    // Exchange code for tokens based on provider
    let tokenData;
    
    switch (provider) {
      case 'facebook':
        tokenData = await exchangeFacebookToken(code);
        break;
      case 'instagram':
        tokenData = await exchangeInstagramToken(code);
        break;
      case 'twitter':
        tokenData = await exchangeTwitterToken(code);
        break;
      case 'linkedin':
        tokenData = await exchangeLinkedInToken(code);
        break;
      case 'youtube':
        tokenData = await exchangeYouTubeToken(code);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Store social account
    const { error: insertError } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: userId,
        client_id: clientId,
        provider,
        account_id: tokenData.account_id,
        account_name: tokenData.account_name,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        scopes: tokenData.scopes,
        is_active: true,
      }, {
        onConflict: 'client_id,provider,account_id'
      });

    if (insertError) throw insertError;

    // Clean up state
    await supabase.from('oauth_states').delete().eq('state', state);

    return new Response(JSON.stringify({ success: true, account: tokenData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in oauth-callback function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function exchangeFacebookToken(code: string) {
  const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${Deno.env.get('FACEBOOK_CLIENT_ID')}&client_secret=${Deno.env.get('FACEBOOK_CLIENT_SECRET')}&code=${code}&redirect_uri=${Deno.env.get('FACEBOOK_REDIRECT_URI')}`
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Facebook token exchange failed');
  
  // Get user info
  const userResponse = await fetch(`https://graph.facebook.com/me?access_token=${data.access_token}`);
  const userData = await userResponse.json();
  
  return {
    access_token: data.access_token,
    refresh_token: null,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    account_id: userData.id,
    account_name: userData.name,
    scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']
  };
}

async function exchangeInstagramToken(code: string) {
  const response = await fetch(`https://api.instagram.com/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${Deno.env.get('INSTAGRAM_CLIENT_ID')}&client_secret=${Deno.env.get('INSTAGRAM_CLIENT_SECRET')}&grant_type=authorization_code&redirect_uri=${Deno.env.get('INSTAGRAM_REDIRECT_URI')}&code=${code}`
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_message || 'Instagram token exchange failed');
  
  return {
    access_token: data.access_token,
    refresh_token: null,
    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
    account_id: data.user_id.toString(),
    account_name: data.user_id.toString(),
    scopes: ['user_profile', 'user_media']
  };
}

async function exchangeTwitterToken(code: string) {
  const response = await fetch(`https://api.twitter.com/2/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${Deno.env.get('TWITTER_CLIENT_ID')}:${Deno.env.get('TWITTER_CLIENT_SECRET')}`)}`,
    },
    body: `code=${code}&grant_type=authorization_code&redirect_uri=${Deno.env.get('TWITTER_REDIRECT_URI')}&code_verifier=challenge`
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Twitter token exchange failed');
  
  // Get user info
  const userResponse = await fetch(`https://api.twitter.com/2/users/me`, {
    headers: { 'Authorization': `Bearer ${data.access_token}` }
  });
  const userData = await userResponse.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    account_id: userData.data.id,
    account_name: userData.data.username,
    scopes: ['tweet.read', 'tweet.write', 'users.read']
  };
}

async function exchangeLinkedInToken(code: string) {
  const response = await fetch(`https://www.linkedin.com/oauth/v2/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=authorization_code&code=${code}&redirect_uri=${Deno.env.get('LINKEDIN_REDIRECT_URI')}&client_id=${Deno.env.get('LINKEDIN_CLIENT_ID')}&client_secret=${Deno.env.get('LINKEDIN_CLIENT_SECRET')}`
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'LinkedIn token exchange failed');
  
  // Get user info
  const userResponse = await fetch(`https://api.linkedin.com/v2/me`, {
    headers: { 'Authorization': `Bearer ${data.access_token}` }
  });
  const userData = await userResponse.json();
  
  return {
    access_token: data.access_token,
    refresh_token: null,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    account_id: userData.id,
    account_name: `${userData.firstName?.localized?.en_US} ${userData.lastName?.localized?.en_US}`,
    scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social']
  };
}

async function exchangeYouTubeToken(code: string) {
  const response = await fetch(`https://oauth2.googleapis.com/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `code=${code}&client_id=${Deno.env.get('YOUTUBE_CLIENT_ID')}&client_secret=${Deno.env.get('YOUTUBE_CLIENT_SECRET')}&redirect_uri=${Deno.env.get('YOUTUBE_REDIRECT_URI')}&grant_type=authorization_code`
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'YouTube token exchange failed');
  
  // Get channel info
  const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`, {
    headers: { 'Authorization': `Bearer ${data.access_token}` }
  });
  const channelData = await channelResponse.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    account_id: channelData.items?.[0]?.id || 'unknown',
    account_name: channelData.items?.[0]?.snippet?.title || 'YouTube Channel',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']
  };
}