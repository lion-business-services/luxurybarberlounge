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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_notes: {
        Row: {
          author_user_id: string | null
          booking_metadata_id: string
          client_visible: boolean
          created_at: string
          id: string
          note: string
          updated_at: string
        }
        Insert: {
          author_user_id?: string | null
          booking_metadata_id: string
          client_visible?: boolean
          created_at?: string
          id?: string
          note: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string | null
          booking_metadata_id?: string
          client_visible?: boolean
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_notes_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reference_images: {
        Row: {
          alt_text: string | null
          booking_metadata_id: string
          created_at: string
          id: string
          status: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          alt_text?: string | null
          booking_metadata_id: string
          created_at?: string
          id?: string
          status?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          alt_text?: string | null
          booking_metadata_id?: string
          created_at?: string
          id?: string
          status?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reference_images_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reference_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_history: {
        Row: {
          booking_metadata_id: string
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: number
          metadata: Json
          reason: string | null
          to_status: string
        }
        Insert: {
          booking_metadata_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          metadata?: Json
          reason?: string | null
          to_status: string
        }
        Update: {
          booking_metadata_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          metadata?: Json
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_overrides: {
        Row: {
          actor_user_id: string
          created_at: string
          id: string
          next_barber_user_id: string | null
          previous_barber_user_id: string | null
          queue_entry_id: string
          reason: string
          rule_version_id: string | null
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          id?: string
          next_barber_user_id?: string | null
          previous_barber_user_id?: string | null
          queue_entry_id: string
          reason: string
          rule_version_id?: string | null
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          id?: string
          next_barber_user_id?: string | null
          previous_barber_user_id?: string | null
          queue_entry_id?: string
          reason?: string
          rule_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_overrides_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_overrides_next_barber_user_id_fkey"
            columns: ["next_barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignment_overrides_previous_barber_user_id_fkey"
            columns: ["previous_barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignment_overrides_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "queue_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_overrides_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "assignment_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_rule_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          rules: Json
          status: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          rules?: Json
          status?: string
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          rules?: Json
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignment_rule_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_rule_versions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_claims: {
        Row: {
          barber_user_id: string
          booking_metadata_id: string | null
          business_id: string
          claim_type: string
          client_email: string | null
          client_phone: string | null
          client_user_id: string | null
          created_at: string
          criteria: Json
          explanation: string
          id: string
          policy_version: string
          requested_at: string
          roster_entry_id: string | null
          status: string
          submitted_before_service: boolean
          updated_at: string
        }
        Insert: {
          barber_user_id: string
          booking_metadata_id?: string | null
          business_id: string
          claim_type: string
          client_email?: string | null
          client_phone?: string | null
          client_user_id?: string | null
          created_at?: string
          criteria?: Json
          explanation: string
          id?: string
          policy_version: string
          requested_at?: string
          roster_entry_id?: string | null
          status?: string
          submitted_before_service?: boolean
          updated_at?: string
        }
        Update: {
          barber_user_id?: string
          booking_metadata_id?: string | null
          business_id?: string
          claim_type?: string
          client_email?: string | null
          client_phone?: string | null
          client_user_id?: string | null
          created_at?: string
          criteria?: Json
          explanation?: string
          id?: string
          policy_version?: string
          requested_at?: string
          roster_entry_id?: string | null
          status?: string
          submitted_before_service?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribution_claims_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attribution_claims_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_claims_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attribution_claims_roster_entry_id_fkey"
            columns: ["roster_entry_id"]
            isOneToOne: false
            referencedRelation: "imported_client_roster_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_decisions: {
        Row: {
          claim_id: string
          created_at: string
          decided_by: string
          decision: string
          effective_from: string | null
          id: string
          reason: string
          rule_version_id: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          decided_by: string
          decision: string
          effective_from?: string | null
          id?: string
          reason: string
          rule_version_id?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          decided_by?: string
          decision?: string
          effective_from?: string | null
          id?: string
          reason?: string
          rule_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_decisions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "attribution_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_decisions_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "attribution_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_evidence: {
        Row: {
          claim_id: string
          created_at: string
          description: string | null
          evidence_date: string | null
          evidence_type: string
          id: string
          status: string
          storage_path: string | null
          submitted_by: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          description?: string | null
          evidence_date?: string | null
          evidence_type: string
          id?: string
          status?: string
          storage_path?: string | null
          submitted_by?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          description?: string | null
          evidence_date?: string | null
          evidence_type?: string
          id?: string
          status?: string
          storage_path?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_evidence_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "attribution_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_rule_versions: {
        Row: {
          barber_user_id: string | null
          created_at: string
          created_by: string | null
          decision_config: Json
          effective_from: string
          effective_to: string | null
          id: string
          location_id: string | null
          priority: number
          rule_id: string
          service_id: string | null
          version: number
        }
        Insert: {
          barber_user_id?: string | null
          created_at?: string
          created_by?: string | null
          decision_config?: Json
          effective_from: string
          effective_to?: string | null
          id?: string
          location_id?: string | null
          priority?: number
          rule_id: string
          service_id?: string | null
          version: number
        }
        Update: {
          barber_user_id?: string | null
          created_at?: string
          created_by?: string | null
          decision_config?: Json
          effective_from?: string
          effective_to?: string | null
          id?: string
          location_id?: string | null
          priority?: number
          rule_id?: string
          service_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "attribution_rule_versions_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attribution_rule_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_rule_versions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_rule_versions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "attribution_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_rule_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_rules: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribution_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          business_id: string | null
          created_at: string
          id: number
          ip_hash: string | null
          metadata: Json
          reason: string | null
          resource_id: string | null
          resource_type: string
          user_agent_hash: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          business_id?: string | null
          created_at?: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          reason?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent_hash?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          business_id?: string | null
          created_at?: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          reason?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_audit: {
        Row: {
          created_at: string
          event_type: string
          id: number
          ip_hash: string | null
          metadata: Json
          outcome: string
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          outcome: string
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: never
          ip_hash?: string | null
          metadata?: Json
          outcome?: string
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          active: boolean
          business_id: string
          channels: string[]
          conditions: Json
          consent_requirements: Json
          created_at: string
          created_by: string | null
          delay_seconds: number
          id: string
          key: string
          name: string
          quiet_hours: Json
          test_mode: boolean
          trigger_key: string
          updated_at: string
          version: number
        }
        Insert: {
          actions?: Json
          active?: boolean
          business_id: string
          channels?: string[]
          conditions?: Json
          consent_requirements?: Json
          created_at?: string
          created_by?: string | null
          delay_seconds?: number
          id?: string
          key: string
          name: string
          quiet_hours?: Json
          test_mode?: boolean
          trigger_key: string
          updated_at?: string
          version?: number
        }
        Update: {
          actions?: Json
          active?: boolean
          business_id?: string
          channels?: string[]
          conditions?: Json
          consent_requirements?: Json
          created_at?: string
          created_by?: string | null
          delay_seconds?: number
          id?: string
          key?: string
          name?: string
          quiet_hours?: Json
          test_mode?: boolean
          trigger_key?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          input: Json
          result: Json
          rule_id: string | null
          started_at: string | null
          status: string
          subject_id: string | null
          subject_type: string | null
          trigger_key: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          input?: Json
          result?: Json
          rule_id?: string | null
          started_at?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string | null
          trigger_key: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          input?: Json
          result?: Json
          rule_id?: string | null
          started_at?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string | null
          trigger_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_breaks: {
        Row: {
          approved_by: string | null
          barber_user_id: string
          created_at: string
          ends_at: string
          id: string
          location_id: string
          reason: string | null
          starts_at: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          barber_user_id: string
          created_at?: string
          ends_at: string
          id?: string
          location_id: string
          reason?: string | null
          starts_at: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          barber_user_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          location_id?: string
          reason?: string | null
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_breaks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_breaks_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barber_breaks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_images: {
        Row: {
          active: boolean
          alt_text: Json
          barber_profile_id: string | null
          barber_user_id: string | null
          created_at: string
          height: number | null
          id: string
          image_type: string
          object_position: Json
          sort_order: number
          storage_path: string
          width: number | null
        }
        Insert: {
          active?: boolean
          alt_text?: Json
          barber_profile_id?: string | null
          barber_user_id?: string | null
          created_at?: string
          height?: number | null
          id?: string
          image_type: string
          object_position?: Json
          sort_order?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          active?: boolean
          alt_text?: Json
          barber_profile_id?: string | null
          barber_user_id?: string | null
          created_at?: string
          height?: number | null
          id?: string
          image_type?: string
          object_position?: Json
          sort_order?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_images_barber_profile_id_fkey"
            columns: ["barber_profile_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_images_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barber_profiles: {
        Row: {
          active: boolean
          biography: Json
          business_id: string
          certifications: Json
          created_at: string
          demo: boolean
          display_name: string
          featured: boolean
          hero_media_id: string | null
          id: string
          languages: string[]
          professional_title: Json
          short_intro: Json
          slug: string
          social_links: Json
          sort_order: number
          specialties: Json
          square_team_member_id: string | null
          staff_user_id: string | null
          status: Database["public"]["Enums"]["record_status"]
          story: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          biography?: Json
          business_id: string
          certifications?: Json
          created_at?: string
          demo?: boolean
          display_name: string
          featured?: boolean
          hero_media_id?: string | null
          id?: string
          languages?: string[]
          professional_title?: Json
          short_intro?: Json
          slug: string
          social_links?: Json
          sort_order?: number
          specialties?: Json
          square_team_member_id?: string | null
          staff_user_id?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          story?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          biography?: Json
          business_id?: string
          certifications?: Json
          created_at?: string
          demo?: boolean
          display_name?: string
          featured?: boolean
          hero_media_id?: string | null
          id?: string
          languages?: string[]
          professional_title?: Json
          short_intro?: Json
          slug?: string
          social_links?: Json
          sort_order?: number
          specialties?: Json
          square_team_member_id?: string | null
          staff_user_id?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          story?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_profiles_hero_media_id_fkey"
            columns: ["hero_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_profiles_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barber_schedules: {
        Row: {
          active: boolean
          barber_user_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          ends_at: string | null
          id: string
          location_id: string
          starts_at: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          barber_user_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          ends_at?: string | null
          id?: string
          location_id: string
          starts_at?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          barber_user_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          ends_at?: string | null
          id?: string
          location_id?: string
          starts_at?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "barber_schedules_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barber_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_user_id: string | null
          body: Json
          business_id: string
          category: string | null
          created_at: string
          excerpt: string | null
          hero_media_id: string | null
          id: string
          locale: string
          published_at: string | null
          scheduled_for: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["record_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_user_id?: string | null
          body?: Json
          business_id: string
          category?: string | null
          created_at?: string
          excerpt?: string | null
          hero_media_id?: string | null
          id?: string
          locale?: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["record_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string | null
          body?: Json
          business_id?: string
          category?: string | null
          created_at?: string
          excerpt?: string | null
          hero_media_id?: string | null
          id?: string
          locale?: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["record_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_hero_media_id_fkey"
            columns: ["hero_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_attributions: {
        Row: {
          attribution_type: string
          booking_metadata_id: string
          client_response: Json
          confidence: string
          created_at: string
          evidence: Json
          id: string
          locked_at: string | null
          override_actor: string | null
          override_reason: string | null
          referral_code: string | null
          rule_version: number
          source: string
        }
        Insert: {
          attribution_type: string
          booking_metadata_id: string
          client_response?: Json
          confidence?: string
          created_at?: string
          evidence?: Json
          id?: string
          locked_at?: string | null
          override_actor?: string | null
          override_reason?: string | null
          referral_code?: string | null
          rule_version?: number
          source: string
        }
        Update: {
          attribution_type?: string
          booking_metadata_id?: string
          client_response?: Json
          confidence?: string
          created_at?: string
          evidence?: Json
          id?: string
          locked_at?: string | null
          override_actor?: string | null
          override_reason?: string | null
          referral_code?: string | null
          rule_version?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_attributions_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_attributions_override_actor_fkey"
            columns: ["override_actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_metadata: {
        Row: {
          addon_snapshot: Json
          barber_user_id: string | null
          business_id: string
          client_user_id: string | null
          created_at: string
          deposit_status: string | null
          id: string
          location_id: string | null
          metadata: Json
          policy_version: string | null
          preferred_language: string
          reference_code: string | null
          service_snapshot: Json
          source: string | null
          square_booking_id: string | null
          updated_at: string
        }
        Insert: {
          addon_snapshot?: Json
          barber_user_id?: string | null
          business_id: string
          client_user_id?: string | null
          created_at?: string
          deposit_status?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json
          policy_version?: string | null
          preferred_language?: string
          reference_code?: string | null
          service_snapshot?: Json
          source?: string | null
          square_booking_id?: string | null
          updated_at?: string
        }
        Update: {
          addon_snapshot?: Json
          barber_user_id?: string | null
          business_id?: string
          client_user_id?: string | null
          created_at?: string
          deposit_status?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json
          policy_version?: string | null
          preferred_language?: string
          reference_code?: string | null
          service_snapshot?: Json
          source?: string | null
          square_booking_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_metadata_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "booking_metadata_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_metadata_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "booking_metadata_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          closed: boolean
          closes_at: string | null
          created_at: string
          id: string
          location_id: string
          opens_at: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          closed?: boolean
          closes_at?: string | null
          created_at?: string
          id?: string
          location_id: string
          opens_at?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          closed?: boolean
          closes_at?: string | null
          created_at?: string
          id?: string
          location_id?: string
          opens_at?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          default_language: string
          email: string | null
          id: string
          legal_name: string | null
          metadata: Json
          name: string
          phone: string | null
          slug: string
          status: string
          timezone: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          default_language?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          metadata?: Json
          name: string
          phone?: string | null
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          default_language?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          metadata?: Json
          name?: string
          phone?: string | null
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      campaign_events: {
        Row: {
          campaign_id: string
          event_type: string
          id: number
          metadata: Json
          occurred_at: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          event_type: string
          id?: never
          metadata?: Json
          occurred_at?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          event_type?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_by: string | null
          audience_definition: Json
          business_id: string
          channels: string[]
          created_at: string
          created_by: string | null
          id: string
          locale: string | null
          name: string
          objective: string | null
          schedule: Json
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          audience_definition?: Json
          business_id: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          locale?: string | null
          name: string
          objective?: string | null
          schedule?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          audience_definition?: Json
          business_id?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          locale?: string | null
          name?: string
          objective?: string | null
          schedule?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_applications: {
        Row: {
          availability: Json
          business_id: string | null
          consent: boolean
          created_at: string
          email: string
          experience_summary: string | null
          full_name: string
          id: string
          license_information: Json
          phone: string | null
          portfolio_paths: Json
          role_title: string
          social_links: Json
          status: string
          updated_at: string
        }
        Insert: {
          availability?: Json
          business_id?: string | null
          consent?: boolean
          created_at?: string
          email: string
          experience_summary?: string | null
          full_name: string
          id?: string
          license_information?: Json
          phone?: string | null
          portfolio_paths?: Json
          role_title: string
          social_links?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          availability?: Json
          business_id?: string | null
          consent?: boolean
          created_at?: string
          email?: string
          experience_summary?: string | null
          full_name?: string
          id?: string
          license_information?: Json
          phone?: string | null
          portfolio_paths?: Json
          role_title?: string
          social_links?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      client_barber_attributions: {
        Row: {
          attribution: string
          barber_user_id: string
          business_id: string
          claim_id: string | null
          client_external_ref: string | null
          client_user_id: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          evidence_summary: Json
          id: string
          locked_at: string | null
          rule_version_id: string | null
          source: string
          updated_at: string
        }
        Insert: {
          attribution?: string
          barber_user_id: string
          business_id: string
          claim_id?: string | null
          client_external_ref?: string | null
          client_user_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          evidence_summary?: Json
          id?: string
          locked_at?: string | null
          rule_version_id?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          attribution?: string
          barber_user_id?: string
          business_id?: string
          claim_id?: string | null
          client_external_ref?: string | null
          client_user_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          evidence_summary?: Json
          id?: string
          locked_at?: string | null
          rule_version_id?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_barber_attributions_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_barber_attributions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_barber_attributions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "attribution_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_barber_attributions_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_barber_attributions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_barber_attributions_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "attribution_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          accessibility_preferences: Json
          birthday: string | null
          business_id: string | null
          created_at: string
          favorite_barber_id: string | null
          grooming_preferences: Json
          marketing_status: string
          preferred_location_id: string | null
          square_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility_preferences?: Json
          birthday?: string | null
          business_id?: string | null
          created_at?: string
          favorite_barber_id?: string | null
          grooming_preferences?: Json
          marketing_status?: string
          preferred_location_id?: string | null
          square_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility_preferences?: Json
          birthday?: string | null
          business_id?: string | null
          created_at?: string
          favorite_barber_id?: string | null
          grooming_preferences?: Json
          marketing_status?: string
          preferred_location_id?: string | null
          square_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_favorite_barber_id_fkey"
            columns: ["favorite_barber_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_profiles_preferred_location_id_fkey"
            columns: ["preferred_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_adjustments: {
        Row: {
          amount_cents: number
          approved_at: string | null
          approved_by: string | null
          barber_user_id: string
          business_id: string
          calculation_id: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string
          reason_code: string
          settlement_period_id: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          approved_by?: string | null
          barber_user_id: string
          business_id: string
          calculation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          reason_code: string
          settlement_period_id?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          approved_by?: string | null
          barber_user_id?: string
          business_id?: string
          calculation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          reason_code?: string
          settlement_period_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_adjustments_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_adjustments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_adjustments_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "commission_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_adjustments_settlement_period_id_fkey"
            columns: ["settlement_period_id"]
            isOneToOne: false
            referencedRelation: "settlement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_calculations: {
        Row: {
          addon_cents: number
          attribution_evidence: Json
          attribution_rule_version_id: string | null
          attribution_source: string
          attribution_type: string
          barber_amount_cents: number
          barber_rate: number
          barber_user_id: string
          booking_metadata_id: string | null
          business_id: string
          calculated_at: string
          calculation_version: number
          cancellation_fee_cents: number
          chargeback_cents: number
          client_user_id: string | null
          commission_rule_version_id: string | null
          created_at: string
          deposit_cents: number
          discount_cents: number
          eligible_basis_cents: number
          excluded_cents: number
          gross_service_cents: number
          id: string
          location_id: string | null
          locked_at: string | null
          membership_cents: number
          metadata: Json
          no_show_fee_cents: number
          package_cents: number
          processing_fee_cents: number
          product_cents: number
          reconciliation_run_id: string | null
          refund_cents: number
          service_id: string | null
          settlement_period_id: string | null
          shop_amount_cents: number
          shop_rate: number
          square_booking_id: string | null
          square_order_id: string | null
          square_payment_id: string | null
          status: string
          tax_cents: number
          tip_cents: number
          updated_at: string
        }
        Insert: {
          addon_cents?: number
          attribution_evidence?: Json
          attribution_rule_version_id?: string | null
          attribution_source: string
          attribution_type: string
          barber_amount_cents?: number
          barber_rate?: number
          barber_user_id: string
          booking_metadata_id?: string | null
          business_id: string
          calculated_at?: string
          calculation_version?: number
          cancellation_fee_cents?: number
          chargeback_cents?: number
          client_user_id?: string | null
          commission_rule_version_id?: string | null
          created_at?: string
          deposit_cents?: number
          discount_cents?: number
          eligible_basis_cents?: number
          excluded_cents?: number
          gross_service_cents?: number
          id?: string
          location_id?: string | null
          locked_at?: string | null
          membership_cents?: number
          metadata?: Json
          no_show_fee_cents?: number
          package_cents?: number
          processing_fee_cents?: number
          product_cents?: number
          reconciliation_run_id?: string | null
          refund_cents?: number
          service_id?: string | null
          settlement_period_id?: string | null
          shop_amount_cents?: number
          shop_rate?: number
          square_booking_id?: string | null
          square_order_id?: string | null
          square_payment_id?: string | null
          status?: string
          tax_cents?: number
          tip_cents?: number
          updated_at?: string
        }
        Update: {
          addon_cents?: number
          attribution_evidence?: Json
          attribution_rule_version_id?: string | null
          attribution_source?: string
          attribution_type?: string
          barber_amount_cents?: number
          barber_rate?: number
          barber_user_id?: string
          booking_metadata_id?: string | null
          business_id?: string
          calculated_at?: string
          calculation_version?: number
          cancellation_fee_cents?: number
          chargeback_cents?: number
          client_user_id?: string | null
          commission_rule_version_id?: string | null
          created_at?: string
          deposit_cents?: number
          discount_cents?: number
          eligible_basis_cents?: number
          excluded_cents?: number
          gross_service_cents?: number
          id?: string
          location_id?: string | null
          locked_at?: string | null
          membership_cents?: number
          metadata?: Json
          no_show_fee_cents?: number
          package_cents?: number
          processing_fee_cents?: number
          product_cents?: number
          reconciliation_run_id?: string | null
          refund_cents?: number
          service_id?: string | null
          settlement_period_id?: string | null
          shop_amount_cents?: number
          shop_rate?: number
          square_booking_id?: string | null
          square_order_id?: string | null
          square_payment_id?: string | null
          status?: string
          tax_cents?: number
          tip_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_calculations_attribution_rule_version_id_fkey"
            columns: ["attribution_rule_version_id"]
            isOneToOne: false
            referencedRelation: "attribution_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_calculations_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_calculations_commission_rule_version_id_fkey"
            columns: ["commission_rule_version_id"]
            isOneToOne: false
            referencedRelation: "commission_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_reconciliation_run_id_fkey"
            columns: ["reconciliation_run_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_settlement_period_id_fkey"
            columns: ["settlement_period_id"]
            isOneToOne: false
            referencedRelation: "settlement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_disputes: {
        Row: {
          adjustment_id: string | null
          barber_user_id: string
          business_id: string
          calculation_id: string
          created_at: string
          due_at: string | null
          evidence: Json
          explanation: string
          id: string
          reason_code: string
          resolution_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          adjustment_id?: string | null
          barber_user_id: string
          business_id: string
          calculation_id: string
          created_at?: string
          due_at?: string | null
          evidence?: Json
          explanation: string
          id?: string
          reason_code: string
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_id?: string | null
          barber_user_id?: string
          business_id?: string
          calculation_id?: string
          created_at?: string
          due_at?: string | null
          evidence?: Json
          explanation?: string
          id?: string
          reason_code?: string
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_disputes_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "commission_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_disputes_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_disputes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_disputes_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "commission_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rule_versions: {
        Row: {
          attribution_type: string | null
          barber_rate: number
          barber_user_id: string | null
          config: Json
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          fixed_barber_cents: number
          fixed_shop_cents: number
          id: string
          include_discounts: boolean
          include_membership_revenue: boolean
          include_processing_fees: boolean
          include_product_revenue: boolean
          include_taxes: boolean
          location_id: string | null
          priority: number
          refund_treatment: string
          rule_id: string
          service_id: string | null
          shop_rate: number
          tips_to_barber: boolean
          version: number
        }
        Insert: {
          attribution_type?: string | null
          barber_rate?: number
          barber_user_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          fixed_barber_cents?: number
          fixed_shop_cents?: number
          id?: string
          include_discounts?: boolean
          include_membership_revenue?: boolean
          include_processing_fees?: boolean
          include_product_revenue?: boolean
          include_taxes?: boolean
          location_id?: string | null
          priority?: number
          refund_treatment?: string
          rule_id: string
          service_id?: string | null
          shop_rate?: number
          tips_to_barber?: boolean
          version: number
        }
        Update: {
          attribution_type?: string | null
          barber_rate?: number
          barber_user_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          fixed_barber_cents?: number
          fixed_shop_cents?: number
          id?: string
          include_discounts?: boolean
          include_membership_revenue?: boolean
          include_processing_fees?: boolean
          include_product_revenue?: boolean
          include_taxes?: boolean
          location_id?: string | null
          priority?: number
          refund_treatment?: string
          rule_id?: string
          service_id?: string | null
          shop_rate?: number
          tips_to_barber?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_rule_versions_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_rule_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rule_versions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rule_versions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rule_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          business_id: string | null
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          ip_hash: string | null
          metadata: Json
          policy_version: string | null
          source: string
          subject_email: string | null
          subject_phone: string | null
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          consent_type: string
          created_at?: string
          granted: boolean
          id?: string
          ip_hash?: string | null
          metadata?: Json
          policy_version?: string | null
          source: string
          subject_email?: string | null
          subject_phone?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          ip_hash?: string | null
          metadata?: Json
          policy_version?: string | null
          source?: string
          subject_email?: string | null
          subject_phone?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_events: {
        Row: {
          actor_user_id: string | null
          barber_visible: boolean
          created_at: string
          dispute_id: string
          event_type: string
          id: number
          metadata: Json
          note: string | null
        }
        Insert: {
          actor_user_id?: string | null
          barber_visible?: boolean
          created_at?: string
          dispute_id: string
          event_type: string
          id?: never
          metadata?: Json
          note?: string | null
        }
        Update: {
          actor_user_id?: string | null
          barber_visible?: boolean
          created_at?: string
          dispute_id?: string
          event_type?: string
          id?: never
          metadata?: Json
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_events_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "commission_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_inquiries: {
        Row: {
          business_id: string | null
          created_at: string
          email: string
          event_date: string | null
          event_type: string
          full_name: string
          guest_count: number | null
          id: string
          location_request: string | null
          notes: string | null
          phone: string | null
          requested_services: Json
          status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          email: string
          event_date?: string | null
          event_type: string
          full_name: string
          guest_count?: number | null
          id?: string
          location_request?: string | null
          notes?: string | null
          phone?: string | null
          requested_services?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          email?: string
          event_date?: string | null
          event_type?: string
          full_name?: string
          guest_count?: number | null
          id?: string
          location_request?: string | null
          notes?: string | null
          phone?: string | null
          requested_services?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_inquiries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: Json
          business_id: string
          category: string
          created_at: string
          id: string
          question: Json
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          answer?: Json
          business_id: string
          category?: string
          created_at?: string
          id?: string
          question?: Json
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          answer?: Json
          business_id?: string
          category?: string
          created_at?: string
          id?: string
          question?: Json
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          scope: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          scope?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          scope?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          barber_user_id: string | null
          booking_metadata_id: string | null
          business_id: string
          client_user_id: string | null
          comments: string | null
          consent_to_publish: boolean
          created_at: string
          id: string
          language: string
          requires_follow_up: boolean
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          barber_user_id?: string | null
          booking_metadata_id?: string | null
          business_id: string
          client_user_id?: string | null
          comments?: string | null
          consent_to_publish?: boolean
          created_at?: string
          id?: string
          language?: string
          requires_follow_up?: boolean
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          barber_user_id?: string | null
          booking_metadata_id?: string | null
          business_id?: string
          client_user_id?: string | null
          comments?: string | null
          consent_to_publish?: boolean
          created_at?: string
          id?: string
          language?: string
          requires_follow_up?: boolean
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feedback_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      holiday_hours: {
        Row: {
          closed: boolean
          closes_at: string | null
          created_at: string
          id: string
          location_id: string
          note: Json
          opens_at: string | null
          service_date: string
          updated_at: string
        }
        Insert: {
          closed?: boolean
          closes_at?: string | null
          created_at?: string
          id?: string
          location_id: string
          note?: Json
          opens_at?: string | null
          service_date: string
          updated_at?: string
        }
        Update: {
          closed?: boolean
          closes_at?: string | null
          created_at?: string
          id?: string
          location_id?: string
          note?: Json
          opens_at?: string | null
          service_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_client_roster_entries: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          decision_reason: string | null
          id: string
          prior_place: string | null
          prior_service_date: string | null
          roster_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          decision_reason?: string | null
          id?: string
          prior_place?: string | null
          prior_service_date?: string | null
          roster_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          decision_reason?: string | null
          id?: string
          prior_place?: string | null
          prior_service_date?: string | null
          roster_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_client_roster_entries_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "imported_client_rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_client_rosters: {
        Row: {
          barber_user_id: string
          business_id: string
          created_at: string
          id: string
          policy_version: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          barber_user_id: string
          business_id: string
          created_at?: string
          id?: string
          policy_version: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          barber_user_id?: string
          business_id?: string
          created_at?: string
          id?: string
          policy_version?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_client_rosters_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "imported_client_rosters_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_client_rosters_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          business_id: string
          created_at: string
          environment: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          last_error_at: string | null
          last_success_at: string | null
          provider: string
          public_config: Json
          secret_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          environment?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_success_at?: string | null
          provider: string
          public_config?: Json
          secret_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          environment?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_success_at?: string | null
          provider?: string
          public_config?: Json
          secret_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: number
          lead_id: string
          metadata: Json
          note: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: never
          lead_id: string
          metadata?: Json
          note?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: never
          lead_id?: string
          metadata?: Json
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string | null
          campaign: string | null
          consent: Json
          created_at: string
          email: string | null
          full_name: string
          id: string
          location_id: string | null
          next_follow_up_at: string | null
          owner_user_id: string | null
          payload: Json
          phone: string | null
          preferred_language: string
          service_interest: string | null
          source: string
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          campaign?: string | null
          consent?: Json
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          location_id?: string | null
          next_follow_up_at?: string | null
          owner_user_id?: string | null
          payload?: Json
          phone?: string | null
          preferred_language?: string
          service_interest?: string | null
          source?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          campaign?: string | null
          consent?: Json
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          location_id?: string | null
          next_follow_up_at?: string | null
          owner_user_id?: string | null
          payload?: Json
          phone?: string | null
          preferred_language?: string
          service_interest?: string | null
          source?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_settings: {
        Row: {
          default_buffer_minutes: number
          kiosk_enabled: boolean
          location_id: string
          max_queue_size: number
          settings: Json
          updated_at: string
          walk_ins_enabled: boolean
        }
        Insert: {
          default_buffer_minutes?: number
          kiosk_enabled?: boolean
          location_id: string
          max_queue_size?: number
          settings?: Json
          updated_at?: string
          walk_ins_enabled?: boolean
        }
        Update: {
          default_buffer_minutes?: number
          kiosk_enabled?: boolean
          location_id?: string
          max_queue_size?: number
          settings?: Json
          updated_at?: string
          walk_ins_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "location_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          accessibility_notes: Json
          active: boolean
          address_line_1: string | null
          address_line_2: string | null
          business_id: string
          city: string | null
          country_code: string
          created_at: string
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          parking_notes: Json
          phone: string | null
          postal_code: string | null
          region: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          accessibility_notes?: Json
          active?: boolean
          address_line_1?: string | null
          address_line_2?: string | null
          business_id: string
          city?: string | null
          country_code?: string
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          parking_notes?: Json
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          accessibility_notes?: Json
          active?: boolean
          address_line_1?: string | null
          address_line_2?: string | null
          business_id?: string
          city?: string | null
          country_code?: string
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          parking_notes?: Json
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: Json
          business_id: string
          byte_size: number | null
          caption: Json
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          metadata: Json
          mime_type: string | null
          moderation_status: string
          privacy: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: Json
          business_id: string
          byte_size?: number | null
          caption?: Json
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          moderation_status?: string
          privacy?: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: Json
          business_id?: string
          byte_size?: number | null
          caption?: Json
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          moderation_status?: string
          privacy?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: number
          membership_id: string
          metadata: Json
          next_status: string | null
          previous_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: never
          membership_id: string
          metadata?: Json
          next_status?: string | null
          previous_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: never
          membership_id?: string
          metadata?: Json
          next_status?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          active: boolean
          benefits: Json
          billing_interval: string
          business_id: string
          cancellation_rules: Json
          created_at: string
          demo: boolean
          description: Json
          featured: boolean
          id: string
          included_services: Json
          name: Json
          pause_rules: Json
          price_cents: number
          slug: string
          square_catalog_id: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          usage_rules: Json
        }
        Insert: {
          active?: boolean
          benefits?: Json
          billing_interval?: string
          business_id: string
          cancellation_rules?: Json
          created_at?: string
          demo?: boolean
          description?: Json
          featured?: boolean
          id?: string
          included_services?: Json
          name?: Json
          pause_rules?: Json
          price_cents?: number
          slug: string
          square_catalog_id?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          usage_rules?: Json
        }
        Update: {
          active?: boolean
          benefits?: Json
          billing_interval?: string
          business_id?: string
          cancellation_rules?: Json
          created_at?: string
          demo?: boolean
          description?: Json
          featured?: boolean
          id?: string
          included_services?: Json
          name?: Json
          pause_rules?: Json
          price_cents?: number
          slug?: string
          square_catalog_id?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          usage_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_usage: {
        Row: {
          amount_cents: number
          booking_metadata_id: string | null
          id: string
          membership_id: string
          metadata: Json
          occurred_at: string
          quantity: number
          service_id: string | null
          usage_type: string
        }
        Insert: {
          amount_cents?: number
          booking_metadata_id?: string | null
          id?: string
          membership_id: string
          metadata?: Json
          occurred_at?: string
          quantity?: number
          service_id?: string | null
          usage_type?: string
        }
        Update: {
          amount_cents?: number
          booking_metadata_id?: string | null
          id?: string
          membership_id?: string
          metadata?: Json
          occurred_at?: string
          quantity?: number
          service_id?: string | null
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_usage_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_usage_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          business_id: string
          cancelled_at: string | null
          client_user_id: string
          created_at: string
          id: string
          metadata: Json
          paused_at: string | null
          plan_id: string
          renews_at: string | null
          square_subscription_id: string | null
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cancelled_at?: string | null
          client_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          paused_at?: string | null
          plan_id: string
          renews_at?: string | null
          square_subscription_id?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancelled_at?: string | null
          client_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          paused_at?: string | null
          plan_id?: string
          renews_at?: string | null
          square_subscription_id?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          business_id: string
          channel: string
          created_at: string
          id: string
          key: string
          locale: string
          status: Database["public"]["Enums"]["record_status"]
          subject: string | null
          transactional: boolean
          updated_at: string
          variables: string[]
        }
        Insert: {
          body: string
          business_id: string
          channel: string
          created_at?: string
          id?: string
          key: string
          locale?: string
          status?: Database["public"]["Enums"]["record_status"]
          subject?: string | null
          transactional?: boolean
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body?: string
          business_id?: string
          channel?: string
          created_at?: string
          id?: string
          key?: string
          locale?: string
          status?: Database["public"]["Enums"]["record_status"]
          subject?: string | null
          transactional?: boolean
          updated_at?: string
          variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_items: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          href: string
          id: string
          label: string
          locale: string
          parent_id: string | null
          placement: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          href: string
          id?: string
          label: string
          locale?: string
          parent_id?: string | null
          placement?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          href?: string
          id?: string
          label?: string
          locale?: string
          parent_id?: string | null
          placement?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempt: number
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          job_id: string
          provider: string
          provider_message_id: string | null
          sanitized_response: Json
          status: string
        }
        Insert: {
          attempt: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          provider: string
          provider_message_id?: string | null
          sanitized_response?: Json
          status: string
        }
        Update: {
          attempt?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          provider?: string
          provider_message_id?: string | null
          sanitized_response?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          attempt_count: number
          automation_run_id: string | null
          business_id: string | null
          channel: string
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          locale: string
          max_attempts: number
          payload: Json
          recipient: string | null
          scheduled_for: string
          status: string
          template_key: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          automation_run_id?: string | null
          business_id?: string | null
          channel: string
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          locale?: string
          max_attempts?: number
          payload?: Json
          recipient?: string | null
          scheduled_for?: string
          status?: string
          template_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          automation_run_id?: string | null
          business_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          locale?: string
          max_attempts?: number
          payload?: Json
          recipient?: string | null
          scheduled_for?: string
          status?: string
          template_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_automation_run_id_fkey"
            columns: ["automation_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          marketing_email: boolean
          marketing_sms: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string
          transactional_email: boolean
          transactional_sms: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          marketing_email?: boolean
          marketing_sms?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          transactional_email?: boolean
          transactional_sms?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          marketing_email?: boolean
          marketing_sms?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          transactional_email?: boolean
          transactional_sms?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_redemptions: {
        Row: {
          booking_metadata_id: string | null
          client_user_id: string | null
          id: string
          metadata: Json
          package_id: string
          redeemed_at: string
          value_cents: number
        }
        Insert: {
          booking_metadata_id?: string | null
          client_user_id?: string | null
          id?: string
          metadata?: Json
          package_id: string
          redeemed_at?: string
          value_cents: number
        }
        Update: {
          booking_metadata_id?: string | null
          client_user_id?: string | null
          id?: string
          metadata?: Json
          package_id?: string
          redeemed_at?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_redemptions_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_redemptions_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "package_redemptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          business_id: string
          created_at: string
          description: Json
          id: string
          name: Json
          per_visit_value_cents: number | null
          price_cents: number
          status: string
          updated_at: string
          visits: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: Json
          id?: string
          name: Json
          per_visit_value_cents?: number | null
          price_cents: number
          status?: string
          updated_at?: string
          visits: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: Json
          id?: string
          name?: Json
          per_visit_value_cents?: number | null
          price_cents?: number
          status?: string
          updated_at?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      page_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          page_id: string
          section_key: string
          settings: Json
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          page_id: string
          section_key: string
          settings?: Json
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          page_id?: string
          section_key?: string
          settings?: Json
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          approved_by: string | null
          body: Json
          business_id: string
          canonical_path: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          locale: string
          published_at: string | null
          scheduled_for: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["record_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          body?: Json
          business_id: string
          canonical_path?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          locale?: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["record_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          body?: Json
          business_id?: string
          canonical_path?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          locale?: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["record_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      policy_acknowledgements: {
        Row: {
          acknowledged_at: string
          acknowledgement_text: string
          id: string
          ip_hash: string | null
          policy_version_id: string
          signature_name: string | null
          user_agent_hash: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          acknowledgement_text: string
          id?: string
          ip_hash?: string | null
          policy_version_id: string
          signature_name?: string | null
          user_agent_hash?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          acknowledgement_text?: string
          id?: string
          ip_hash?: string | null
          policy_version_id?: string
          signature_name?: string | null
          user_agent_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_acknowledgements_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_approvals: {
        Row: {
          approved_value: Json | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          effective_from: string | null
          id: string
          owner_decision: string | null
          owner_initials: string | null
          policy_version_id: string
          rule_key: string
          rule_label: string
          rule_state: string
        }
        Insert: {
          approved_value?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          effective_from?: string | null
          id?: string
          owner_decision?: string | null
          owner_initials?: string | null
          policy_version_id: string
          rule_key: string
          rule_label: string
          rule_state: string
        }
        Update: {
          approved_value?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          effective_from?: string | null
          id?: string
          owner_decision?: string | null
          owner_initials?: string | null
          policy_version_id?: string
          rule_key?: string
          rule_label?: string
          rule_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_approvals_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_open_items: {
        Row: {
          answer: Json | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          item_number: number
          owner_note: string | null
          policy_version_id: string
          question: string
          status: string
        }
        Insert: {
          answer?: Json | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          item_number: number
          owner_note?: string | null
          policy_version_id: string
          question: string
          status?: string
        }
        Update: {
          answer?: Json | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          item_number?: number
          owner_note?: string | null
          policy_version_id?: string
          question?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_open_items_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_open_items_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          policy_key: string
          policy_snapshot: Json
          published_at: string | null
          source_document: string | null
          status: string
          title: string
          version: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          policy_key: string
          policy_snapshot?: Json
          published_at?: string | null
          source_document?: string | null
          status?: string
          title: string
          version: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          policy_key?: string
          policy_snapshot?: Json
          published_at?: string | null
          source_document?: string | null
          status?: string
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_versions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          approved_by: string | null
          barber_profile_id: string | null
          business_id: string
          caption: Json
          created_at: string
          featured: boolean
          id: string
          item_type: string
          media_asset_id: string
          published_at: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["record_status"]
          tags: string[]
          title: Json
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          barber_profile_id?: string | null
          business_id: string
          caption?: Json
          created_at?: string
          featured?: boolean
          id?: string
          item_type?: string
          media_asset_id: string
          published_at?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          tags?: string[]
          title?: Json
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          barber_profile_id?: string | null
          business_id?: string
          caption?: Json
          created_at?: string
          featured?: boolean
          id?: string
          item_type?: string
          media_asset_id?: string
          published_at?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          tags?: string[]
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_barber_profile_id_fkey"
            columns: ["barber_profile_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          active: boolean
          amount_cents: number | null
          business_id: string
          conditions: Json
          created_at: string
          ends_at: string | null
          id: string
          location_id: string | null
          name: string
          percentage: number | null
          priority: number
          rule_type: string
          service_id: string | null
          staff_user_id: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents?: number | null
          business_id: string
          conditions?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          location_id?: string | null
          name: string
          percentage?: number | null
          priority?: number
          rule_type: string
          service_id?: string | null
          staff_user_id?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number | null
          business_id?: string
          conditions?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          location_id?: string | null
          name?: string
          percentage?: number | null
          priority?: number
          rule_type?: string
          service_id?: string | null
          staff_user_id?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          phone: string | null
          preferred_language: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          phone?: string | null
          preferred_language?: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          preferred_language?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          business_id: string
          code: string | null
          content: Json
          created_at: string
          eligibility: Json
          ends_at: string | null
          id: string
          location_id: string | null
          name: string
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          code?: string | null
          content?: Json
          created_at?: string
          eligibility?: Json
          ends_at?: string | null
          id?: string
          location_id?: string | null
          name: string
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          code?: string | null
          content?: Json
          created_at?: string
          eligibility?: Json
          ends_at?: string | null
          id?: string
          location_id?: string | null
          name?: string
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_assignments: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string | null
          assignment_source: string
          barber_user_id: string
          explanation: Json
          id: string
          queue_entry_id: string
          reason: string | null
          released_at: string | null
          rule_version_id: string | null
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: string
          barber_user_id: string
          explanation?: Json
          id?: string
          queue_entry_id: string
          reason?: string | null
          released_at?: string | null
          rule_version_id?: string | null
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: string
          barber_user_id?: string
          explanation?: Json
          id?: string
          queue_entry_id?: string
          reason?: string | null
          released_at?: string | null
          rule_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_assignments_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_assignments_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "queue_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_assignments_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "assignment_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_entries: {
        Row: {
          attribution_source: string
          barber_preference: string | null
          business_id: string | null
          called_at: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          completed_at: string | null
          created_at: string
          estimated_wait_minutes: number | null
          id: string
          joined_at: string
          location_id: string | null
          manual_priority: number
          metadata: Json
          preferred_barber_id: string | null
          public_token: string
          service_id: string | null
          service_slug: string | null
          service_started_at: string | null
          status: string
          updated_at: string
          walkin_session_id: string | null
        }
        Insert: {
          attribution_source?: string
          barber_preference?: string | null
          business_id?: string | null
          called_at?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_wait_minutes?: number | null
          id?: string
          joined_at?: string
          location_id?: string | null
          manual_priority?: number
          metadata?: Json
          preferred_barber_id?: string | null
          public_token: string
          service_id?: string | null
          service_slug?: string | null
          service_started_at?: string | null
          status?: string
          updated_at?: string
          walkin_session_id?: string | null
        }
        Update: {
          attribution_source?: string
          barber_preference?: string | null
          business_id?: string | null
          called_at?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_wait_minutes?: number | null
          id?: string
          joined_at?: string
          location_id?: string | null
          manual_priority?: number
          metadata?: Json
          preferred_barber_id?: string | null
          public_token?: string
          service_id?: string | null
          service_slug?: string | null
          service_started_at?: string | null
          status?: string
          updated_at?: string
          walkin_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_preferred_barber_id_fkey"
            columns: ["preferred_barber_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_walkin_session_id_fkey"
            columns: ["walkin_session_id"]
            isOneToOne: false
            referencedRelation: "walkin_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: number
          note: string | null
          queue_entry_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          note?: string | null
          queue_entry_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          note?: string | null
          queue_entry_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_status_history_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "queue_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_exceptions: {
        Row: {
          business_id: string
          created_at: string
          details: Json
          exception_code: string
          id: string
          message: string
          reconciliation_run_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          resource_id: string | null
          resource_type: string
          severity: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          details?: Json
          exception_code: string
          id?: string
          message: string
          reconciliation_run_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string | null
          resource_type: string
          severity?: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          details?: Json
          exception_code?: string
          id?: string
          message?: string
          reconciliation_run_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string | null
          resource_type?: string
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_exceptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_exceptions_reconciliation_run_id_fkey"
            columns: ["reconciliation_run_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_runs: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string
          error_summary: string | null
          id: string
          initiated_by: string | null
          run_type: string
          settlement_period_id: string | null
          started_at: string | null
          status: string
          summary: Json
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          initiated_by?: string | null
          run_type?: string
          settlement_period_id?: string | null
          started_at?: string | null
          status?: string
          summary?: Json
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          initiated_by?: string | null
          run_type?: string
          settlement_period_id?: string | null
          started_at?: string | null
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_runs_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_runs_settlement_period_id_fkey"
            columns: ["settlement_period_id"]
            isOneToOne: false
            referencedRelation: "settlement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          business_id: string
          code: string
          created_at: string
          fraud_flags: Json
          id: string
          metadata: Json
          qualified_at: string | null
          referred_client_id: string | null
          referring_barber_id: string | null
          referring_client_id: string | null
          reward_cents: number
          rewarded_at: string | null
          source: string | null
          status: string
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          fraud_flags?: Json
          id?: string
          metadata?: Json
          qualified_at?: string | null
          referred_client_id?: string | null
          referring_barber_id?: string | null
          referring_client_id?: string | null
          reward_cents?: number
          rewarded_at?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          fraud_flags?: Json
          id?: string
          metadata?: Json
          qualified_at?: string | null
          referred_client_id?: string | null
          referring_barber_id?: string | null
          referring_client_id?: string | null
          reward_cents?: number
          rewarded_at?: string | null
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referring_barber_id_fkey"
            columns: ["referring_barber_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referring_client_id_fkey"
            columns: ["referring_client_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_display_name: string | null
          business_id: string
          created_at: string
          external_id: string | null
          feedback_id: string | null
          id: string
          public_url: string | null
          published_at: string | null
          rating: number | null
          response_text: string | null
          review_text: string | null
          source: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          verified: boolean
        }
        Insert: {
          author_display_name?: string | null
          business_id: string
          created_at?: string
          external_id?: string | null
          feedback_id?: string | null
          id?: string
          public_url?: string | null
          published_at?: string | null
          rating?: number | null
          response_text?: string | null
          review_text?: string | null
          source: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          verified?: boolean
        }
        Update: {
          author_display_name?: string | null
          business_id?: string
          created_at?: string
          external_id?: string | null
          feedback_id?: string | null
          id?: string
          public_url?: string | null
          published_at?: string | null
          rating?: number | null
          response_text?: string | null
          review_text?: string | null
          source?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_ledger: {
        Row: {
          actor_user_id: string | null
          balance_after: number | null
          business_id: string
          client_user_id: string
          created_at: string
          description: string | null
          entry_type: string
          id: string
          points: number
          referral_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          balance_after?: number | null
          business_id: string
          client_user_id: string
          created_at?: string
          description?: string | null
          entry_type: string
          id?: string
          points: number
          referral_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          balance_after?: number | null
          business_id?: string
          client_user_id?: string
          created_at?: string
          description?: string | null
          entry_type?: string
          id?: string
          points?: number
          referral_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_ledger_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_ledger_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rewards_ledger_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_staff: boolean
          key: Database["public"]["Enums"]["app_role"]
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_staff?: boolean
          key: Database["public"]["Enums"]["app_role"]
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_staff?: boolean
          key?: Database["public"]["Enums"]["app_role"]
          name?: string
        }
        Relationships: []
      }
      scheduled_jobs: {
        Row: {
          active: boolean
          business_id: string | null
          handler: string
          id: string
          key: string
          last_completed_at: string | null
          last_started_at: string | null
          last_status: string | null
          metadata: Json
          next_run_at: string | null
          schedule: string
        }
        Insert: {
          active?: boolean
          business_id?: string | null
          handler: string
          id?: string
          key: string
          last_completed_at?: string | null
          last_started_at?: string | null
          last_status?: string | null
          metadata?: Json
          next_run_at?: string | null
          schedule: string
        }
        Update: {
          active?: boolean
          business_id?: string | null
          handler?: string
          id?: string
          key?: string
          last_completed_at?: string | null
          last_started_at?: string | null
          last_status?: string | null
          metadata?: Json
          next_run_at?: string | null
          schedule?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_addons: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          description: Json
          duration_minutes: number
          id: string
          name: Json
          price_cents: number
          service_id: string | null
          slug: string
          square_catalog_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          description?: Json
          duration_minutes?: number
          id?: string
          name: Json
          price_cents?: number
          service_id?: string | null
          slug: string
          square_catalog_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          description?: Json
          duration_minutes?: number
          id?: string
          name?: Json
          price_cents?: number
          service_id?: string | null
          slug?: string
          square_catalog_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_addons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addons_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          description: Json
          id: string
          name: Json
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          description?: Json
          id?: string
          name: Json
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          description?: Json
          id?: string
          name?: Json
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_locations: {
        Row: {
          active: boolean
          created_at: string
          location_id: string
          service_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          location_id: string
          service_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          location_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_locations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          benefits: Json
          bookable: boolean
          business_id: string
          category_id: string | null
          content_status: Database["public"]["Enums"]["record_status"]
          created_at: string
          deposit_cents: number | null
          duration_minutes: number | null
          featured: boolean
          full_description: Json
          id: string
          image_path: string | null
          maintenance_interval_days: number | null
          name: Json
          preparation: Json
          price_cents: number | null
          seo: Json
          short_description: Json
          slug: string
          sort_order: number
          square_catalog_id: string | null
          starting_price: boolean
          updated_at: string
          video_path: string | null
        }
        Insert: {
          active?: boolean
          benefits?: Json
          bookable?: boolean
          business_id: string
          category_id?: string | null
          content_status?: Database["public"]["Enums"]["record_status"]
          created_at?: string
          deposit_cents?: number | null
          duration_minutes?: number | null
          featured?: boolean
          full_description?: Json
          id?: string
          image_path?: string | null
          maintenance_interval_days?: number | null
          name: Json
          preparation?: Json
          price_cents?: number | null
          seo?: Json
          short_description?: Json
          slug: string
          sort_order?: number
          square_catalog_id?: string | null
          starting_price?: boolean
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          active?: boolean
          benefits?: Json
          bookable?: boolean
          business_id?: string
          category_id?: string | null
          content_status?: Database["public"]["Enums"]["record_status"]
          created_at?: string
          deposit_cents?: number | null
          duration_minutes?: number | null
          featured?: boolean
          full_description?: Json
          id?: string
          image_path?: string | null
          maintenance_interval_days?: number | null
          name?: Json
          preparation?: Json
          price_cents?: number | null
          seo?: Json
          short_description?: Json
          slug?: string
          sort_order?: number
          square_catalog_id?: string | null
          starting_price?: boolean
          updated_at?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_periods: {
        Row: {
          business_id: string
          created_at: string
          ends_at: string
          id: string
          label: string
          location_id: string | null
          locked_at: string | null
          locked_by: string | null
          review_deadline: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          ends_at: string
          id?: string
          label: string
          location_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          review_deadline?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          label?: string
          location_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          review_deadline?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_periods_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_periods_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_statements: {
        Row: {
          adjustments_cents: number
          barber_user_id: string
          business_id: string
          created_at: string
          final_amount_cents: number
          gross_basis_cents: number
          id: string
          paid_at: string | null
          published_at: string | null
          refunds_cents: number
          settlement_period_id: string
          statement_snapshot: Json
          status: string
          tips_cents: number
          updated_at: string
        }
        Insert: {
          adjustments_cents?: number
          barber_user_id: string
          business_id: string
          created_at?: string
          final_amount_cents?: number
          gross_basis_cents?: number
          id?: string
          paid_at?: string | null
          published_at?: string | null
          refunds_cents?: number
          settlement_period_id: string
          statement_snapshot?: Json
          status?: string
          tips_cents?: number
          updated_at?: string
        }
        Update: {
          adjustments_cents?: number
          barber_user_id?: string
          business_id?: string
          created_at?: string
          final_amount_cents?: number
          gross_basis_cents?: number
          id?: string
          paid_at?: string | null
          published_at?: string | null
          refunds_cents?: number
          settlement_period_id?: string
          statement_snapshot?: Json
          status?: string
          tips_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_statements_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "settlement_statements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_statements_settlement_period_id_fkey"
            columns: ["settlement_period_id"]
            isOneToOne: false
            referencedRelation: "settlement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      square_bookings: {
        Row: {
          business_id: string
          duration_minutes: number | null
          id: string
          location_id: string | null
          raw: Json
          square_customer_id: string | null
          square_id: string
          square_team_member_id: string | null
          starts_at: string | null
          status: string | null
          synced_at: string
          version: number | null
        }
        Insert: {
          business_id: string
          duration_minutes?: number | null
          id?: string
          location_id?: string | null
          raw?: Json
          square_customer_id?: string | null
          square_id: string
          square_team_member_id?: string | null
          starts_at?: string | null
          status?: string | null
          synced_at?: string
          version?: number | null
        }
        Update: {
          business_id?: string
          duration_minutes?: number | null
          id?: string
          location_id?: string | null
          raw?: Json
          square_customer_id?: string | null
          square_id?: string
          square_team_member_id?: string | null
          starts_at?: string | null
          status?: string | null
          synced_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "square_bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      square_catalog_objects: {
        Row: {
          addon_id: string | null
          business_id: string
          id: string
          object_type: string | null
          raw: Json
          service_id: string | null
          square_id: string
          synced_at: string
          version: number | null
        }
        Insert: {
          addon_id?: string | null
          business_id: string
          id?: string
          object_type?: string | null
          raw?: Json
          service_id?: string | null
          square_id: string
          synced_at?: string
          version?: number | null
        }
        Update: {
          addon_id?: string | null
          business_id?: string
          id?: string
          object_type?: string | null
          raw?: Json
          service_id?: string | null
          square_id?: string
          synced_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "square_catalog_objects_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "service_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_catalog_objects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_catalog_objects_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      square_customers: {
        Row: {
          business_id: string
          client_user_id: string | null
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          raw: Json
          square_id: string
          synced_at: string
        }
        Insert: {
          business_id: string
          client_user_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          raw?: Json
          square_id: string
          synced_at?: string
        }
        Update: {
          business_id?: string
          client_user_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          raw?: Json
          square_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "square_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_customers_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      square_locations: {
        Row: {
          business_id: string
          id: string
          location_id: string | null
          name: string | null
          raw: Json
          square_id: string
          status: string | null
          synced_at: string
        }
        Insert: {
          business_id: string
          id?: string
          location_id?: string | null
          name?: string | null
          raw?: Json
          square_id: string
          status?: string | null
          synced_at?: string
        }
        Update: {
          business_id?: string
          id?: string
          location_id?: string | null
          name?: string | null
          raw?: Json
          square_id?: string
          status?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "square_locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      square_orders: {
        Row: {
          business_id: string
          customer_square_id: string | null
          discount_cents: number | null
          id: string
          location_square_id: string | null
          raw: Json
          square_id: string
          state: string | null
          synced_at: string
          tax_cents: number | null
          total_cents: number | null
        }
        Insert: {
          business_id: string
          customer_square_id?: string | null
          discount_cents?: number | null
          id?: string
          location_square_id?: string | null
          raw?: Json
          square_id: string
          state?: string | null
          synced_at?: string
          tax_cents?: number | null
          total_cents?: number | null
        }
        Update: {
          business_id?: string
          customer_square_id?: string | null
          discount_cents?: number | null
          id?: string
          location_square_id?: string | null
          raw?: Json
          square_id?: string
          state?: string | null
          synced_at?: string
          tax_cents?: number | null
          total_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "square_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      square_payments: {
        Row: {
          amount_cents: number
          business_id: string
          card_brand: string | null
          created_at_square: string | null
          id: string
          processing_fee_cents: number
          raw: Json
          square_customer_id: string | null
          square_id: string
          square_order_id: string | null
          status: string | null
          synced_at: string
          tip_cents: number
        }
        Insert: {
          amount_cents?: number
          business_id: string
          card_brand?: string | null
          created_at_square?: string | null
          id?: string
          processing_fee_cents?: number
          raw?: Json
          square_customer_id?: string | null
          square_id: string
          square_order_id?: string | null
          status?: string | null
          synced_at?: string
          tip_cents?: number
        }
        Update: {
          amount_cents?: number
          business_id?: string
          card_brand?: string | null
          created_at_square?: string | null
          id?: string
          processing_fee_cents?: number
          raw?: Json
          square_customer_id?: string | null
          square_id?: string
          square_order_id?: string | null
          status?: string | null
          synced_at?: string
          tip_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "square_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      square_refunds: {
        Row: {
          amount_cents: number
          business_id: string
          id: string
          raw: Json
          reason: string | null
          square_id: string
          square_payment_id: string
          status: string | null
          synced_at: string
        }
        Insert: {
          amount_cents?: number
          business_id: string
          id?: string
          raw?: Json
          reason?: string | null
          square_id: string
          square_payment_id: string
          status?: string | null
          synced_at?: string
        }
        Update: {
          amount_cents?: number
          business_id?: string
          id?: string
          raw?: Json
          reason?: string | null
          square_id?: string
          square_payment_id?: string
          status?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "square_refunds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      square_sync_state: {
        Row: {
          business_id: string
          cursor: string | null
          id: string
          last_error: string | null
          last_error_at: string | null
          last_success_at: string | null
          last_synced_at: string | null
          metadata: Json
          resource_type: string
          status: string
        }
        Insert: {
          business_id: string
          cursor?: string | null
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_success_at?: string | null
          last_synced_at?: string | null
          metadata?: Json
          resource_type: string
          status?: string
        }
        Update: {
          business_id?: string
          cursor?: string | null
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_success_at?: string | null
          last_synced_at?: string | null
          metadata?: Json
          resource_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "square_sync_state_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      square_team_members: {
        Row: {
          business_id: string
          display_name: string | null
          id: string
          raw: Json
          square_id: string
          staff_user_id: string | null
          status: string | null
          synced_at: string
        }
        Insert: {
          business_id: string
          display_name?: string | null
          id?: string
          raw?: Json
          square_id: string
          staff_user_id?: string | null
          status?: string | null
          synced_at?: string
        }
        Update: {
          business_id?: string
          display_name?: string | null
          id?: string
          raw?: Json
          square_id?: string
          staff_user_id?: string | null
          status?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "square_team_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_team_members_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          active: boolean
          biography: Json
          business_id: string
          certifications: Json
          created_at: string
          employee_code: string | null
          internal_notes: string | null
          languages: string[]
          location_id: string | null
          professional_title: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          active?: boolean
          biography?: Json
          business_id: string
          certifications?: Json
          created_at?: string
          employee_code?: string | null
          internal_notes?: string | null
          languages?: string[]
          location_id?: string | null
          professional_title?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          active?: boolean
          biography?: Json
          business_id?: string
          certifications?: Json
          created_at?: string
          employee_code?: string | null
          internal_notes?: string | null
          languages?: string[]
          location_id?: string | null
          professional_title?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          active: boolean
          created_at: string
          duration_override_minutes: number | null
          price_override_cents: number | null
          service_id: string
          staff_user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_override_minutes?: number | null
          price_override_cents?: number | null
          service_id: string
          staff_user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_override_minutes?: number | null
          price_override_cents?: number | null
          service_id?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      statement_deliveries: {
        Row: {
          acknowledged_at: string | null
          attempt_count: number
          channel: string
          created_at: string
          delivered_at: string | null
          id: string
          last_error: string | null
          provider_message_id: string | null
          recipient: string | null
          sent_at: string | null
          statement_id: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          attempt_count?: number
          channel: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          statement_id: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          attempt_count?: number
          channel?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          statement_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_deliveries_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "settlement_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      support_case_events: {
        Row: {
          actor_user_id: string | null
          attachments: Json
          case_id: string
          client_visible: boolean
          created_at: string
          event_type: string
          id: number
          message: string | null
          metadata: Json
        }
        Insert: {
          actor_user_id?: string | null
          attachments?: Json
          case_id: string
          client_visible?: boolean
          created_at?: string
          event_type: string
          id?: never
          message?: string | null
          metadata?: Json
        }
        Update: {
          actor_user_id?: string | null
          attachments?: Json
          case_id?: string
          client_visible?: boolean
          created_at?: string
          event_type?: string
          id?: never
          message?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "support_case_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cases: {
        Row: {
          assigned_to: string | null
          booking_metadata_id: string | null
          business_id: string
          case_number: string
          category: string
          client_user_id: string | null
          created_at: string
          description: string | null
          feedback_id: string | null
          id: string
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          booking_metadata_id?: string | null
          business_id: string
          case_number: string
          category: string
          client_user_id?: string | null
          created_at?: string
          description?: string | null
          feedback_id?: string | null
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          booking_metadata_id?: string | null
          business_id?: string
          case_number?: string
          category?: string
          client_user_id?: string | null
          created_at?: string
          description?: string | null
          feedback_id?: string | null
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_booking_metadata_id_fkey"
            columns: ["booking_metadata_id"]
            isOneToOne: false
            referencedRelation: "booking_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_cases_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_failures: {
        Row: {
          business_id: string | null
          created_at: string
          details: Json
          error_code: string | null
          id: string
          message: string
          next_retry_at: string | null
          provider: string
          resource_id: string | null
          resource_type: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          details?: Json
          error_code?: string | null
          id?: string
          message: string
          next_retry_at?: string | null
          provider: string
          resource_id?: string | null
          resource_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          details?: Json
          error_code?: string | null
          id?: string
          message?: string
          next_retry_at?: string | null
          provider?: string
          resource_id?: string | null
          resource_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_failures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          key: string
          sensitivity: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          key: string
          sensitivity?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          key?: string
          sensitivity?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author_display_name: string | null
          barber_user_id: string | null
          business_id: string
          client_user_id: string | null
          created_at: string
          id: string
          permission_to_publish: boolean
          published_at: string | null
          quote: Json
          rating: number | null
          service_id: string | null
          source: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          verified: boolean
        }
        Insert: {
          author_display_name?: string | null
          barber_user_id?: string | null
          business_id: string
          client_user_id?: string | null
          created_at?: string
          id?: string
          permission_to_publish?: boolean
          published_at?: string | null
          quote?: Json
          rating?: number | null
          service_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          verified?: boolean
        }
        Update: {
          author_display_name?: string | null
          barber_user_id?: string | null
          business_id?: string
          client_user_id?: string | null
          created_at?: string
          id?: string
          permission_to_publish?: boolean
          published_at?: string | null
          quote?: Json
          rating?: number | null
          service_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_barber_user_id_fkey"
            columns: ["barber_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "testimonials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "testimonials_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          business_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          intended_role: Database["public"]["Enums"]["app_role"]
          invited_by: string | null
          location_id: string | null
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          business_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          intended_role: Database["public"]["Enums"]["app_role"]
          invited_by?: string | null
          location_id?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          business_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          intended_role?: Database["public"]["Enums"]["app_role"]
          invited_by?: string | null
          location_id?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          business_id: string | null
          created_at: string
          id: string
          location_id: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      walkin_sessions: {
        Row: {
          business_id: string
          closed_at: string | null
          closed_by: string | null
          id: string
          location_id: string
          opened_at: string
          opened_by: string | null
          settings_snapshot: Json
          status: string
        }
        Insert: {
          business_id: string
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          location_id: string
          opened_at?: string
          opened_by?: string | null
          settings_snapshot?: Json
          status?: string
        }
        Update: {
          business_id?: string
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          location_id?: string
          opened_at?: string
          opened_by?: string | null
          settings_snapshot?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "walkin_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walkin_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walkin_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walkin_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_attempts: {
        Row: {
          attempt: number
          completed_at: string | null
          error_message: string | null
          id: number
          result: Json
          started_at: string
          status: string
          webhook_event_id: string
        }
        Insert: {
          attempt: number
          completed_at?: string | null
          error_message?: string | null
          id?: never
          result?: Json
          started_at?: string
          status: string
          webhook_event_id: string
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          error_message?: string | null
          id?: never
          result?: Json
          started_at?: string
          status?: string
          webhook_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_attempts_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempt_count: number
          business_id: string | null
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          processing_status: string
          provider: string
          provider_event_id: string
          received_at: string
          sanitized_headers: Json
          signature_valid: boolean
        }
        Insert: {
          attempt_count?: number
          business_id?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_event_id: string
          received_at?: string
          sanitized_headers?: Json
          signature_valid?: boolean
        }
        Update: {
          attempt_count?: number
          business_id?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string
          received_at?: string
          sanitized_headers?: Json
          signature_valid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_admin_business: {
        Args: { target_business: string }
        Returns: boolean
      }
      can_manage_business: {
        Args: { target_business: string }
        Returns: boolean
      }
      can_operate_business: {
        Args: { target_business: string }
        Returns: boolean
      }
      has_permission: {
        Args: { permission_key: string; target_business?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          required_role: Database["public"]["Enums"]["app_role"]
          target_business?: string
        }
        Returns: boolean
      }
      is_business_staff: { Args: { target_business: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "client"
        | "barber"
        | "receptionist"
        | "manager"
        | "owner"
        | "super_admin"
      record_status:
        | "draft"
        | "in_review"
        | "approved"
        | "published"
        | "archived"
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
    Enums: {
      app_role: [
        "client",
        "barber",
        "receptionist",
        "manager",
        "owner",
        "super_admin",
      ],
      record_status: [
        "draft",
        "in_review",
        "approved",
        "published",
        "archived",
      ],
    },
  },
} as const
