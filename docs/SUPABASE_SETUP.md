# Dedicated Supabase Setup & Migration Guide

## 1. Important Isolation Warning

> [!CAUTION]
> **Database Project Isolation:**  
> Never apply these migrations or configure credentials pointing to the existing `Ponmayil Jewellery` Supabase project (`liibxwkwyvqjcpljnnpc`).  
> The **AI Call Screening and Routing System** requires its own dedicated Supabase project to ensure zero risk of schema collisions or data cross-contamination.

---

## 2. Setting Up a Dedicated Supabase Project

### Option A: Via the Supabase Cloud Dashboard (Recommended)
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Choose your Organization.
4. Set the Project Name: `smart-call-screening` (or your preferred name).
5. Generate and securely store a strong database password.
6. Select your preferred region (e.g., `ap-south-1` for Mumbai, or closest to your users).
7. Wait ~2 minutes for the database instance to provision.

### Option B: Via the Supabase CLI
```powershell
# Login to Supabase CLI
npx supabase login

# Link to your newly created project (do NOT link to existing store project)
npx supabase link --project-ref <your-new-project-ref>
```

---

## 3. Applying Migrations

The migrations must be executed in exact sequential order:

### Migration Execution Order
1. **Core Schema:**  
   File: `supabase/migrations/20261101000001_core_schema.sql`  
   *Creates the 12 tables, indexes, updated_at triggers, and auth.users new profile trigger.*
2. **Row Level Security (RLS):**  
   File: `supabase/migrations/20261101000002_row_level_security.sql`  
   *Enables RLS on all 12 tables, installs the get_auth_role() helper, and applies role-based access policies.*
3. **Development Seed Data (Optional for testing):**  
   File: `supabase/seed.sql`  
   *Inserts fictional departments, staff profiles, extensions, availability, routing rules, and dummy call transcripts.*

### How to Apply Migrations

#### Via Supabase Dashboard SQL Editor:
1. Open your new project dashboard -> **SQL Editor**.
2. Click **New query**.
3. Paste the contents of `20261101000001_core_schema.sql` and click **Run**.
4. Open a second query, paste `20261101000002_row_level_security.sql`, and click **Run**.
5. Optionally paste `seed.sql` to populate test institutional departments and extensions.

#### Via Supabase CLI:
```powershell
npx supabase db push
```

---

## 4. Environment Variables Configuration

In your project dashboard, navigate to **Project Settings** -> **API** to obtain your API credentials.

### Backend (`backend/.env`)
```bash
# Application Port and Environment
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
FRONTEND_ORIGIN=http://localhost:5173
LOG_LEVEL=info
API_PREFIX=/api/v1

# Dedicated Call Screening Supabase Credentials
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Server-side ONLY: Used by background telephony workers to bypass RLS when writing calls
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend (`frontend/.env`)
```bash
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_APP_ENV=development

# Optional direct Supabase Auth integration (Phase 4)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!WARNING]
> **CRITICAL SECURITY RULE:**  
> **NEVER** place `SUPABASE_SERVICE_ROLE_KEY` in `frontend/.env` or inside any React component. The service-role key has root privileges that bypass all Row Level Security. Keep it strictly inside `backend/.env`.
