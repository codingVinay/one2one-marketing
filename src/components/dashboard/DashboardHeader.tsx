
import { Button } from '@/components/ui/button';
import { LogOut, User, Crown, Shield } from 'lucide-react';

interface DashboardHeaderProps {
  userRole?: string;
  userEmail?: string;
  onSignOut: () => void;
}

const DashboardHeader = ({ userRole, userEmail, onSignOut }: DashboardHeaderProps) => {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superuser':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'user':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superuser':
        return 'Super Admin';
      case 'user':
        return 'Admin';
      case 'client':
        return 'Client';
      default:
        return 'User';
    }
  };

  return (
    <div className="mb-8 flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {userRole === 'superuser' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
        </h1>
        <p className="text-gray-600">
          {userRole === 'superuser' 
            ? 'Manage all clients and system settings' 
            : 'Manage your digital marketing clients and track their social media performance'}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {getRoleIcon(userRole || '')}
          <span>{getRoleLabel(userRole || '')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{userEmail}</span>
        </div>
        <Button 
          onClick={onSignOut}
          variant="outline"
          size="sm"
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
