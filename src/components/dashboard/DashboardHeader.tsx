
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Users } from 'lucide-react';

interface DashboardHeaderProps {
  userRole?: string;
  userEmail?: string;
  onSignOut: () => void;
}

const DashboardHeader = ({ userRole, userEmail, onSignOut }: DashboardHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {userRole === 'client' ? 'Client Dashboard' : 'Social Media Management Dashboard'}
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {userEmail}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {userRole === 'superuser' && (
          <>
            <Link to="/user-management">
              <Button variant="outline" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </Button>
            </Link>
            <Link to="/client-management">
              <Button variant="outline" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Client Management
              </Button>
            </Link>
          </>
        )}
        <Button 
          onClick={onSignOut}
          variant="outline"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
