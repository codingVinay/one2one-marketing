
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      console.log('Fetching role for user:', user.email);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('No role found for user, error:', error);
        console.log('Defaulting to client role');
        return 'client';
      }
      
      console.log('User role found:', data.role);
      return data.role;
    },
    enabled: !!user,
  });
};
