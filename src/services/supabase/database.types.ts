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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      favorite_artists: {
        Row: {
          media_item_id: string
          position: number
          user_id: string
        }
        Insert: {
          media_item_id: string
          position: number
          user_id: string
        }
        Update: {
          media_item_id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_artists_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_artists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_tracks: {
        Row: {
          media_item_id: string
          position: number
          user_id: string
        }
        Insert: {
          media_item_id: string
          position: number
          user_id: string
        }
        Update: {
          media_item_id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_tracks_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_tracks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          album_title: string | null
          artist_external_id: string | null
          artist_name: string | null
          avg_rating: number | null
          cover_url: string | null
          external_id: string
          id: string
          info: Json | null
          info_fetched_at: string | null
          kind: Database["public"]["Enums"]["media_kind"]
          provider: string
          ratings_count: number
          release_date: string | null
          title: string
          updated_from_api_at: string
        }
        Insert: {
          album_title?: string | null
          artist_external_id?: string | null
          artist_name?: string | null
          avg_rating?: number | null
          cover_url?: string | null
          external_id: string
          id?: string
          info?: Json | null
          info_fetched_at?: string | null
          kind: Database["public"]["Enums"]["media_kind"]
          provider?: string
          ratings_count?: number
          release_date?: string | null
          title: string
          updated_from_api_at?: string
        }
        Update: {
          album_title?: string | null
          artist_external_id?: string | null
          artist_name?: string | null
          avg_rating?: number | null
          cover_url?: string | null
          external_id?: string
          id?: string
          info?: Json | null
          info_fetched_at?: string | null
          kind?: Database["public"]["Enums"]["media_kind"]
          provider?: string
          ratings_count?: number
          release_date?: string | null
          title?: string
          updated_from_api_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          review_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          review_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          review_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "review_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string
          id: string
          reviews_private: boolean
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name: string
          id: string
          reviews_private?: boolean
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          reviews_private?: boolean
          username?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          reason: string
          reporter_id: string
          review_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          review_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "review_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_likes: {
        Row: {
          created_at: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          media_item_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          media_item_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          media_item_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      rankings: {
        Row: {
          artist_name: string | null
          avg_rating: number | null
          cover_url: string | null
          external_id: string | null
          key: string | null
          list_kind: string | null
          media_item_id: string | null
          score: number | null
          title: string | null
          votes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_reviews_of: { Args: { p_author: string }; Returns: boolean }
      comment_quota: {
        Args: never
        Returns: {
          max_allowed: number
          used: number
        }[]
      }
      ensure_media_item: { Args: { p: Json }; Returns: string }
      get_feed: {
        Args: { p_cursor_id?: string; p_cursor_ts?: string; p_limit?: number }
        Returns: Database["public"]["CompositeTypes"]["review_card"][]
        SetofOptions: {
          from: "*"
          to: "review_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_profile_stats: {
        Args: { p_user_id: string }
        Returns: {
          followers: number
          following: number
          is_following: boolean
          reviews: number
        }[]
      }
      get_rankings: {
        Args: { p_limit?: number; p_list: string; p_offset?: number }
        Returns: {
          artist_name: string
          avg_rating: number
          cover_url: string
          external_id: string
          key: string
          media_item_id: string
          rank_position: number
          score: number
          title: string
          votes: number
        }[]
      }
      get_review: {
        Args: { p_review_id: string }
        Returns: Database["public"]["CompositeTypes"]["review_card"][]
        SetofOptions: {
          from: "*"
          to: "review_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_guest: { Args: never; Returns: boolean }
      list_reviews: {
        Args: {
          p_cursor_id?: string
          p_cursor_ts?: string
          p_following_only?: boolean
          p_limit?: number
          p_media_item_id?: string
          p_user_id?: string
        }
        Returns: Database["public"]["CompositeTypes"]["review_card"][]
        SetofOptions: {
          from: "*"
          to: "review_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      refresh_media_rating: { Args: { p_media: string }; Returns: undefined }
      refresh_rankings: { Args: never; Returns: undefined }
      register_push_token: {
        Args: { p_platform: string; p_token: string }
        Returns: undefined
      }
      search_users: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      set_favorite_artists: {
        Args: { p_media_item_ids: string[] }
        Returns: undefined
      }
      set_favorite_tracks: {
        Args: { p_media_item_ids: string[] }
        Returns: undefined
      }
      suggest_favorite_artists: {
        Args: { p_limit?: number }
        Returns: {
          artist_external_id: string
          artist_name: string
          avg_rating: number
          reviews_count: number
        }[]
      }
      suggest_favorite_tracks: {
        Args: { p_limit?: number }
        Returns: {
          artist_name: string
          cover_url: string
          rating: number
          title: string
          track_external_id: string
        }[]
      }
    }
    Enums: {
      media_kind: "track" | "album" | "artist"
      notification_type: "follow" | "like" | "comment"
    }
    CompositeTypes: {
      review_card: {
        id: string | null
        created_at: string | null
        updated_at: string | null
        rating: number | null
        body: string | null
        author_id: string | null
        author_username: string | null
        author_display_name: string | null
        author_avatar_url: string | null
        media_item_id: string | null
        media_kind: Database["public"]["Enums"]["media_kind"] | null
        media_external_id: string | null
        media_title: string | null
        media_artist_name: string | null
        media_cover_url: string | null
        likes_count: number | null
        comments_count: number | null
        liked_by_me: boolean | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      media_kind: ["track", "album", "artist"],
      notification_type: ["follow", "like", "comment"],
    },
  },
} as const
