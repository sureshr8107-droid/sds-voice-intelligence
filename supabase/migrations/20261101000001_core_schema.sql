-- ==============================================================================
-- MIGRATION: 20261101000001_core_schema.sql
-- DESCRIPTION: Core schema definition for AI-Powered Call Screening & Routing System
-- TABLES: profiles, departments, staff_extensions, staff_availability,
--         routing_rules, calls, call_transcripts, call_requests, callback_requests,
--         outbound_call_requests, audit_logs, system_settings
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'operator')),
    avatar_url TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on email and role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ------------------------------------------------------------------------------
-- 2. DEPARTMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    primary_extension TEXT,
    routing_timeout_seconds INTEGER NOT NULL DEFAULT 20 CHECK (routing_timeout_seconds BETWEEN 5 AND 120),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_code ON public.departments(code);

-- ------------------------------------------------------------------------------
-- 3. STAFF_EXTENSIONS (SIP/PJSIP mapping to staff profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    extension TEXT NOT NULL UNIQUE,
    sip_username TEXT NOT NULL UNIQUE,
    priority_order INTEGER NOT NULL DEFAULT 1 CHECK (priority_order >= 1),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_staff_ext_dept ON public.staff_extensions(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_ext_profile ON public.staff_extensions(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_ext_extension ON public.staff_extensions(extension);

-- ------------------------------------------------------------------------------
-- 4. STAFF_AVAILABILITY (Real-time and scheduled availability)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_extension_id UUID NOT NULL UNIQUE REFERENCES public.staff_extensions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'away', 'do_not_disturb', 'offline')),
    custom_status_message TEXT,
    working_hours_start TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
    working_hours_end TIME WITHOUT TIME ZONE DEFAULT '17:00:00',
    work_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 1=Mon, 7=Sun
    last_status_change TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_staff_avail_status ON public.staff_availability(status);

-- ------------------------------------------------------------------------------
-- 5. ROUTING_RULES (Keyword/intent mapping to departments and fallbacks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    intent_keyword TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 10,
    fallback_destination_type TEXT NOT NULL DEFAULT 'voicemail' CHECK (fallback_destination_type IN ('operator', 'voicemail', 'extension', 'external_number')),
    fallback_destination_value TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_routing_rules_dept ON public.routing_rules(department_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_keyword ON public.routing_rules(intent_keyword);

-- ------------------------------------------------------------------------------
-- 6. CALLS (Master call log and real-time state machine tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telephony_call_id TEXT UNIQUE,
    caller_number TEXT NOT NULL,
    caller_name TEXT,
    detected_intent TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    assigned_staff_id UUID REFERENCES public.staff_extensions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (
        status IN (
            'initiated',
            'ringing',
            'answered_by_ai',
            'processing',
            'awaiting_staff',
            'connecting',
            'bridged',
            'completed',
            'rejected',
            'timed_out',
            'failed',
            'callback_requested'
        )
    ),
    confidence_score NUMERIC(4,3) CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0)),
    reason TEXT,
    ai_summary TEXT,
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_dept ON public.calls(department_id);
CREATE INDEX IF NOT EXISTS idx_calls_staff ON public.calls(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_number);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. CALL_TRANSCRIPTS (Conversational utterances and audio offsets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL CHECK (speaker IN ('ai', 'caller', 'staff')),
    transcript_text TEXT NOT NULL,
    confidence NUMERIC(4,3),
    audio_timestamp_offset_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON public.call_transcripts(call_id);

-- ------------------------------------------------------------------------------
-- 8. CALL_REQUESTS (Active notifications and screening responses for staff)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    staff_extension_id UUID REFERENCES public.staff_extensions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'awaiting_staff' CHECK (status IN ('awaiting_staff', 'accepted', 'rejected', 'timed_out', 'cancelled')),
    notified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    responded_at TIMESTAMPTZ,
    timeout_seconds INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_call_requests_call_id ON public.call_requests(call_id);
CREATE INDEX IF NOT EXISTS idx_call_requests_staff_id ON public.call_requests(staff_extension_id);
CREATE INDEX IF NOT EXISTS idx_call_requests_status ON public.call_requests(status);

-- ------------------------------------------------------------------------------
-- 9. CALLBACK_REQUESTS (Voicemails and requested callbacks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.callback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    caller_number TEXT NOT NULL,
    caller_name TEXT,
    requested_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    preferred_callback_time TIMESTAMPTZ,
    transcript_summary TEXT,
    audio_recording_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    assigned_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_callback_status ON public.callback_requests(status);
CREATE INDEX IF NOT EXISTS idx_callback_dept ON public.callback_requests(requested_department_id);
CREATE INDEX IF NOT EXISTS idx_callback_assigned ON public.callback_requests(assigned_profile_id);

-- ------------------------------------------------------------------------------
-- 10. OUTBOUND_CALL_REQUESTS (Authorized outgoing calls from web dashboard)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outbound_call_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requested_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    destination_number TEXT NOT NULL,
    recipient_name TEXT,
    caller_id_used TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (
        status IN (
            'requested',
            'initiating',
            'ringing',
            'answered',
            'failed',
            'busy',
            'no_answer',
            'completed'
        )
    ),
    duration_seconds INTEGER DEFAULT 0,
    telephony_channel_id TEXT,
    initiated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_outbound_status ON public.outbound_call_requests(status);
CREATE INDEX IF NOT EXISTS idx_outbound_profile ON public.outbound_call_requests(requested_by_profile_id);

-- ------------------------------------------------------------------------------
-- 11. AUDIT_LOGS (Immutable event trail for security and governance)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

-- ------------------------------------------------------------------------------
-- 12. SYSTEM_SETTINGS (Admin configurable parameters)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.system_settings(setting_key);

-- ------------------------------------------------------------------------------
-- TRIGGER FUNCTION: Maintain updated_at timestamp automatically
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'updated_at'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_timestamp_%I ON public.%I;
            CREATE TRIGGER trg_update_timestamp_%I
                BEFORE UPDATE ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_updated_at();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- TRIGGER FUNCTION: Auto-create profile on auth.users sign-up
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (enabled when executed in Supabase)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
