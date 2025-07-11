
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export const useClients = () => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: ['clients', userRole],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      let query = supabase
        .from('clients')
        .select(`
          *,
          packages (
            id,
            name,
            price,
            monthly_posts,
            platforms,
            features
          )
        `);
      
      // Apply different filters based on user role
      if (userRole === 'user') {
        // Regular users can only see their own clients
        query = query.eq('user_id', user.id);
      } else if (userRole === 'superuser') {
        // Superusers can see all clients (no filter needed)
      } else {
        // Fallback for other roles - show only their own clients
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!userRole,
  });
};
