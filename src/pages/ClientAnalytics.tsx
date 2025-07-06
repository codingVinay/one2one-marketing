
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Eye, Heart, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const ClientAnalytics = () => {
  const { id } = useParams();

  // Sample analytics data
  const client = {
    name: "TechStart Solutions",
    industry: "Technology"
  };

  const engagementData = [
    { name: 'Jan', facebook: 4.2, linkedin: 5.1, twitter: 3.8 },
    { name: 'Feb', facebook: 4.5, linkedin: 5.3, twitter: 4.1 },
    { name: 'Mar', facebook: 4.8, linkedin: 5.8, twitter: 4.3 },
    { name: 'Apr', facebook: 4.3, linkedin: 5.2, twitter: 4.0 },
    { name: 'May', facebook: 4.7, linkedin: 6.1, twitter: 4.4 },
    { name: 'Jun', facebook: 5.1, linkedin: 6.4, twitter: 4.6 }
  ];

  const followerGrowth = [
    { name: 'Jan', followers: 12800 },
    { name: 'Feb', followers: 13200 },
    { name: 'Mar', followers: 13900 },
    { name: 'Apr', followers: 14300 },
    { name: 'May', followers: 14800 },
    { name: 'Jun', followers: 15200 }
  ];

  const platformDistribution = [
    { name: 'Facebook', value: 35, color: '#1877F2' },
    { name: 'LinkedIn', value: 25, color: '#0A66C2' },
    { name: 'Twitter', value: 40, color: '#1DA1F2' }
  ];

  const topPosts = [
    {
      platform: 'linkedin',
      content: 'How AI is transforming business operations in 2024...',
      engagement: 8.2,
      likes: 78,
      comments: 23,
      shares: 15
    },
    {
      platform: 'facebook',
      content: 'Join us for our upcoming webinar on Future of SaaS...',
      engagement: 6.8,
      likes: 56,
      comments: 18,
      shares: 22
    },
    {
      platform: 'twitter',
      content: 'Breaking: Our client retention rate increased by 34%...',
      engagement: 5.9,
      likes: 32,
      comments: 8,
      shares: 12
    }
  ];

  const keyMetrics = [
    {
      title: 'Total Reach',
      value: '45.2K',
      change: '+12.5%',
      trend: 'up',
      icon: Eye
    },
    {
      title: 'Engagement Rate',
      value: '4.8%',
      change: '+0.6%',
      trend: 'up',
      icon: Heart
    },
    {
      title: 'New Followers',
      value: '1,247',
      change: '+18.3%',
      trend: 'up',
      icon: Users
    },
    {
      title: 'Comments',
      value: '892',
      change: '-2.1%',
      trend: 'down',
      icon: MessageCircle
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <Link to={`/client/${id}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Client Details
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.name} - Analytics</h1>
          <p className="text-gray-600">Comprehensive social media performance analytics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {keyMetrics.map((metric, index) => (
          <Card key={index} className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <div className="flex items-center mt-2">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <metric.icon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="top-posts">Top Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Follower Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Follower Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={followerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="followers" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {platformDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {platformDistribution.map((platform, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: platform.color }}
                        />
                        <span className="text-sm">{platform.name}</span>
                      </div>
                      <span className="text-sm font-medium">{platform.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Rate by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="facebook" 
                    stroke="#1877F2" 
                    strokeWidth={2}
                    name="Facebook"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="linkedin" 
                    stroke="#0A66C2" 
                    strokeWidth={2}
                    name="LinkedIn"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="twitter" 
                    stroke="#1DA1F2" 
                    strokeWidth={2}
                    name="Twitter"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Growth Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={followerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="followers" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-posts" className="space-y-6">
          <div className="space-y-4">
            {topPosts.map((post, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`${
                          post.platform === 'facebook' ? 'border-blue-500 text-blue-700' :
                          post.platform === 'linkedin' ? 'border-blue-600 text-blue-800' :
                          'border-sky-500 text-sky-700'
                        }`}
                      >
                        {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                      </Badge>
                      <Badge variant="secondary">
                        {post.engagement}% engagement
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-gray-900 mb-4">{post.content}</p>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>{post.likes} likes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      <span>{post.comments} comments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>{post.shares} shares</span>
                    </div>
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

export default ClientAnalytics;
