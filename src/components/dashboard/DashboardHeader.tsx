import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Menu, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
  userRole?: string;
  userEmail?: string;
  onSignOut: () => void;
}

const DashboardHeader = ({ userRole, userEmail, onSignOut }: DashboardHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 mb-6 md:mb-8">
      {/* Top row with title and actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">
            {userRole === 'client' ? 'Client Dashboard' : 'Social Media Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            Welcome back, {userEmail}
          </p>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {userRole === 'superuser' && (
            <>
              <Link to="/user-management">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </Button>
              </Link>
              <Link to="/client-management">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clients
                </Button>
              </Link>
            </>
          )}
          <Link to="/account-settings">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
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

        {/* Mobile dropdown menu */}
        <div className="md:hidden flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              {userRole === 'superuser' && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/user-management" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      User Management
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/client-management" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      Client Management
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/account-settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSignOut} className="flex items-center gap-2 cursor-pointer text-destructive">
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
