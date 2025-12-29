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
  const stats = [
    {
      label: userRole === 'superuser' ? 'Total Clients' : 'Your Clients',
      value: totalClients,
      icon: Users,
      color: 'text-blue-500',
      borderColor: 'border-l-blue-500',
    },
    {
      label: 'Active Clients',
      value: activeClients,
      icon: TrendingUp,
      color: 'text-green-500',
      borderColor: 'border-l-green-500',
    },
    {
      label: 'Monthly Posts',
      value: totalPosts,
      icon: Calendar,
      color: 'text-purple-500',
      borderColor: 'border-l-purple-500',
    },
    {
      label: 'Avg Engagement',
      value: `${avgEngagement}%`,
      icon: BarChart3,
      color: 'text-orange-500',
      borderColor: 'border-l-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
      {stats.map((stat) => (
        <Card 
          key={stat.label} 
          className={`bg-card shadow-sm border-l-4 ${stat.borderColor} touch-card`}
        >
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                  {stat.label}
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-card-foreground">
                  {stat.value}
                </p>
              </div>
              <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color} flex-shrink-0`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
