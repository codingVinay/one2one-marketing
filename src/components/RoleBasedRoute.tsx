
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface RoleBasedRouteProps {
  children: React.ReactNode;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!authLoading && !roleLoading && user && userRole) {
      const currentPath = window.location.pathname;
      
      // Redirect logic based on user role
      if (userRole === 'client') {
        // Clients can only access their dashboard
        if (currentPath !== '/client-dashboard') {
          navigate('/client-dashboard');
        }
      } else if (userRole === 'user' || userRole === 'superuser') {
        // Users and superusers access the main admin dashboard
        if (currentPath === '/client-dashboard') {
          navigate('/');
        }
      }
    }
  }, [user, userRole, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
