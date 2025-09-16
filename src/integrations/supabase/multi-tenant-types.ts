// Multi-Tenant Supabase Types
// This file contains the updated types for the multi-tenant architecture

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          type: 'organization' | 'individual'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'organization' | 'individual'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'organization' | 'individual'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_members: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: 'admin' | 'moderator' | 'member'
          joined_at: string
          invited_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role: 'admin' | 'moderator' | 'member'
          joined_at?: string
          invited_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: 'admin' | 'moderator' | 'member'
          joined_at?: string
          invited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      moderator_licenses: {
        Row: {
          id: string
          organization_id: string
          total_slots: number
          used_slots: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          total_slots?: number
          used_slots?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          total_slots?: number
          used_slots?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'member' | 'admin'
          investor_type: 'active' | 'passive' | 'strategic'
          profile: string | null
          subscription_tier: 'free' | 'pro' | 'enterprise'
          subscription_expires_at: string | null
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: 'member' | 'admin'
          investor_type?: 'active' | 'passive' | 'strategic'
          profile?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_expires_at?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'member' | 'admin'
          investor_type?: 'active' | 'passive' | 'strategic'
          profile?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_expires_at?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          invite_code: string
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          invite_code: string
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          invite_code?: string
          organization_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      ideas: {
        Row: {
          id: string
          title: string
          description: string
          sector: 'healthcare' | 'real_estate' | 'other'
          status: 'proposed' | 'under_review' | 'validated' | 'investment_ready'
          submitted_by: string
          group_id: string | null
          organization_id: string | null
          ai_summary: string | null
          ai_opportunity_eval: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          sector?: 'healthcare' | 'real_estate' | 'other'
          status?: 'proposed' | 'under_review' | 'validated' | 'investment_ready'
          submitted_by: string
          group_id?: string | null
          organization_id?: string | null
          ai_summary?: string | null
          ai_opportunity_eval?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          sector?: 'healthcare' | 'real_estate' | 'other'
          status?: 'proposed' | 'under_review' | 'validated' | 'investment_ready'
          submitted_by?: string
          group_id?: string | null
          organization_id?: string | null
          ai_summary?: string | null
          ai_opportunity_eval?: any | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      // ... other tables with organization_id added
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_role: {
        Args: {
          user_uuid: string
          org_uuid: string
        }
        Returns: string
      }
      is_organization_admin: {
        Args: {
          user_uuid: string
          org_uuid: string
        }
        Returns: boolean
      }
      is_organization_moderator: {
        Args: {
          user_uuid: string
          org_uuid: string
        }
        Returns: boolean
      }
      get_user_organizations: {
        Args: {
          user_uuid: string
        }
        Returns: {
          organization_id: string
          organization_name: string
          organization_type: string
          user_role: string
          joined_at: string
        }[]
      }
      can_assign_moderator: {
        Args: {
          org_uuid: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'member' | 'admin'
      investor_type: 'active' | 'passive' | 'strategic'
      idea_sector: 'healthcare' | 'real_estate' | 'other'
      idea_status: 'proposed' | 'under_review' | 'validated' | 'investment_ready'
      task_status: 'pending' | 'in_progress' | 'done'
      organization_type: 'organization' | 'individual'
      organization_role: 'admin' | 'moderator' | 'member'
    }
  }
}

// Helper types for multi-tenant operations
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type ModeratorLicense = Database['public']['Tables']['moderator_licenses']['Row']

export type OrganizationWithMembers = Organization & {
  members: OrganizationMember[]
  moderator_license: ModeratorLicense
}

export type UserOrganization = {
  organization_id: string
  organization_name: string
  organization_type: string
  user_role: string
  joined_at: string
}
