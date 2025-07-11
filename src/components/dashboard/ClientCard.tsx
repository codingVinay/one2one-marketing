
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

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
    return colors[platform as keyof typeof colors] || "bg-gray-500";
  };

  // Determine status based on package subscription
  const getClientStatus = () => {
    return client.packages ? 'active' : 'inactive';
  };

  const actualStatus = getClientStatus();

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {client.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {userRole === 'superuser' && (
              <Badge variant="outline" className="text-xs">
                ID: {client.user_id?.substring(0, 8)}...
              </Badge>
            )}
            <Badge 
              variant={actualStatus === "active" ? "default" : "secondary"}
              className={actualStatus === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
            >
              {actualStatus}
            </Badge>
          </div>
        </div>
        {client.industry && (
          <p className="text-sm text-gray-600">{client.industry}</p>
        )}
        {client.packages && (
          <p className="text-sm text-blue-600 font-medium">
            {client.packages.name} - ${client.packages.price}/month
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {client.platforms && client.platforms.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Active Platforms</p>
            <div className="flex gap-2">
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

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Posts/Month</p>
            <p className="font-semibold text-gray-900">{client.monthly_posts || 0}</p>
          </div>
          <div>
            <p className="text-gray-500">Followers</p>
            <p className="font-semibold text-gray-900">{client.followers?.toLocaleString() || 0}</p>
          </div>
          {client.email && (
            <div className="col-span-2">
              <p className="text-gray-500">Email</p>
              <p className="font-semibold text-gray-900 text-xs">{client.email}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Link to={`/client/${client.id}`} className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              View Details
            </Button>
          </Link>
          <Link to={`/client/${client.id}/analytics`} className="flex-1">
            <Button variant="outline" className="w-full">
              Analytics
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientCard;
