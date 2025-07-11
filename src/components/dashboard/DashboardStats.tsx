
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, Calendar, BarChart3 } from 'lucide-react';

interface DashboardStatsProps {
  totalClients: number;
  activeClients: number;
  totalPosts: number;
  avgEngagement: string;
  userRole?: string;
}

const DashboardStats = ({ 
  totalClients, 
  activeClients, 
  totalPosts, 
  avgEngagement, 
  userRole 
}: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {userRole === 'superuser' ? 'Total Clients' : 'Your Clients'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border-l-4 border-l-green-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Monthly Posts</p>
              <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border-l-4 border-l-orange-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Engagement</p>
              <p className="text-2xl font-bold text-gray-900">{avgEngagement}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
