
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useClientAnalytics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clientAnalytics', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('analytics')
        .select(`
          *,
          clients!inner (
            id,
            name,
            client_user_id
          )
        `)
        .eq('clients.client_user_id', user.id)
        .order('date_recorded', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
