
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useClientData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clientData', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          packages (
            id,
            name,
            description,
            monthly_posts,
            platforms,
            price,
            features
          )
        `)
        .eq('client_user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
