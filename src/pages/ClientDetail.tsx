
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Heart, MessageCircle, Share, Eye, TrendingUp } from 'lucide-react';

const ClientDetail = () => {
  const { id } = useParams();
  
  // Sample client data - in a real app, this would come from an API
  const client = {
    id: 1,
    name: "TechStart Solutions",
    industry: "Technology",
    status: "Active",
    joinDate: "March 2024",
    contact: {
      email: "contact@techstart.com",
      phone: "+1 (555) 123-4567",
      manager: "Sarah Johnson"
    },
    platforms: {
      facebook: { followers: 5200, posts: 8, engagement: 4.1 },
      linkedin: { followers: 3800, posts: 6, engagement: 5.2 },
      twitter: { followers: 6200, posts: 10, engagement: 3.8 }
    }
  };

  const recentPosts = [
    {
      id: 1,
      platform: "facebook",
      content: "Excited to announce our new AI-powered analytics dashboard! 🚀 #TechInnovation",
      date: "2 hours ago",
      metrics: { likes: 45, comments: 12, shares: 8, views: 892 },
      image: null,
      status: "Published"
    },
    {
      id: 2,
      platform: "linkedin",
      content: "How AI is transforming business operations in 2024. Read our latest insights on digital transformation.",
      date: "1 day ago",
      metrics: { likes: 78, comments: 23, shares: 15, views: 1247 },
      image: null,
      status: "Published"
    },
    {
      id: 3,
      platform: "twitter",
      content: "Breaking: Our client retention rate increased by 34% this quarter! Thanks to our amazing team 💪",
      date: "2 days ago",
      metrics: { likes: 32, comments: 8, shares: 12, views: 654 },
      image: null,
      status: "Published"
    },
    {
      id: 4,
      platform: "facebook",
      content: "Join us for our upcoming webinar on 'Future of SaaS' - Limited seats available!",
      date: "3 days ago",
      metrics: { likes: 56, comments: 18, shares: 22, views: 1123 },
      image: null,
      status: "Published"
    }
  ];

  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: "text-blue-600 bg-blue-50",
      instagram: "text-pink-600 bg-pink-50",
      twitter: "text-sky-600 bg-sky-50",
      linkedin: "text-blue-700 bg-blue-50"
    };
    return colors[platform as keyof typeof colors] || "text-gray-600 bg-gray-50";
  };

  const getPlatformIcon = (platform: string) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{client.industry}</span>
              <Badge variant={client.status === "Active" ? "default" : "secondary"}>
                {client.status}
              </Badge>
              <span>Client since {client.joinDate}</span>
            </div>
          </div>
          <Link to={`/client/${id}/analytics`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="posts">Recent Posts</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{client.contact.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{client.contact.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Manager</p>
                <p className="font-medium">{client.contact.manager}</p>
              </div>
            </CardContent>
          </Card>

          {/* Platform Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(client.platforms).map(([platform, data]) => (
              <Card key={platform}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getPlatformColor(platform)}`}>
                      {getPlatformIcon(platform)}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Followers</span>
                    <span className="font-medium">{data.followers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Posts this month</span>
                    <span className="font-medium">{data.posts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Engagement rate</span>
                    <span className="font-medium">{data.engagement}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-6">
          <div className="space-y-4">
            {recentPosts.map((post) => (
              <Card key={post.id} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(post.platform)}`}>
                        {getPlatformIcon(post.platform)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{post.date}</p>
                        <Badge variant="outline" className="text-xs">
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-900 mb-4 leading-relaxed">{post.content}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-gray-600">Likes:</span>
                      <span className="font-medium">{post.metrics.likes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600">Comments:</span>
                      <span className="font-medium">{post.metrics.comments}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Share className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">Shares:</span>
                      <span className="font-medium">{post.metrics.shares}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      <span className="text-gray-600">Views:</span>
                      <span className="font-medium">{post.metrics.views}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(client.platforms).map(([platform, data]) => (
              <Card key={platform}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded text-sm font-medium ${getPlatformColor(platform)}`}>
                      {getPlatformIcon(platform)}
                    </div>
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{data.followers.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Followers</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{data.engagement}%</p>
                      <p className="text-sm text-gray-500">Engagement</p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{data.posts}</p>
                    <p className="text-sm text-gray-600">Posts This Month</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetail;
