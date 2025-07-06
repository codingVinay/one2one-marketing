
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample client data
  const clients = [
    {
      id: 1,
      name: "TechStart Solutions",
      industry: "Technology",
      status: "Active",
      monthlyPosts: 24,
      engagement: 4.2,
      followers: 15200,
      platforms: ["facebook", "linkedin", "twitter"],
      lastPost: "2 hours ago",
      nextPost: "Tomorrow 2:00 PM"
    },
    {
      id: 2,
      name: "Green Garden Cafe",
      industry: "Food & Beverage",
      status: "Active",
      monthlyPosts: 18,
      engagement: 6.8,
      followers: 8900,
      platforms: ["instagram", "facebook"],
      lastPost: "5 hours ago",
      nextPost: "Today 6:00 PM"
    },
    {
      id: 3,
      name: "FitLife Gym",
      industry: "Fitness",
      status: "Active",
      monthlyPosts: 20,
      engagement: 5.1,
      followers: 12400,
      platforms: ["instagram", "facebook", "twitter"],
      lastPost: "1 day ago",
      nextPost: "Tomorrow 8:00 AM"
    },
    {
      id: 4,
      name: "Elegant Interiors",
      industry: "Interior Design",
      status: "Paused",
      monthlyPosts: 12,
      engagement: 3.9,
      followers: 6200,
      platforms: ["instagram", "linkedin"],
      lastPost: "3 days ago",
      nextPost: "Scheduled"
    }
  ];

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === "Active").length;
  const totalPosts = clients.reduce((sum, client) => sum + client.monthlyPosts, 0);
  const avgEngagement = (clients.reduce((sum, client) => sum + client.engagement, 0) / clients.length).toFixed(1);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: "bg-blue-500",
      instagram: "bg-pink-500",
      twitter: "bg-sky-500",
      linkedin: "bg-blue-700"
    };
    return colors[platform as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Dashboard</h1>
        <p className="text-gray-600">Manage your digital marketing clients and track their social media performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clients</p>
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

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {client.name}
                </CardTitle>
                <Badge 
                  variant={client.status === "Active" ? "default" : "secondary"}
                  className={client.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                >
                  {client.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{client.industry}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platforms */}
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

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Posts/Month</p>
                  <p className="font-semibold text-gray-900">{client.monthlyPosts}</p>
                </div>
                <div>
                  <p className="text-gray-500">Engagement</p>
                  <p className="font-semibold text-gray-900">{client.engagement}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Followers</p>
                  <p className="font-semibold text-gray-900">{client.followers.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Post</p>
                  <p className="font-semibold text-gray-900">{client.lastPost}</p>
                </div>
              </div>

              {/* Actions */}
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
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No clients found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default Index;
