import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, Eye, Heart, MessageCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { summarize, useSocialAnalytics } from '@/hooks/useSocialAnalytics';

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  twitter: '#1DA1F2',
};

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const ClientAnalytics = () => {
  const { id } = useParams();

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (!id) throw new Error('No client ID provided');
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data, isLoading } = useSocialAnalytics(id);
  const totals = summarize(data);

  if (clientLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Client not found</h2>
          <Link to="/" className="text-primary hover:underline">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const profiles = data?.profiles ?? [];
  const posts = data?.posts ?? [];
  const metrics = data?.profileMetrics ?? [];

  // Follower history per day, summed across every connected account.
  const followerSeries = Object.values(
    metrics.reduce((acc: Record<string, { name: string; followers: number }>, row: any) => {
      const day = new Date(row.recorded_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      acc[day] = acc[day] ?? { name: day, followers: 0 };
      acc[day].followers += Number(row.followers ?? 0);
      return acc;
    }, {}),
  );

  const platforms = [...new Set(profiles.map((p: any) => p.provider))];

  const engagementByPlatform = platforms.map((provider) => {
    const platformPosts = posts.filter((p: any) => p.provider === provider);
    const interactions = platformPosts.reduce(
      (total: number, p: any) =>
        total + Number(p.likes ?? 0) + Number(p.comments ?? 0) + Number(p.shares ?? 0) + Number(p.saves ?? 0),
      0,
    );
    return { name: label(provider), interactions, posts: platformPosts.length };
  });

  const totalInteractions = engagementByPlatform.reduce((s, p) => s + p.interactions, 0);
  const platformDistribution = platforms.map((provider) => {
    const entry = engagementByPlatform.find((e) => e.name === label(provider));
    return {
      name: label(provider),
      value: totalInteractions > 0 ? Math.round(((entry?.interactions ?? 0) / totalInteractions) * 100) : 0,
      color: PLATFORM_COLORS[provider] ?? 'hsl(var(--primary))',
    };
  });

  const topPosts = [...posts]
    .sort((a: any, b: any) => Number(b.engagement_rate ?? 0) - Number(a.engagement_rate ?? 0))
    .slice(0, 5);

  const keyMetrics = [
    { title: 'Followers', value: totals.followers.toLocaleString(), icon: Users },
    {
      title: 'Reach (recent posts)',
      value: (totals.reach || totals.impressions).toLocaleString(),
      icon: Eye,
    },
    { title: 'Engagement Rate', value: `${totals.engagementRate}%`, icon: Heart },
    { title: 'Comments', value: totals.comments.toLocaleString(), icon: MessageCircle },
  ];

  const hasData = profiles.length > 0 || posts.length > 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-6">
        <Link
          to={`/client/${id}`}
          className="inline-flex items-center text-primary hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Client Details
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">{client.name} — Analytics</h1>
        <p className="text-muted-foreground">
          Live data collected from this client&apos;s connected social accounts
        </p>
      </div>

      {!hasData && (
        <Card className="mb-6">
          <CardContent className="p-6 text-center text-muted-foreground">
            No social data yet. Connect an account on the client page and run a sync.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {keyMetrics.map((metric) => (
          <Card key={metric.title} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                </div>
                <metric.icon className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="top-posts">Top Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Follower Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={followerSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="followers"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interactions by Platform</CardTitle>
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
                      {platformDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          {profiles.map((profile: any) => (
            <Card key={profile.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {profile.avatar_url && (
                  <img
                    src={profile.avatar_url}
                    alt={`${profile.display_name ?? profile.username} avatar`}
                    className="h-12 w-12 rounded-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {profile.display_name ?? profile.username}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {label(profile.provider)}
                    {profile.username ? ` · @${profile.username}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{Number(profile.followers_count ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">followers</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {profiles.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No connected accounts yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactions by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={engagementByPlatform}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="interactions" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-posts" className="space-y-4">
          {topPosts.length > 0 ? (
            topPosts.map((post: any) => (
              <Card key={post.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline">{label(post.provider)}</Badge>
                    {post.engagement_rate != null && (
                      <Badge variant="secondary">{post.engagement_rate}% engagement</Badge>
                    )}
                    {post.published_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground mb-4 line-clamp-3">
                    {post.content ?? 'No caption'}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <span>{Number(post.likes ?? 0).toLocaleString()} likes</span>
                    <span>{Number(post.comments ?? 0).toLocaleString()} comments</span>
                    <span>{Number(post.shares ?? 0).toLocaleString()} shares</span>
                    <span>
                      {Number(post.reach ?? post.impressions ?? 0).toLocaleString()} reach
                    </span>
                  </div>
                  {post.post_url && (
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline mt-3 inline-block"
                    >
                      View post
                    </a>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No posts collected yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientAnalytics;
