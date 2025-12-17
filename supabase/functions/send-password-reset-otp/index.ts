import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();
    console.log('Processing password reset request for:', email);

    // Check if user exists in profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('email', email)
      .single();
    
    if (profileError || !profileData) {
      console.log('User not found:', email);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in database
    const { error: otpError } = await supabase
      .from('password_reset_otps')
      .upsert({
        email: email,
        otp: otp,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (otpError) {
      console.error('Error storing OTP:', otpError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send OTP via email using Resend
    const userName = profileData.full_name || 'User';
    
    const emailResponse = await resend.emails.send({
      from: "Password Reset <onboarding@resend.dev>",
      to: [email],
      subject: "Your Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px;">Hello ${userName},</p>
          <p style="color: #666; font-size: 16px;">You requested to reset your password. Use the following one-time code to complete the process:</p>
          <div style="background-color: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        message: "OTP sent to email address"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
