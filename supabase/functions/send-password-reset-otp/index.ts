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
      from: "SocialSync <onboarding@resend.dev>",
      to: [email],
      subject: "Your Password Reset Code - SocialSync",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto;">
                  <!-- Logo/Header -->
                  <tr>
                    <td style="text-align: center; padding-bottom: 30px;">
                      <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 12px 24px; border-radius: 12px;">
                        <span style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 1px;">SocialSync</span>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Main Card -->
                  <tr>
                    <td>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(145deg, #1e293b, #1a2332); border-radius: 16px; border: 1px solid #334155;">
                        <tr>
                          <td style="padding: 40px 30px;">
                            <!-- Icon -->
                            <div style="text-align: center; margin-bottom: 24px;">
                              <div style="display: inline-block; background: rgba(59, 130, 246, 0.15); padding: 16px; border-radius: 50%;">
                                <span style="font-size: 32px;">🔐</span>
                              </div>
                            </div>
                            
                            <!-- Title -->
                            <h1 style="color: #f8fafc; font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 16px 0;">
                              Password Reset
                            </h1>
                            
                            <!-- Greeting -->
                            <p style="color: #94a3b8; font-size: 16px; text-align: center; margin: 0 0 24px 0; line-height: 1.6;">
                              Hello <span style="color: #e2e8f0; font-weight: 500;">${userName}</span>,<br>
                              Use the code below to reset your password.
                            </p>
                            
                            <!-- OTP Code Box -->
                            <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2)); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                              <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #ffffff; font-family: 'Courier New', monospace;">${otp}</span>
                            </div>
                            
                            <!-- Timer Notice -->
                            <div style="background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                              <p style="color: #fbbf24; font-size: 14px; margin: 0;">
                                ⏱️ This code expires in <strong>10 minutes</strong>
                              </p>
                            </div>
                            
                            <!-- Security Notice -->
                            <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0; line-height: 1.5;">
                              If you did not request this password reset, please ignore this email or contact our support team.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #475569; font-size: 12px; margin: 0 0 8px 0;">
                        © ${new Date().getFullYear()} SocialSync. All rights reserved.
                      </p>
                      <p style="color: #475569; font-size: 12px; margin: 0;">
                        Manage all your social media in one place.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
