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
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          idea_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          document_type: string
          file_path: string | null
          id: string
          idea_id: string
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          document_type: string
          file_path?: string | null
          id?: string
          idea_id: string
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          document_type?: string
          file_path?: string | null
          id?: string
          idea_id?: string
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          comments: string | null
          created_at: string
          evaluator_id: string
          id: string
          idea_id: string
          investment_required: number | null
          market_size: number | null
          rating: number
          risk_level: number | null
          time_to_market: number | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          evaluator_id: string
          id?: string
          idea_id: string
          investment_required?: number | null
          market_size?: number | null
          rating: number
          risk_level?: number | null
          time_to_market?: number | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          evaluator_id?: string
          id?: string
          idea_id?: string
          investment_required?: number | null
          market_size?: number | null
          rating?: number
          risk_level?: number | null
          time_to_market?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          ai_opportunity_eval: Json | null
          ai_summary: string | null
          created_at: string
          description: string
          group_id: string | null
          id: string
          sector: Database["public"]["Enums"]["idea_sector"]
          status: Database["public"]["Enums"]["idea_status"]
          submitted_by: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_opportunity_eval?: Json | null
          ai_summary?: string | null
          created_at?: string
          description: string
          group_id?: string | null
          id?: string
          sector?: Database["public"]["Enums"]["idea_sector"]
          status?: Database["public"]["Enums"]["idea_status"]
          submitted_by: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_opportunity_eval?: Json | null
          ai_summary?: string | null
          created_at?: string
          description?: string
          group_id?: string | null
          id?: string
          sector?: Database["public"]["Enums"]["idea_sector"]
          status?: Database["public"]["Enums"]["idea_status"]
          submitted_by?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_interest: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          investor_id: string
          investment_amount: number | null
          notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          investor_id: string
          investment_amount?: number | null
          notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          investor_id?: string
          investment_amount?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_interest_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_interest_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_feedback: {
        Row: {
          id: string
          meetup_id: string
          responses: Json
          submitted_at: string
          user_id: string
        }
        Insert: {
          id?: string
          meetup_id: string
          responses: Json
          submitted_at?: string
          user_id: string
        }
        Update: {
          id?: string
          meetup_id?: string
          responses?: Json
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_feedback_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          action_items: Json | null
          agenda: string
          ai_summary: string | null
          created_at: string
          date: string
          group_id: string | null
          id: string
          meeting_time: string | null
          notes: string
          session_feedback: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          agenda: string
          ai_summary?: string | null
          created_at?: string
          date: string
          group_id?: string | null
          id?: string
          meeting_time?: string | null
          notes: string
          session_feedback?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          agenda?: string
          ai_summary?: string | null
          created_at?: string
          date?: string
          group_id?: string | null
          id?: string
          meeting_time?: string | null
          notes?: string
          session_feedback?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          investor_type: Database["public"]["Enums"]["investor_type"] | null
          name: string
          profile: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          subscription_expires_at: string | null
          subscription_tier: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          investor_type?: Database["public"]["Enums"]["investor_type"] | null
          name: string
          profile?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          investor_type?: Database["public"]["Enums"]["investor_type"] | null
          name?: string
          profile?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          idea_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          idea_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          idea_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          ai_summaries_generated: number | null
          created_at: string | null
          id: string
          meetings_created: number | null
          month_year: string
          user_id: string
        }
        Insert: {
          ai_summaries_generated?: number | null
          created_at?: string | null
          id?: string
          meetings_created?: number | null
          month_year: string
          user_id: string
        }
        Update: {
          ai_summaries_generated?: number | null
          created_at?: string | null
          id?: string
          meetings_created?: number | null
          month_year?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_transitions: {
        Row: {
          changed_by: string
          created_at: string
          from_status: string
          id: string
          idea_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_status: string
          id?: string
          idea_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_status?: string
          id?: string
          idea_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_transitions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_moderator: {
        Args: { user_id: string }
        Returns: boolean
      }
      join_group_by_invite_code: {
        Args: { invite_code_param: string }
        Returns: Json
      }
      update_idea_status: {
        Args: {
          p_idea_id: string
          p_new_status: Database["public"]["Enums"]["idea_status"]
          p_reason?: string
        }
        Returns: undefined
      }
      user_in_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      idea_sector:
        | "technology"
        | "healthcare"
        | "finance"
        | "education"
        | "manufacturing"
        | "retail"
        | "agriculture"
        | "energy"
        | "transportation"
        | "real_estate"
        | "entertainment"
      idea_status:
        | "proposed"
        | "under_review"
        | "validated"
        | "investment_ready"
      investor_type: "active" | "passive" | "strategic"
      task_status: "pending" | "in_progress" | "done"
      user_role: "member" | "admin" | "moderator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

export { type DatabaseWithoutInternals as Tables }
