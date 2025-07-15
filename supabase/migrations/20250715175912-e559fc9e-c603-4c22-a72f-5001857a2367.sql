
-- Add policy to allow anonymous users to create pending user registrations
CREATE POLICY "Anyone can create pending user requests" 
  ON public.pending_users 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);
