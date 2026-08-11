export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      analytics: {
        Row: {
          client_id: string
          created_at: string
          date_recorded: string
          id: string
          metric_type: string
          metric_value: number
          platform: string
          post_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date_recorded?: string
          id?: string
          metric_type: string
          metric_value?: number
          platform: string
          post_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date_recorded?: string
          id?: string
          metric_type?: string
          metric_value?: number
          platform?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_user_id: string | null
          created_at: string
          description: string | null
          email: string | null
          followers: number | null
          id: string
          industry: string | null
          monthly_posts: number | null
          name: string
          organization_id: string | null
          package_id: string | null
          phone: string | null
          platforms: string[] | null
          social_links: Json | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          client_user_id?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          followers?: number | null
          id?: string
          industry?: string | null
          monthly_posts?: number | null
          name: string
          organization_id?: string | null
          package_id?: string | null
          phone?: string | null
          platforms?: string[] | null
          social_links?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          client_user_id?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          followers?: number | null
          id?: string
          industry?: string | null
          monthly_posts?: number | null
          name?: string
          organization_id?: string | null
          package_id?: string | null
          phone?: string | null
          platforms?: string[] | null
          social_links?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          client_id: string
          code_verifier: string | null
          created_at: string
          expires_at: string
          id: string
          organization_id: string | null
          provider: string
          redirect_uri: string | null
          state: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          code_verifier?: string | null
          created_at?: string
          expires_at: string
          id?: string
          organization_id?: string | null
          provider: string
          redirect_uri?: string | null
          state: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          provider?: string
          redirect_uri?: string | null
          state?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          monthly_posts: number
          name: string
          platforms: string[] | null
          price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          monthly_posts?: number
          name: string
          platforms?: string[] | null
          price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          monthly_posts?: number
          name?: string
          platforms?: string[] | null
          price?: number | null
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp: string
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp: string
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp?: string
          used?: boolean
        }
        Relationships: []
      }
      pending_social_connections: {
        Row: {
          candidates: Json
          client_id: string
          connected_by_user_id: string
          created_at: string
          expires_at: string
          id: string
          organization_id: string | null
          provider: string
          user_access_token: string
        }
        Insert: {
          candidates?: Json
          client_id: string
          connected_by_user_id: string
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          provider: string
          user_access_token: string
        }
        Update: {
          candidates?: Json
          client_id?: string
          connected_by_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string | null
          provider?: string
          user_access_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_social_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_social_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_users: {
        Row: {
          approved_by_user_id: string | null
          assigned_to_user_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          password_hash: string
          requested_by_user_id: string | null
          requested_role: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by_user_id?: string | null
          assigned_to_user_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          password_hash: string
          requested_by_user_id?: string | null
          requested_role: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by_user_id?: string | null
          assigned_to_user_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          password_hash?: string
          requested_by_user_id?: string | null
          requested_role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          client_id: string
          content: string
          created_at: string
          engagement_stats: Json | null
          id: string
          media_urls: string[] | null
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          engagement_stats?: Json | null
          id?: string
          media_urls?: string[] | null
          platform: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          engagement_stats?: Json | null
          id?: string
          media_urls?: string[] | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_token: string
          account_id: string
          account_name: string | null
          avatar_url: string | null
          client_id: string | null
          connected_by_user_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          platform_account_type: string | null
          profile_url: string | null
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          sync_error: string | null
          sync_status: string
          token_type: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          access_token: string
          account_id: string
          account_name?: string | null
          avatar_url?: string | null
          client_id?: string | null
          connected_by_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          platform_account_type?: string | null
          profile_url?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          sync_error?: string | null
          sync_status?: string
          token_type?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          access_token?: string
          account_id?: string
          account_name?: string | null
          avatar_url?: string | null
          client_id?: string | null
          connected_by_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          platform_account_type?: string | null
          profile_url?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          sync_error?: string | null
          sync_status?: string
          token_type?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_metrics: {
        Row: {
          client_id: string
          comments: number | null
          created_at: string
          engagement_rate: number | null
          engagement_rate_basis: string | null
          id: string
          impressions: number | null
          likes: number | null
          raw_data: Json | null
          reach: number | null
          recorded_at: string
          saves: number | null
          shares: number | null
          social_post_id: string
          views: number | null
        }
        Insert: {
          client_id: string
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          engagement_rate_basis?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          raw_data?: Json | null
          reach?: number | null
          recorded_at?: string
          saves?: number | null
          shares?: number | null
          social_post_id: string
          views?: number | null
        }
        Update: {
          client_id?: string
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          engagement_rate_basis?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          raw_data?: Json | null
          reach?: number | null
          recorded_at?: string
          saves?: number | null
          shares?: number | null
          social_post_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_metrics_social_post_id_fkey"
            columns: ["social_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          client_id: string
          comments: number | null
          content: string | null
          created_at: string
          engagement_rate: number | null
          engagement_rate_basis: string | null
          external_post_id: string
          id: string
          impressions: number | null
          last_metrics_sync_at: string | null
          likes: number | null
          media_type: string | null
          post_url: string | null
          provider: string
          published_at: string | null
          raw_data: Json | null
          reach: number | null
          saves: number | null
          shares: number | null
          social_account_id: string
          thumbnail_url: string | null
          updated_at: string
          views: number | null
        }
        Insert: {
          client_id: string
          comments?: number | null
          content?: string | null
          created_at?: string
          engagement_rate?: number | null
          engagement_rate_basis?: string | null
          external_post_id: string
          id?: string
          impressions?: number | null
          last_metrics_sync_at?: string | null
          likes?: number | null
          media_type?: string | null
          post_url?: string | null
          provider: string
          published_at?: string | null
          raw_data?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          social_account_id: string
          thumbnail_url?: string | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          client_id?: string
          comments?: number | null
          content?: string | null
          created_at?: string
          engagement_rate?: number | null
          engagement_rate_basis?: string | null
          external_post_id?: string
          id?: string
          impressions?: number | null
          last_metrics_sync_at?: string | null
          likes?: number | null
          media_type?: string | null
          post_url?: string | null
          provider?: string
          published_at?: string | null
          raw_data?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          social_account_id?: string
          thumbnail_url?: string | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profile_metrics: {
        Row: {
          client_id: string
          comments: number | null
          created_at: string
          engagement_rate: number | null
          engagement_rate_basis: string | null
          followers: number | null
          following: number | null
          id: string
          impressions: number | null
          likes: number | null
          posts_count: number | null
          provider: string
          raw_data: Json | null
          reach: number | null
          recorded_at: string
          saves: number | null
          shares: number | null
          social_account_id: string
          views: number | null
        }
        Insert: {
          client_id: string
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          engagement_rate_basis?: string | null
          followers?: number | null
          following?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          posts_count?: number | null
          provider: string
          raw_data?: Json | null
          reach?: number | null
          recorded_at?: string
          saves?: number | null
          shares?: number | null
          social_account_id: string
          views?: number | null
        }
        Update: {
          client_id?: string
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          engagement_rate_basis?: string | null
          followers?: number | null
          following?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          posts_count?: number | null
          provider?: string
          raw_data?: Json | null
          reach?: number | null
          recorded_at?: string
          saves?: number | null
          shares?: number | null
          social_account_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_profile_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_profile_metrics_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          client_id: string
          created_at: string
          display_name: string | null
          external_id: string
          fetched_at: string
          followers_count: number | null
          following_count: number | null
          id: string
          posts_count: number | null
          profile_url: string | null
          provider: string
          raw_data: Json | null
          social_account_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          client_id: string
          created_at?: string
          display_name?: string | null
          external_id: string
          fetched_at?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          posts_count?: number | null
          profile_url?: string | null
          provider: string
          raw_data?: Json | null
          social_account_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          client_id?: string
          created_at?: string
          display_name?: string | null
          external_id?: string
          fetched_at?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          posts_count?: number | null
          profile_url?: string | null
          provider?: string
          raw_data?: Json | null
          social_account_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_profiles_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_sync_jobs: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          records_processed: number | null
          social_account_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          records_processed?: number | null
          social_account_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          records_processed?: number | null
          social_account_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_sync_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_sync_jobs_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_client: {
        Args: { _client: string; _min_role?: string; _user: string }
        Returns: boolean
      }
      get_client_status: {
        Args: { client_row: Database["public"]["Tables"]["clients"]["Row"] }
        Returns: string
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _min_role?: string; _org: string; _user: string }
        Returns: boolean
      }
      role_rank: { Args: { _role: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
