-- ==============================================================================
-- DEVELOPMENT SEED DATA
-- Safe, fictional institutional seed data for local testing and demonstration.
-- Contains NO real personal information, real phone numbers, or real credentials.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DEPARTMENTS
-- ------------------------------------------------------------------------------
INSERT INTO public.departments (id, name, code, description, primary_extension, routing_timeout_seconds, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111001', 'Admissions & Enrollment', 'ADM', 'Student applications, entrance queries, and course eligibility.', '102', 20, true),
    ('11111111-1111-1111-1111-111111111002', 'Examination Section', 'EXM', 'Exam schedules, hall tickets, grades, and marksheet verification.', '103', 20, true),
    ('11111111-1111-1111-1111-111111111003', 'Accounts & Finance', 'ACC', 'Tuition fees, payment receipts, refunds, and payroll queries.', '104', 20, true),
    ('11111111-1111-1111-1111-111111111004', 'Technical Support & IT', 'SUP', 'Student portal access, campus Wi-Fi, and software troubleshooting.', '105', 15, true),
    ('11111111-1111-1111-1111-111111111005', 'Principal & Management Office', 'EXE', 'Executive appointments, institutional partnerships, and complaints.', '101', 25, true)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ------------------------------------------------------------------------------
-- 2. FICTIONAL PROFILES
-- (In production, profiles reference auth.users. Here we provide local mocks.)
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, full_name, role, phone_number)
VALUES
    ('22222222-2222-2222-2222-222222222001', 'alice.sharma@institution.local', 'Dr. Alice Sharma', 'admin', '+15550101'),
    ('22222222-2222-2222-2222-222222222002', 'robert.miller@institution.local', 'Prof. Robert Miller', 'staff', '+15550102'),
    ('22222222-2222-2222-2222-222222222003', 'clara.oswald@institution.local', 'Clara Oswald', 'staff', '+15550103'),
    ('22222222-2222-2222-2222-222222222004', 'david.zhang@institution.local', 'David Zhang', 'staff', '+15550104'),
    ('22222222-2222-2222-2222-222222222005', 'sarah.connor@institution.local', 'Sarah Connor', 'operator', '+15550105')
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- ------------------------------------------------------------------------------
-- 3. STAFF_EXTENSIONS
-- ------------------------------------------------------------------------------
INSERT INTO public.staff_extensions (id, profile_id, department_id, extension, sip_username, priority_order, is_active)
VALUES
    ('33333333-3333-3333-3333-333333333001', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111005', '101', 'staff_101', 1, true),
    ('33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111001', '102', 'staff_102', 1, true),
    ('33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111002', '103', 'staff_103', 1, true),
    ('33333333-3333-3333-3333-333333333004', '22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111004', '104', 'staff_104', 1, true),
    ('33333333-3333-3333-3333-333333333005', '22222222-2222-2222-2222-222222222005', '11111111-1111-1111-1111-111111111001', '105', 'staff_105', 2, true)
ON CONFLICT (extension) DO UPDATE
SET is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 4. STAFF_AVAILABILITY
-- ------------------------------------------------------------------------------
INSERT INTO public.staff_availability (staff_extension_id, status, custom_status_message, working_hours_start, working_hours_end, work_days)
VALUES
    ('33333333-3333-3333-3333-333333333001', 'available', 'In office - Executive meetings after 2 PM', '09:00:00', '17:00:00', '{1,2,3,4,5}'),
    ('33333333-3333-3333-3333-333333333002', 'available', 'Reviewing prospective admission applications', '08:30:00', '16:30:00', '{1,2,3,4,5}'),
    ('33333333-3333-3333-3333-333333333003', 'busy', 'Evaluating exam transcripts', '09:00:00', '17:00:00', '{1,2,3,4,5}'),
    ('33333333-3333-3333-3333-333333333004', 'available', 'Ready to assist with IT tickets and logins', '09:00:00', '18:00:00', '{1,2,3,4,5,6}'),
    ('33333333-3333-3333-3333-333333333005', 'available', 'Operator line open', '08:00:00', '20:00:00', '{1,2,3,4,5,6,7}')
ON CONFLICT (staff_extension_id) DO UPDATE
SET status = EXCLUDED.status, custom_status_message = EXCLUDED.custom_status_message;

-- ------------------------------------------------------------------------------
-- 5. ROUTING_RULES
-- ------------------------------------------------------------------------------
INSERT INTO public.routing_rules (department_id, intent_keyword, priority, fallback_destination_type, fallback_destination_value)
VALUES
    ('11111111-1111-1111-1111-111111111001', 'admissions', 10, 'voicemail', NULL),
    ('11111111-1111-1111-1111-111111111001', 'enrollment', 10, 'voicemail', NULL),
    ('11111111-1111-1111-1111-111111111001', 'application', 9, 'voicemail', NULL),
    ('11111111-1111-1111-1111-111111111002', 'examination', 10, 'operator', '105'),
    ('11111111-1111-1111-1111-111111111002', 'results', 10, 'voicemail', NULL),
    ('11111111-1111-1111-1111-111111111002', 'hall ticket', 8, 'voicemail', NULL),
    ('11111111-1111-1111-1111-111111111003', 'fee payment', 10, 'voicemail', NULL),
    ('11111111-1111-1111-1111-111111111003', 'refund', 9, 'voicemail', NULL),
    ('11111111-1111-1111-1111-111111111004', 'technical support', 10, 'extension', '104'),
    ('11111111-1111-1111-1111-111111111004', 'password reset', 10, 'voicemail', NULL),
    ('11111111-1111-1111-1111-111111111005', 'principal', 10, 'extension', '101'),
    ('11111111-1111-1111-1111-111111111005', 'appointment', 9, 'voicemail', NULL)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. SYSTEM_SETTINGS
-- ------------------------------------------------------------------------------
INSERT INTO public.system_settings (setting_key, setting_value, description, is_public)
VALUES
    ('ai_default_greeting', '"Hello, thank you for calling. I am the virtual assistant. How may I help you today?"'::jsonb, 'Opening greeting synthesized by TTS for inbound calls', true),
    ('screening_timeout_seconds', '20'::jsonb, 'Time in seconds to wait for staff acceptance before triggering fallback', false),
    ('global_fallback_destination', '{"type": "voicemail", "target": "general_voicemail"}'::jsonb, 'Action when no staff members respond', false),
    ('confidence_threshold', '0.70'::jsonb, 'Minimum LLM classification confidence required before requesting caller clarification', false),
    ('operating_hours', '{"start": "09:00", "end": "18:00", "timezone": "Asia/Kolkata"}'::jsonb, 'Official institutional phone desk operating hours', true)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;

-- ------------------------------------------------------------------------------
-- 7. SAMPLE MOCK CALL & TRANSCRIPT
-- ------------------------------------------------------------------------------
INSERT INTO public.calls (id, telephony_call_id, caller_number, caller_name, detected_intent, department_id, assigned_staff_id, status, confidence_score, reason, ai_summary, duration_seconds)
VALUES (
    '55555555-5555-5555-5555-555555555001',
    'SIP/test-call-001',
    '+15550199',
    'John Doe',
    'admissions',
    '11111111-1111-1111-1111-111111111001',
    '33333333-3333-3333-3333-333333333002',
    'completed',
    0.950,
    'Query regarding B.Tech Computer Science admission criteria',
    'Caller inquired about 2026 application deadlines and cutoff scores for undergraduate engineering.',
    145
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.call_transcripts (call_id, speaker, transcript_text, confidence, audio_timestamp_offset_ms)
VALUES
    ('55555555-5555-5555-5555-555555555001', 'ai', 'Hello, thank you for calling. I am the virtual assistant. How may I help you today?', 1.0, 0),
    ('55555555-5555-5555-5555-555555555001', 'caller', 'Hi, I would like to ask about the admissions process for Computer Science engineering.', 0.96, 4200),
    ('55555555-5555-5555-5555-555555555001', 'ai', 'Certainly. Connecting you to Professor Robert Miller in the Admissions department.', 1.0, 9500)
ON CONFLICT DO NOTHING;
