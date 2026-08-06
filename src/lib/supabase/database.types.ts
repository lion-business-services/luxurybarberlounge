// Schema-synchronized Supabase types for the production repository.
// Regenerate from the linked project after applying migrations with:
// npm run types:supabase

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      businesses: Table<{
        id: string;
        name: string;
        slug: string;
        legal_name: string | null;
        phone: string | null;
        email: string | null;
        website_url: string | null;
        timezone: string;
        default_language: "en" | "es";
        status: "active" | "inactive" | "archived";
        metadata: Json;
        created_at: string;
        updated_at: string;
      }>;
      locations: Table<{
        id: string;
        business_id: string;
        name: string;
        slug: string;
        phone: string | null;
        email: string | null;
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        region: string | null;
        postal_code: string | null;
        country_code: string;
        timezone: string;
        active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      clients: Table<{
        id: string;
        business_id: string;
        auth_user_id: string | null;
        square_customer_id: string | null;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        preferred_language: "en" | "es";
        preferred_barber_profile_id: string | null;
        grooming_preferences: Json;
        communication_preferences: Json;
        referral_source: string | null;
        acquisition_source: string | null;
        status: "active" | "inactive" | "blocked" | "merged";
        metadata: Json;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        business_id: string;
        auth_user_id?: string | null;
        square_customer_id?: string | null;
        first_name: string;
        last_name: string;
        email?: string | null;
        phone?: string | null;
        preferred_language?: "en" | "es";
        preferred_barber_profile_id?: string | null;
        grooming_preferences?: Json;
        communication_preferences?: Json;
        referral_source?: string | null;
        acquisition_source?: string | null;
        status?: "active" | "inactive" | "blocked" | "merged";
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
      }>;
      barber_profile_services: Table<{
        barber_profile_id: string;
        service_id: string;
        duration_override_minutes: number | null;
        price_override_cents: number | null;
        active: boolean;
        created_at: string;
      }, {
        barber_profile_id: string;
        service_id: string;
        duration_override_minutes?: number | null;
        price_override_cents?: number | null;
        active?: boolean;
        created_at?: string;
      }>;
      barber_time_off: Table<{
        id: string;
        barber_profile_id: string;
        location_id: string;
        starts_at: string;
        ends_at: string;
        reason: string | null;
        status: "requested" | "approved" | "declined" | "cancelled";
        approved_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      appointments: Table<{
        id: string;
        business_id: string;
        location_id: string;
        client_id: string;
        auth_user_id: string | null;
        service_id: string;
        barber_profile_id: string;
        assigned_staff_user_id: string | null;
        public_reference: string;
        manage_token_hash: string;
        square_booking_id: string | null;
        square_customer_id: string | null;
        square_order_id: string | null;
        service_name_snapshot: string;
        service_price_snapshot_cents: number;
        service_duration_snapshot_minutes: number;
        addon_snapshot: Json;
        barber_name_snapshot: string;
        client_name_snapshot: string;
        client_email_snapshot: string | null;
        client_phone_snapshot: string | null;
        starts_at: string;
        ends_at: string;
        timezone: string;
        status: Database["public"]["Enums"]["appointment_status"];
        booking_source: string;
        campaign_source: string | null;
        campaign_medium: string | null;
        campaign_name: string | null;
        referral_source: string | null;
        deposit_required_cents: number;
        deposit_status: "not_required" | "pending" | "paid" | "refunded" | "failed";
        client_notes: string | null;
        internal_notes: string | null;
        policy_version: string;
        policy_accepted_at: string;
        email_consent: boolean;
        sms_consent: boolean;
        idempotency_key: string;
        formsubmit_status: Database["public"]["Enums"]["delivery_status"];
        client_confirmation_status: "queued" | "sent" | "failed" | "suppressed";
        barber_notification_status: "queued" | "sent" | "failed" | "suppressed";
        sync_status: "supabase_primary" | "square_pending" | "square_synced" | "square_failed";
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      appointment_addons: Table<{
        id: string;
        appointment_id: string;
        addon_id: string | null;
        addon_name_snapshot: string;
        price_snapshot_cents: number;
        duration_snapshot_minutes: number;
        created_at: string;
      }>;
      appointment_assignments: Table<{
        id: string;
        appointment_id: string;
        barber_profile_id: string;
        assigned_staff_user_id: string | null;
        assignment_source: "booking" | "first_available" | "admin" | "reception" | "system";
        reason: string | null;
        assigned_by: string | null;
        active: boolean;
        assigned_at: string;
        released_at: string | null;
      }>;
      slot_holds: Table<{
        id: string;
        business_id: string;
        location_id: string;
        barber_profile_id: string;
        service_id: string;
        idempotency_key: string;
        starts_at: string;
        ends_at: string;
        expires_at: string;
        status: "active" | "consumed" | "expired" | "released";
        created_at: string;
      }>;
      formsubmit_deliveries: Table<{
        id: string;
        appointment_id: string;
        recipient_email: string;
        subject: string;
        status: Database["public"]["Enums"]["delivery_status"];
        attempt_count: number;
        response_status: number | null;
        sanitized_response: Json;
        last_error: string | null;
        next_attempt_at: string | null;
        sent_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      booking_events: Table<{
        id: string;
        business_id: string | null;
        appointment_id: string | null;
        anonymous_session_id: string | null;
        event_name: Database["public"]["Enums"]["booking_event_name"];
        step: number | null;
        source: string | null;
        campaign_source: string | null;
        campaign_medium: string | null;
        campaign_name: string | null;
        metadata: Json;
        created_at: string;
      }>;
      request_rate_limits: Table<{
        bucket_key: string;
        request_count: number;
        resets_at: string;
        updated_at: string;
      }, {
        bucket_key: string;
        request_count?: number;
        resets_at: string;
        updated_at?: string;
      }>;
      leads: Table<{
        id: string;
        business_id: string | null;
        location_id: string | null;
        source: string;
        campaign: string | null;
        status: string;
        stage: string;
        owner_user_id: string | null;
        full_name: string;
        email: string | null;
        phone: string | null;
        preferred_language: "en" | "es";
        service_interest: string | null;
        payload: Json;
        consent: Json;
        next_follow_up_at: string | null;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        business_id?: string | null;
        location_id?: string | null;
        source?: string;
        campaign?: string | null;
        status?: string;
        stage?: string;
        owner_user_id?: string | null;
        full_name: string;
        email?: string | null;
        phone?: string | null;
        preferred_language?: "en" | "es";
        service_interest?: string | null;
        payload?: Json;
        consent?: Json;
        next_follow_up_at?: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
      queue_entries: Table<{
        id: string;
        business_id: string | null;
        location_id: string | null;
        walkin_session_id: string | null;
        client_id: string | null;
        client_name: string | null;
        client_phone: string | null;
        service_id: string | null;
        service_slug: string | null;
        preferred_barber_id: string | null;
        barber_preference: string | null;
        public_token: string;
        status: string;
        estimated_wait_minutes: number | null;
        manual_priority: number;
        attribution_source: string;
        metadata: Json;
        joined_at: string;
        called_at: string | null;
        service_started_at: string | null;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
        appointment_id: string | null;
        public_display_consent: boolean;
        public_display_label: string | null;
      }, {
        id?: string;
        business_id?: string | null;
        location_id?: string | null;
        walkin_session_id?: string | null;
        client_id?: string | null;
        client_name?: string | null;
        client_phone?: string | null;
        service_id?: string | null;
        service_slug?: string | null;
        preferred_barber_id?: string | null;
        barber_preference?: string | null;
        public_token: string;
        status?: string;
        estimated_wait_minutes?: number | null;
        manual_priority?: number;
        attribution_source?: string;
        metadata?: Json;
        joined_at?: string;
        called_at?: string | null;
        service_started_at?: string | null;
        completed_at?: string | null;
        created_at?: string;
        updated_at?: string;
        appointment_id?: string | null;
        public_display_consent?: boolean;
        public_display_label?: string | null;
      }>;
      webhook_events: Table<{
        id: string;
        business_id: string | null;
        provider: string;
        provider_event_id: string;
        event_type: string;
        signature_valid: boolean;
        payload: Json;
        sanitized_headers: Json;
        received_at: string;
        processing_status: string;
        processed_at: string | null;
        attempt_count: number;
        last_error: string | null;
      }, {
        id?: string;
        business_id?: string | null;
        provider: string;
        provider_event_id: string;
        event_type: string;
        signature_valid?: boolean;
        payload?: Json;
        sanitized_headers?: Json;
        received_at?: string;
        processing_status?: string;
        processed_at?: string | null;
        attempt_count?: number;
        last_error?: string | null;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { required_role: Database["public"]["Enums"]["app_role"]; target_business?: string | null }; Returns: boolean };
      can_manage_business: { Args: { target_business: string }; Returns: boolean };
      can_operate_business: { Args: { target_business: string }; Returns: boolean };
      can_admin_business: { Args: { target_business: string }; Returns: boolean };
      create_appointment_atomic: { Args: { p_data: Json }; Returns: Database["public"]["Tables"]["appointments"]["Row"] };
      reschedule_appointment_atomic: {
        Args: {
          p_appointment_id: string;
          p_starts_at: string;
          p_ends_at: string;
          p_actor: string | null;
          p_actor_role: string;
          p_reason: string;
        };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "client" | "barber" | "receptionist" | "manager" | "owner" | "super_admin";
      record_status: "draft" | "in_review" | "approved" | "published" | "archived";
      appointment_status:
        | "draft"
        | "slot_held"
        | "pending_confirmation"
        | "confirmed"
        | "checked_in"
        | "assigned"
        | "in_service"
        | "completed"
        | "rescheduled"
        | "cancelled_by_client"
        | "cancelled_by_business"
        | "no_show"
        | "declined"
        | "expired"
        | "failed";
      delivery_status: "queued" | "awaiting_activation" | "processing" | "sent" | "failed" | "retrying" | "disabled";
      booking_event_name:
        | "booking_page_viewed"
        | "qr_booking_page_viewed"
        | "service_selected"
        | "barber_selected"
        | "first_available_selected"
        | "date_selected"
        | "time_selected"
        | "booking_started"
        | "booking_step_completed"
        | "booking_abandoned"
        | "booking_submitted"
        | "booking_confirmed"
        | "booking_failed"
        | "availability_conflict"
        | "call_action"
        | "directions_action"
        | "rebook_action";
    };
    CompositeTypes: Record<string, never>;
  };
};
