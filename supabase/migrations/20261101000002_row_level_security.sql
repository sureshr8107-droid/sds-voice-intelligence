-- ==============================================================================
-- MIGRATION: 20261101000002_row_level_security.sql
-- DESCRIPTION: Row Level Security (RLS) policies for least-privilege role-based access
-- ROLES SUPPORTED: 'admin', 'staff', 'operator'
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- HELPER FUNCTION: Get current authenticated user's role
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'anonymous');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- ENABLE RLS ON ALL CORE TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_call_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Authenticated users can view all profiles (staff directory)
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can update their own profile; admins can update any profile
CREATE POLICY "profiles_update_self_or_admin"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR public.get_auth_role() = 'admin')
    WITH CHECK (auth.uid() = id OR public.get_auth_role() = 'admin');

-- Admins can insert or delete profiles
CREATE POLICY "profiles_admin_all"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 2. DEPARTMENTS POLICIES
-- ------------------------------------------------------------------------------
-- All authenticated users can read departments
CREATE POLICY "departments_select_authenticated"
    ON public.departments FOR SELECT
    TO authenticated
    USING (true);

-- Admins have full control
CREATE POLICY "departments_admin_all"
    ON public.departments FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 3. STAFF_EXTENSIONS POLICIES
-- ------------------------------------------------------------------------------
-- All authenticated users can view staff extensions
CREATE POLICY "staff_extensions_select_authenticated"
    ON public.staff_extensions FOR SELECT
    TO authenticated
    USING (true);

-- Admins manage extensions
CREATE POLICY "staff_extensions_admin_all"
    ON public.staff_extensions FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 4. STAFF_AVAILABILITY POLICIES
-- ------------------------------------------------------------------------------
-- All authenticated users can view availability statuses
CREATE POLICY "staff_availability_select_authenticated"
    ON public.staff_availability FOR SELECT
    TO authenticated
    USING (true);

-- Staff can update their own availability; admins can update any
CREATE POLICY "staff_availability_update_self"
    ON public.staff_availability FOR UPDATE
    TO authenticated
    USING (
        public.get_auth_role() = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.staff_extensions se
            WHERE se.id = staff_extension_id AND se.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        public.get_auth_role() = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.staff_extensions se
            WHERE se.id = staff_extension_id AND se.profile_id = auth.uid()
        )
    );

-- Admins can manage all availability records
CREATE POLICY "staff_availability_admin_all"
    ON public.staff_availability FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 5. ROUTING_RULES POLICIES
-- ------------------------------------------------------------------------------
-- All authenticated users can read routing rules
CREATE POLICY "routing_rules_select_authenticated"
    ON public.routing_rules FOR SELECT
    TO authenticated
    USING (true);

-- Admins manage routing rules
CREATE POLICY "routing_rules_admin_all"
    ON public.routing_rules FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 6. CALLS POLICIES
-- ------------------------------------------------------------------------------
-- Admins/operators can see all calls; staff can see calls to their department or assigned to them
CREATE POLICY "calls_select_authorized"
    ON public.calls FOR SELECT
    TO authenticated
    USING (
        public.get_auth_role() IN ('admin', 'operator') OR
        assigned_staff_id IN (
            SELECT id FROM public.staff_extensions WHERE profile_id = auth.uid()
        ) OR
        department_id IN (
            SELECT department_id FROM public.staff_extensions WHERE profile_id = auth.uid()
        )
    );

-- Staff can update calls assigned to them (e.g. status changes during bridging)
CREATE POLICY "calls_update_assigned_or_admin"
    ON public.calls FOR UPDATE
    TO authenticated
    USING (
        public.get_auth_role() IN ('admin', 'operator') OR
        assigned_staff_id IN (
            SELECT id FROM public.staff_extensions WHERE profile_id = auth.uid()
        )
    );

-- Admins full control
CREATE POLICY "calls_admin_all"
    ON public.calls FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 7. CALL_TRANSCRIPTS POLICIES
-- ------------------------------------------------------------------------------
-- Staff can read transcripts only for calls they are permitted to view
CREATE POLICY "call_transcripts_select_authorized"
    ON public.call_transcripts FOR SELECT
    TO authenticated
    USING (
        public.get_auth_role() IN ('admin', 'operator') OR
        EXISTS (
            SELECT 1 FROM public.calls c
            WHERE c.id = call_id AND (
                c.assigned_staff_id IN (
                    SELECT id FROM public.staff_extensions WHERE profile_id = auth.uid()
                ) OR
                c.department_id IN (
                    SELECT department_id FROM public.staff_extensions WHERE profile_id = auth.uid()
                )
            )
        )
    );

-- Admins full control
CREATE POLICY "call_transcripts_admin_all"
    ON public.call_transcripts FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 8. CALL_REQUESTS POLICIES
-- ------------------------------------------------------------------------------
-- Staff can view screening alerts directed to their extension
CREATE POLICY "call_requests_select_authorized"
    ON public.call_requests FOR SELECT
    TO authenticated
    USING (
        public.get_auth_role() IN ('admin', 'operator') OR
        staff_extension_id IN (
            SELECT id FROM public.staff_extensions WHERE profile_id = auth.uid()
        )
    );

-- Staff can update (accept/reject) requests for their extension
CREATE POLICY "call_requests_update_authorized"
    ON public.call_requests FOR UPDATE
    TO authenticated
    USING (
        public.get_auth_role() IN ('admin', 'operator') OR
        staff_extension_id IN (
            SELECT id FROM public.staff_extensions WHERE profile_id = auth.uid()
        )
    );

-- Admins full control
CREATE POLICY "call_requests_admin_all"
    ON public.call_requests FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 9. CALLBACK_REQUESTS POLICIES
-- ------------------------------------------------------------------------------
-- Staff can view callback requests in their department or assigned to them
CREATE POLICY "callback_requests_select_authorized"
    ON public.callback_requests FOR SELECT
    TO authenticated
    USING (
        public.get_auth_role() IN ('admin', 'operator') OR
        assigned_profile_id = auth.uid() OR
        requested_department_id IN (
            SELECT department_id FROM public.staff_extensions WHERE profile_id = auth.uid()
        )
    );

-- Staff can update callbacks assigned to them
CREATE POLICY "callback_requests_update_authorized"
    ON public.callback_requests FOR UPDATE
    TO authenticated
    USING (
        public.get_auth_role() IN ('admin', 'operator') OR
        assigned_profile_id = auth.uid()
    );

-- Admins full control
CREATE POLICY "callback_requests_admin_all"
    ON public.callback_requests FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 10. OUTBOUND_CALL_REQUESTS POLICIES
-- ------------------------------------------------------------------------------
-- Users can view their own outbound call requests; admins can view all
CREATE POLICY "outbound_select_self_or_admin"
    ON public.outbound_call_requests FOR SELECT
    TO authenticated
    USING (
        public.get_auth_role() = 'admin' OR
        requested_by_profile_id = auth.uid()
    );

-- Users can submit outbound call requests
CREATE POLICY "outbound_insert_authenticated"
    ON public.outbound_call_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_auth_role() IN ('admin', 'staff', 'operator') AND
        requested_by_profile_id = auth.uid()
    );

-- Admins full control
CREATE POLICY "outbound_admin_all"
    ON public.outbound_call_requests FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- 11. AUDIT_LOGS POLICIES
-- ------------------------------------------------------------------------------
-- Only admins can read audit logs
CREATE POLICY "audit_logs_select_admin_only"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.get_auth_role() = 'admin');

-- Authenticated users or background workers can append audit events
CREATE POLICY "audit_logs_insert_authenticated"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- NO UPDATE OR DELETE ALLOWED (Immutable audit trail)

-- ------------------------------------------------------------------------------
-- 12. SYSTEM_SETTINGS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can view public settings; admins view all
CREATE POLICY "system_settings_select"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (
        public.get_auth_role() = 'admin' OR
        is_public = true
    );

-- Only admins can modify system settings
CREATE POLICY "system_settings_admin_all"
    ON public.system_settings FOR ALL
    TO authenticated
    USING (public.get_auth_role() = 'admin');
