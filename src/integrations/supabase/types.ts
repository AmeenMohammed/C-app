export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id: string
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      item_ratings: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          item_id: string
          rating: number
          review: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          item_id: string
          rating: number
          review?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          item_id?: string
          rating?: number
          review?: string | null
          seller_id?: string
        }
        Relationships: []
      }
      item_views: {
        Row: {
          created_at: string
          id: string
          item_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          latitude: number | null
          location_range: number
          longitude: number | null
          price: number
          promoted: boolean | null
          promoted_at: string | null
          seller_id: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          location_range: number
          longitude?: number | null
          price: number
          promoted?: boolean | null
          promoted_at?: string | null
          seller_id: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          location_range?: number
          longitude?: number | null
          price?: number
          promoted?: boolean | null
          promoted_at?: string | null
          seller_id?: string
          title?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          buyer_id: string
          created_at: string
          has_rated: boolean | null
          id: string
          item_id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          has_rated?: boolean | null
          id?: string
          item_id: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          has_rated?: boolean | null
          id?: string
          item_id?: string
          seller_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_user_id: string
          rater_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_user_id: string
          rater_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_user_id?: string
          rater_id?: string
          rating?: number
        }
        Relationships: []
      }
    }
    Views: {
      items_with_seller: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          images: string[] | null
          location_range: number | null
          price: number | null
          promoted: boolean | null
          promoted_at: string | null
          seller_avatar: string | null
          seller_id: string | null
          seller_location: string | null
          seller_name: string | null
          title: string | null
        }
        Relationships: []
      }
      user_profile_with_stats: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          location: string | null
          phone: string | null
          total_ratings: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: never
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          phone?: string | null
          total_ratings?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: never
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          phone?: string | null
          total_ratings?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      block_user: {
        Args: { blocker_uuid: string; blocked_uuid: string }
        Returns: undefined
      }
      calculate_distance: {
        Args: { lat1: number; lon1: number; lat2: number; lon2: number }
        Returns: number
      }
      can_rate_seller: {
        Args: { buyer_uuid: string; seller_uuid: string }
        Returns: boolean
      }
      check_if_table_exists_in_schema: {
        Args: { table_name: string; schema_name: string }
        Returns: boolean
      }
      check_if_user_is_blocked: {
        Args: { blocker_uuid: string; blocked_uuid: string }
        Returns: boolean
      }
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_item_views: {
        Args: { item_uuid: string }
        Returns: number
      }
      get_items_within_range: {
        Args: {
          user_lat: number
          user_lon: number
          max_distance: number
          category_filter?: string
        }
        Returns: {
          id: string
          title: string
          price: number
          description: string
          category: string
          images: string[]
          seller_id: string
          created_at: string
          latitude: number
          longitude: number
          location_range: number
          promoted: boolean
          promoted_at: string
          distance: number
        }[]
      }
      get_seller_ratings: {
        Args: { seller_uuid: string }
        Returns: {
          average_rating: number
          total_ratings: number
          five_star_count: number
          four_star_count: number
          three_star_count: number
          two_star_count: number
          one_star_count: number
        }[]
      }
      get_user_average_rating: {
        Args: { user_uuid: string }
        Returns: {
          average_rating: number
          total_ratings: number
        }[]
      }
      unblock_user: {
        Args: { blocker_uuid: string; blocked_uuid: string }
        Returns: undefined
      }
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
