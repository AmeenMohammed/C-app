export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          location_range: number
          price: number
          promoted: boolean | null
          promoted_at: string | null
          seller_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location_range: number
          price: number
          promoted?: boolean | null
          promoted_at?: string | null
          seller_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location_range?: number
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
      [_ in never]: never
    }
    Functions: {
      can_rate_seller: {
        Args: {
          buyer_uuid: string
          seller_uuid: string
        }
        Returns: boolean
      }
      get_item_views: {
        Args: {
          item_uuid: string
        }
        Returns: number
      }
      get_seller_ratings: {
        Args: {
          seller_uuid: string
        }
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
        Args: {
          user_uuid: string
        }
        Returns: {
          average_rating: number
          total_ratings: number
        }[]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
