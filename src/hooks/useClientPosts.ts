
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useClientPosts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clientPosts', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          clients!inner (
            id,
            name,
            client_user_id
          )
        `)
        .eq('clients.client_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
