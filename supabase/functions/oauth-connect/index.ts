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

    const { provider, clientId, redirectUrl } = await req.json();
    
    console.log(`OAuth connect request for provider: ${provider}`);

    // Generate OAuth URLs based on provider
    let authUrl = '';
    const state = crypto.randomUUID();

    switch (provider) {
      case 'facebook':
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${Deno.env.get('FACEBOOK_CLIENT_ID')}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish&state=${state}`;
        break;
      
      case 'instagram':
        authUrl = `https://api.instagram.com/oauth/authorize?client_id=${Deno.env.get('INSTAGRAM_CLIENT_ID')}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=user_profile,user_media&response_type=code&state=${state}`;
        break;
      
      case 'twitter':
        authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${Deno.env.get('TWITTER_CLIENT_ID')}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
        break;
      
      case 'linkedin':
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${Deno.env.get('LINKEDIN_CLIENT_ID')}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=${state}`;
        break;
      
      case 'youtube':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${Deno.env.get('YOUTUBE_CLIENT_ID')}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly&state=${state}`;
        break;
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Store state for validation
    await supabase.from('oauth_states').insert({
      state,
      provider,
      client_id: clientId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    return new Response(JSON.stringify({ authUrl, state }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in oauth-connect function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});