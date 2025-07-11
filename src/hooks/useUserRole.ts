
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
      
      // First try to get the role directly
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.log('Error fetching role:', error);
        // If there's an error, check for specific email roles
        if (user.email === 'contactmevinayshetty@gmail.com') {
          console.log('Email matches superuser, returning superuser role');
          return 'superuser';
        }
        if (user.email === 'ak6478662@gmail.com') {
          console.log('Email matches admin user, returning user role');
          return 'user';
        }
        console.log('Defaulting to client role');
        return 'client';
      }

      if (!data) {
        console.log('No role found for user');
        // If no role found, check for specific email roles and create the role
        if (user.email === 'contactmevinayshetty@gmail.com') {
          console.log('Email matches superuser, creating superuser role');
          await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'superuser' });
          return 'superuser';
        }
        if (user.email === 'ak6478662@gmail.com') {
          console.log('Email matches admin user, creating user role');
          await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'user' });
          return 'user';
        }
        console.log('Defaulting to client role and creating it');
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'client' });
        return 'client';
      }
      
      console.log('User role found:', data.role);
      return data.role;
    },
    enabled: !!user,
  });
};
