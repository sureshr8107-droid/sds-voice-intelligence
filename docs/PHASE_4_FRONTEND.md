# Phase 4: Frontend Development & Dashboard Implementation
## SDS Voice Intelligence

> **Official Project Identity:**  
> **Name:** SDS Voice Intelligence  
> **Tagline:** Intelligent Calls. Smarter Connections.  
> **System Description:** AI-Powered Smart Call Screening and Routing System engineered to receive calls, understand caller intent using AI, and route callers to the appropriate department or staff member.

---

## 1. Implemented Routes & Navigation Structure

All routes are fully implemented, typed, and integrated into `react-router-dom` v6:

### Public Routes
- **`/`**: Overview / Landing page introducing the system with direct access to the console and health diagnostics.
- **`/login`**: Enterprise authentication portal featuring SDS Voice Intelligence branding, input validation, show/hide password, and in-memory Bearer token verification.
- **`/unauthorized`**: 403 Forbidden screen detailing RBAC role restrictions and the user's current session permissions.
- **`/status` & `/system-status`**: System Diagnostics page connected to `/health` and `/api/v1/health` with live dependency indicators.
- **`/404`**: Custom 404 Not Found screen.

### Authenticated & Role-Protected Routes
Guarded by `<ProtectedRoute>` and `<RoleGuard>`:

| Route | Minimum Role | Page Description | Key Elements |
| :--- | :---: | :--- | :--- |
| **`/dashboard`** | `staff` / `operator` / `admin` | Command Dashboard | Stat cards (total, in progress, completed, missed, callbacks, avg duration), live system diagnostics, recent call list, and institutional quick actions. |
| **`/staff-console`** | `staff` / `operator` / `admin` | Receptionist Console | Operator availability status toggle, custom status message, incoming screened call queue, standby notices for Asterisk ARI bridging. |
| **`/calls`** | `staff` / `operator` / `admin` | Call History | Search by caller number or intent, filter by call status, sortable columns, call status badges, pagination. |
| **`/calls/:id`** | `staff` / `operator` / `admin` | Call Details | Caller metadata, AI classification, confidence progress bar, transcript summary, and routing journey. |
| **`/callbacks`** | `staff` / `operator` / `admin` | Callback Queue | Queued callbacks, preferred time, queue status, caller details. |
| **`/departments`** | `admin` | Department Management | Department table, primary extensions, timeout thresholds, Add Department modal with form validation. |
| **`/staff`** | `admin` | Staff Directory | Staff faculty directory, softphone extensions, department assignment, availability indicators. |
| **`/extensions`** | `admin` | SIP Extensions | PJSIP extension mapping, SIP usernames, priority rankings, PBX status. |
| **`/routing-rules`** | `admin` | AI Routing Rules | Keyword intent classifiers, rule priorities, fallback destination types (operator, voicemail, extension). |
| **`/settings`** | `staff` / `operator` / `admin` | Account & Settings | Authenticated user profile, role capabilities breakdown, chime sound toggle, auto-away timeout. |

---

## 2. Design System & Brand Identity

The design system is implemented in `frontend/src/styles/main.css` over Bootstrap 5:
- **Palette:** Dark charcoal and deep slate background (`#0a0e17`, `#111827`, `#162032`) with low-contrast borders (`rgba(255, 255, 255, 0.08)`).
- **Accents:** Electric sky blue (`#0ea5e9`), cyan (`#06b6d4`), and emerald (`#10b981`).
- **Typography:** Modern clean sans-serif typography (`Inter`, `Outfit`, and system sans).
- **Collapsible Sidebar (`Sidebar.tsx`):**
  - Smooth 260px $\leftrightarrow$ 78px collapse transition.
  - Role-aware navigation (admin-only routes automatically filtered for staff/operators).
  - Mobile drawer offcanvas with backdrop blur.
- **Top Navigation Bar (`Topbar.tsx`):**
  - View title & system tagline.
  - Authenticated user badge with role pill (`admin`, `staff`, `operator`).
  - Dropdown menu with Account settings and in-memory session sign out.
- **Reusable Components (`frontend/src/components/common/`):**
  - `StatCard`: Metrics card with shimmer skeleton and unavailable states.
  - `DataTable`: Accessible dark table with sort indicators, pagination, and empty states.
  - `SearchFilterBar`: Debounced search input, filter selects, and reset action.
  - `StatusBadge`: Unified status pills for `CallStatus`, `AvailabilityStatus`, `DependencyStatus`, `UserRole`, `HealthStatus`.
  - `LoadingSkeleton`: CSS shimmer animation for placeholder loading.
  - `EmptyState`: Accessible empty states with descriptive guidance.
  - `ErrorState`: Error card with retry trigger and `X-Request-Id` tracing.
  - `ConfirmDialog`: Accessible confirmation dialog for actions.
  - `FormField`: Accessible form wrapper with label, error alerts, and helper text.
  - `FeatureUnavailableBanner`: Prominent banner explicitly identifying backend or telephony features scheduled for future phases.

---

## 3. Authentication & Security Architecture

### Strict Security Rules Enforced:
1. **Zero Storage Theft Risk:** Authentication tokens are stored **strictly in memory** via `AuthContext.tsx` React state. Tokens are **never written to `localStorage` or `sessionStorage`**, preventing persistent XSS token theft.
2. **Server-Side Authorization:** The frontend verifies permissions against backend endpoints:
   - Profile verification: `GET /api/v1/auth/me` with `Authorization: Bearer <token>`.
   - Admin gate: `GET /api/v1/auth/admin/test`.
   - Staff/Operator gate: `GET /api/v1/auth/staff/test`.
3. **Automatic 401 Interceptor:** `apiClient.ts` captures HTTP 401 responses and triggers `logout()`, clearing in-memory state.
4. **Credential Isolation:** No Supabase service-role keys, database passwords, or JWT secrets are bundled into client code.

---

## 4. API Integration & Real Backend Status

### Actual Endpoints Integrated in Phase 4:
| Endpoint | Method | Status | Notes |
| :--- | :---: | :---: | :--- |
| `/health` | `GET` | **Active** | Basic backend liveness check. |
| `/api/v1/health` | `GET` | **Active** | System diagnostics, uptime, and external dependency health. |
| `/api/v1/auth/me` | `GET` | **Active** | In-memory token verification and profile retrieval. |
| `/api/v1/auth/admin/test`| `GET` | **Active** | RBAC verification for administrators. |
| `/api/v1/auth/staff/test`| `GET` | **Active** | RBAC verification for staff and operators. |

### Endpoints Structured in Frontend & Awaiting Backend Implementation (Phase 5):
The following endpoints are wired in service modules with proper TypeScript types, but return safe unavailable states (`FeatureUnavailableBanner`) until implemented:
- `POST /api/v1/auth/login`: Email/password authentication.
- `GET /api/v1/calls/stats`: Aggregate call statistics.
- `GET /api/v1/calls`: Paginated call records and filters.
- `GET /api/v1/calls/:id`: Detailed call record and transcript.
- `GET/POST /api/v1/departments`: Department CRUD.
- `GET /api/v1/staff`: Staff directory and availability query.
- `PATCH /api/v1/staff/:id/availability`: Staff availability update.
- `GET /api/v1/extensions`: SIP extensions query.
- `GET/PATCH /api/v1/routing-rules`: AI routing rule modifiers.
- `GET/PATCH /api/v1/callbacks`: Callback queue management.

---

## 5. Verification Commands & Results

### 1. Monorepo TypeScript Typecheck
```powershell
npm run typecheck
```
- `@call-screening/shared`: 0 errors
- `@call-screening/backend`: 0 errors
- `@call-screening/frontend`: 0 errors  
**Result:** **PASSED (100%)**

### 2. Automated Test Suites
```powershell
npm test
```
- **Backend Test Suites:**
  - `backend/tests/health.test.ts`: 6 Passed
  - `backend/tests/auth.test.ts`: 7 Passed
- **Frontend Test Suites:**
  - `frontend/tests/health.test.tsx`: 4 Passed
  - `frontend/tests/auth.test.tsx`: 4 Passed
  - `frontend/tests/dashboard.test.tsx`: 1 Passed
  - `frontend/tests/navigation.test.tsx`: 3 Passed  
**Total Tests:** **25 Passed, 0 Failed (100% Pass Rate)**

### 3. Production Bundling
```powershell
npm run build
```
- Clean production bundles output in `frontend/dist/` (385 kB JS, 239 kB CSS, gzip: 114 kB JS, 33 kB CSS).  
**Result:** **PASSED (100%)**

---

## 6. Starting Frontend & Backend on Windows

### Prerequisites
- Node.js v20+ / v24+
- npm v10+

### Start Dev Servers Concurrently
```powershell
npm run dev
```
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Frontend Console:** [http://localhost:5173](http://localhost:5173)

### Verify Dev Personas
On [http://localhost:5173/login](http://localhost:5173/login), click any test persona button to authenticate in memory:
1. **Admin Persona:** `mock-admin-token` $\rightarrow$ Dr. Alice Sharma (`role: admin`)
2. **Staff Persona:** `mock-staff-token` $\rightarrow$ Prof. Robert Miller (`role: staff`)
3. **Operator Persona:** `mock-operator-token` $\rightarrow$ Sarah Connor (`role: operator`)

---

## 7. Deferred Milestones & Boundaries

Per Phase 4 specifications:
- **Phase 5 (Next):** Finite state machine, Socket.IO push notifications, call routing engine, and REST CRUD endpoints.
- **Phase 6:** Local speech pipeline (Whisper STT, Ollama LLM, Piper TTS).
- **Phase 7:** Asterisk ARI telephony, PJSIP channels, and softphone audio bridging.
