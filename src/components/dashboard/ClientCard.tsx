import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BarChart3, Eye, Link2 } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  industry?: string;
  status: string;
  platforms?: string[];
  monthly_posts?: number;
  followers?: number;
  email?: string;
  user_id?: string;
  packages?: {
    id: string;
    name: string;
    price: number;
  } | null;
}

interface ClientCardProps {
  client: Client;
  userRole?: string;
}

const ClientCard = ({ client, userRole }: ClientCardProps) => {
  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: "bg-blue-500",
      instagram: "bg-pink-500",
      twitter: "bg-sky-500",
      linkedin: "bg-blue-700",
      youtube: "bg-red-500",
      tiktok: "bg-black"
    };
    return colors[platform as keyof typeof colors] || "bg-muted-foreground";
  };

  const getClientStatus = () => {
    return client.packages ? 'active' : 'inactive';
  };

  const actualStatus = getClientStatus();

  return (
    <Card className="bg-card shadow-sm hover:shadow-md transition-all duration-200 touch-card">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg font-semibold text-card-foreground truncate">
              {client.name}
            </CardTitle>
            {client.industry && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                {client.industry}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Badge 
              variant={actualStatus === "active" ? "default" : "secondary"}
              className={`text-xs ${actualStatus === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-muted text-muted-foreground"}`}
            >
              {actualStatus}
            </Badge>
            {userRole === 'superuser' && client.user_id && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {client.user_id.substring(0, 6)}...
              </span>
            )}
          </div>
        </div>
        {client.packages && (
          <p className="text-xs sm:text-sm text-primary font-medium mt-1">
            {client.packages.name} - ${client.packages.price}/mo
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {client.platforms && client.platforms.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Platforms</p>
            <div className="flex gap-1.5 flex-wrap">
              {client.platforms.map((platform) => (
                <div
                  key={platform}
                  className={`w-3 h-3 rounded-full ${getPlatformColor(platform)}`}
                  title={platform}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Posts/Month</p>
            <p className="font-semibold text-card-foreground">{client.monthly_posts || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Followers</p>
            <p className="font-semibold text-card-foreground">{client.followers?.toLocaleString() || 0}</p>
          </div>
        </div>

        {client.email && (
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium text-card-foreground text-xs truncate">{client.email}</p>
          </div>
        )}

        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <Link to={`/client/${client.id}`} className="flex-1">
              <Button className="w-full h-10 sm:h-9 text-sm" size="sm">
                <Eye className="h-4 w-4 mr-1.5" />
                Details
              </Button>
            </Link>
            <Link to={`/client/${client.id}/analytics`} className="flex-1">
              <Button variant="outline" className="w-full h-10 sm:h-9 text-sm" size="sm">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Analytics
              </Button>
            </Link>
          </div>
          <Link to={`/client/${client.id}/social-accounts`} className="block">
            <Button variant="secondary" className="w-full h-10 sm:h-9 text-sm" size="sm">
              <Link2 className="h-4 w-4 mr-1.5" />
              Social Accounts
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientCard;
