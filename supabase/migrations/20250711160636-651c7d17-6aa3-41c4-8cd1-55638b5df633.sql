
-- Add social_links column to clients table if it doesn't exist
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Update existing clients to have empty social_links object if null
UPDATE public.clients SET social_links = '{}' WHERE social_links IS NULL;

-- Add a status computation based on package subscription
-- We'll use a view or function to determine active/inactive status based on package assignment
CREATE OR REPLACE FUNCTION public.get_client_status(client_row public.clients)
RETURNS TEXT AS $$
BEGIN
  -- If client has a package assigned, they are active, otherwise inactive
  IF client_row.package_id IS NOT NULL THEN
    RETURN 'active';
  ELSE
    RETURN 'inactive';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
