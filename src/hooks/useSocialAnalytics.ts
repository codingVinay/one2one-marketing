import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SocialAnalyticsData {
  profiles: any[];
  profileMetrics: any[];
  posts: any[];
}

/**
 * Everything the dashboards need for one client, read from the normalized
 * social_* ingestion tables (never the legacy `analytics` / `posts` tables).
 */
export const useSocialAnalytics = (clientId?: string, days = 90) => {
  return useQuery({
    queryKey: ['socialAnalytics', clientId, days],
    queryFn: async (): Promise<SocialAnalyticsData> => {
      if (!clientId) throw new Error('No client id');
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const [profiles, profileMetrics, posts] = await Promise.all([
        supabase.from('social_profiles').select('*').eq('client_id', clientId),
        supabase
          .from('social_profile_metrics')
          .select('*')
          .eq('client_id', clientId)
          .gte('recorded_at', since)
          .order('recorded_at', { ascending: true }),
        supabase
          .from('social_posts')
          .select('*')
          .eq('client_id', clientId)
          .order('published_at', { ascending: false })
          .limit(200),
      ]);

      if (profiles.error) throw profiles.error;
      if (profileMetrics.error) throw profileMetrics.error;
      if (posts.error) throw posts.error;

      return {
        profiles: profiles.data ?? [],
        profileMetrics: profileMetrics.data ?? [],
        posts: posts.data ?? [],
      };
    },
    enabled: !!clientId,
  });
};

const sum = (rows: any[], key: string) =>
  rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);

/** Derive headline numbers from a client's social data. */
export const summarize = (data?: SocialAnalyticsData) => {
  const profiles = data?.profiles ?? [];
  const posts = data?.posts ?? [];

  const followers = sum(profiles, 'followers_count');
  const likes = sum(posts, 'likes');
  const comments = sum(posts, 'comments');
  const shares = sum(posts, 'shares');
  const saves = sum(posts, 'saves');
  const reach = sum(posts, 'reach');
  const impressions = sum(posts, 'impressions');
  const views = sum(posts, 'views');
  const interactions = likes + comments + shares + saves;
  const basis = reach || impressions;

  return {
    followers,
    likes,
    comments,
    shares,
    saves,
    reach,
    impressions,
    views,
    interactions,
    postCount: posts.length,
    engagementRate: basis > 0 ? Number(((interactions / basis) * 100).toFixed(2)) : 0,
  };
};
