-- Create table for storing password reset OTPs
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Create policy - only allow service role to access (edge functions will use service role)
CREATE POLICY "Service role can manage password reset OTPs" 
ON public.password_reset_otps 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create index for performance
CREATE INDEX idx_password_reset_otps_email_otp ON public.password_reset_otps(email, otp);
CREATE INDEX idx_password_reset_otps_expires_at ON public.password_reset_otps(expires_at);