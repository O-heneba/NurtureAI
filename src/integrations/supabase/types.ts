export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assessments: {
        Row: {
          ai_result: Json | null;
          assessment_type: string;
          created_at: string;
          created_by: string | null;
          id: string;
          inputs: Json;
          person_id: string | null;
          risk_level: string | null;
          risk_score: number | null;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          ai_result?: Json | null;
          assessment_type: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          inputs?: Json;
          person_id?: string | null;
          risk_level?: string | null;
          risk_score?: number | null;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          ai_result?: Json | null;
          assessment_type?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          inputs?: Json;
          person_id?: string | null;
          risk_level?: string | null;
          risk_score?: number | null;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
        ];
      };
      child_profiles: {
        Row: {
          birth_weight_kg: number | null;
          created_at: string;
          created_by: string | null;
          growth_notes: string | null;
          id: string;
          immunizations: Json | null;
          mother_person_id: string | null;
          person_id: string;
          updated_at: string;
        };
        Insert: {
          birth_weight_kg?: number | null;
          created_at?: string;
          created_by?: string | null;
          growth_notes?: string | null;
          id?: string;
          immunizations?: Json | null;
          mother_person_id?: string | null;
          person_id: string;
          updated_at?: string;
        };
        Update: {
          birth_weight_kg?: number | null;
          created_at?: string;
          created_by?: string | null;
          growth_notes?: string | null;
          id?: string;
          immunizations?: Json | null;
          mother_person_id?: string | null;
          person_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "child_profiles_mother_person_id_fkey";
            columns: ["mother_person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "child_profiles_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
        ];
      };
      communities: {
        Row: {
          chps_facility: string | null;
          created_at: string;
          created_by: string | null;
          district: string | null;
          id: string;
          name: string;
          notes: string | null;
          population: number | null;
          region: string | null;
          updated_at: string;
        };
        Insert: {
          chps_facility?: string | null;
          created_at?: string;
          created_by?: string | null;
          district?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          population?: number | null;
          region?: string | null;
          updated_at?: string;
        };
        Update: {
          chps_facility?: string | null;
          created_at?: string;
          created_by?: string | null;
          district?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          population?: number | null;
          region?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      facilities: {
        Row: {
          address: string | null;
          contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          district: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          id: string;
          name: string;
          notes: string | null;
          region: string | null;
          services: string[];
          sub_district: string | null;
          type: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          district?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          name: string;
          notes?: string | null;
          region?: string | null;
          services?: string[];
          sub_district?: string | null;
          type: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          district?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          name?: string;
          notes?: string | null;
          region?: string | null;
          services?: string[];
          sub_district?: string | null;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      follow_up_attempts: {
        Row: {
          actor: string | null;
          attempted_at: string;
          barrier: string | null;
          contacted: boolean;
          follow_up_id: string;
          id: string;
          method: string | null;
          next_attempt_at: string | null;
          notes: string | null;
          result: string | null;
        };
        Insert: {
          actor?: string | null;
          attempted_at?: string;
          barrier?: string | null;
          contacted?: boolean;
          follow_up_id: string;
          id?: string;
          method?: string | null;
          next_attempt_at?: string | null;
          notes?: string | null;
          result?: string | null;
        };
        Update: {
          actor?: string | null;
          attempted_at?: string;
          barrier?: string | null;
          contacted?: boolean;
          follow_up_id?: string;
          id?: string;
          method?: string | null;
          next_attempt_at?: string | null;
          notes?: string | null;
          result?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_attempts_follow_up_id_fkey";
            columns: ["follow_up_id"];
            isOneToOne: false;
            referencedRelation: "follow_ups";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_outcomes: {
        Row: {
          barriers: string[];
          care_received: string | null;
          contact_status: string | null;
          created_at: string;
          current_condition: string | null;
          follow_up_id: string;
          id: string;
          new_symptoms: string | null;
          next_action: string | null;
          next_follow_up_at: string | null;
          notes: string | null;
          recommendations: string | null;
          recorded_by: string | null;
          referral_completed: boolean | null;
          updated_at: string;
        };
        Insert: {
          barriers?: string[];
          care_received?: string | null;
          contact_status?: string | null;
          created_at?: string;
          current_condition?: string | null;
          follow_up_id: string;
          id?: string;
          new_symptoms?: string | null;
          next_action?: string | null;
          next_follow_up_at?: string | null;
          notes?: string | null;
          recommendations?: string | null;
          recorded_by?: string | null;
          referral_completed?: boolean | null;
          updated_at?: string;
        };
        Update: {
          barriers?: string[];
          care_received?: string | null;
          contact_status?: string | null;
          created_at?: string;
          current_condition?: string | null;
          follow_up_id?: string;
          id?: string;
          new_symptoms?: string | null;
          next_action?: string | null;
          next_follow_up_at?: string | null;
          notes?: string | null;
          recommendations?: string | null;
          recorded_by?: string | null;
          referral_completed?: boolean | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_outcomes_follow_up_id_fkey";
            columns: ["follow_up_id"];
            isOneToOne: true;
            referencedRelation: "follow_ups";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_ups: {
        Row: {
          assessment_id: string | null;
          assigned_to: string | null;
          community_id: string | null;
          contact_method: string | null;
          created_at: string;
          created_by: string | null;
          due_date: string;
          household_id: string | null;
          id: string;
          notes: string | null;
          person_id: string | null;
          priority: string;
          purpose: string | null;
          referral_id: string | null;
          status: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          assessment_id?: string | null;
          assigned_to?: string | null;
          community_id?: string | null;
          contact_method?: string | null;
          created_at?: string;
          created_by?: string | null;
          due_date: string;
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          person_id?: string | null;
          priority?: string;
          purpose?: string | null;
          referral_id?: string | null;
          status?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string | null;
          assigned_to?: string | null;
          community_id?: string | null;
          contact_method?: string | null;
          created_at?: string;
          created_by?: string | null;
          due_date?: string;
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          person_id?: string | null;
          priority?: string;
          purpose?: string | null;
          referral_id?: string | null;
          status?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: false;
            referencedRelation: "referrals";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          address: string | null;
          community_id: string | null;
          created_at: string;
          created_by: string | null;
          gps: string | null;
          head_name: string;
          house_no: string;
          id: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          community_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          gps?: string | null;
          head_name: string;
          house_no: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          community_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          gps?: string | null;
          head_name?: string;
          house_no?: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "households_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
        ];
      };
      nutrition_sessions: {
        Row: {
          created_at: string;
          id: string;
          messages: Json;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          messages?: Json;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          messages?: Json;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      persons: {
        Row: {
          created_at: string;
          created_by: string | null;
          date_of_birth: string | null;
          full_name: string;
          household_id: string | null;
          id: string;
          national_id: string | null;
          notes: string | null;
          phone: string | null;
          sex: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          date_of_birth?: string | null;
          full_name: string;
          household_id?: string | null;
          id?: string;
          national_id?: string | null;
          notes?: string | null;
          phone?: string | null;
          sex?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          date_of_birth?: string | null;
          full_name?: string;
          household_id?: string | null;
          id?: string;
          national_id?: string | null;
          notes?: string | null;
          phone?: string | null;
          sex?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "persons_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      pregnancies: {
        Row: {
          anc_visits: number | null;
          created_at: string;
          created_by: string | null;
          edd_date: string | null;
          gravida: number | null;
          id: string;
          lmp_date: string | null;
          notes: string | null;
          parity: number | null;
          person_id: string;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          anc_visits?: number | null;
          created_at?: string;
          created_by?: string | null;
          edd_date?: string | null;
          gravida?: number | null;
          id?: string;
          lmp_date?: string | null;
          notes?: string | null;
          parity?: number | null;
          person_id: string;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          anc_visits?: number | null;
          created_at?: string;
          created_by?: string | null;
          edd_date?: string | null;
          gravida?: number | null;
          id?: string;
          lmp_date?: string | null;
          notes?: string | null;
          parity?: number | null;
          person_id?: string;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pregnancies_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          facility: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          facility?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          facility?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      referral_outcomes: {
        Row: {
          attended_at: string | null;
          barrier: string | null;
          created_at: string;
          facility_attended: string | null;
          further_action_required: boolean;
          id: string;
          notes: string | null;
          outcome: string | null;
          recorded_by: string | null;
          referral_id: string;
          seen: boolean | null;
          service_received: string | null;
          updated_at: string;
        };
        Insert: {
          attended_at?: string | null;
          barrier?: string | null;
          created_at?: string;
          facility_attended?: string | null;
          further_action_required?: boolean;
          id?: string;
          notes?: string | null;
          outcome?: string | null;
          recorded_by?: string | null;
          referral_id: string;
          seen?: boolean | null;
          service_received?: string | null;
          updated_at?: string;
        };
        Update: {
          attended_at?: string | null;
          barrier?: string | null;
          created_at?: string;
          facility_attended?: string | null;
          further_action_required?: boolean;
          id?: string;
          notes?: string | null;
          outcome?: string | null;
          recorded_by?: string | null;
          referral_id?: string;
          seen?: boolean | null;
          service_received?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_outcomes_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: true;
            referencedRelation: "referrals";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_status_history: {
        Row: {
          actor: string | null;
          at: string;
          from_status: string | null;
          id: string;
          note: string | null;
          referral_id: string;
          to_status: string;
        };
        Insert: {
          actor?: string | null;
          at?: string;
          from_status?: string | null;
          id?: string;
          note?: string | null;
          referral_id: string;
          to_status: string;
        };
        Update: {
          actor?: string | null;
          at?: string;
          from_status?: string | null;
          id?: string;
          note?: string | null;
          referral_id?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_status_history_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: false;
            referencedRelation: "referrals";
            referencedColumns: ["id"];
          },
        ];
      };
      referrals: {
        Row: {
          acknowledged_at: string | null;
          assessment_id: string | null;
          category: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          facility: string;
          facility_id: string | null;
          findings: string | null;
          follow_up_required: boolean;
          id: string;
          notes: string | null;
          person_id: string | null;
          reason: string;
          requested_service: string | null;
          status: string;
          submitted_at: string | null;
          symptoms: string | null;
          updated_at: string;
          urgency: string | null;
        };
        Insert: {
          acknowledged_at?: string | null;
          assessment_id?: string | null;
          category?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility: string;
          facility_id?: string | null;
          findings?: string | null;
          follow_up_required?: boolean;
          id?: string;
          notes?: string | null;
          person_id?: string | null;
          reason: string;
          requested_service?: string | null;
          status?: string;
          submitted_at?: string | null;
          symptoms?: string | null;
          updated_at?: string;
          urgency?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          assessment_id?: string | null;
          category?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility?: string;
          facility_id?: string | null;
          findings?: string | null;
          follow_up_required?: boolean;
          id?: string;
          notes?: string | null;
          person_id?: string | null;
          reason?: string;
          requested_service?: string | null;
          status?: string;
          submitted_at?: string | null;
          symptoms?: string | null;
          updated_at?: string;
          urgency?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "referrals_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "chps_worker" | "supervisor" | "administrator";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["chps_worker", "supervisor", "administrator"],
    },
  },
} as const;
