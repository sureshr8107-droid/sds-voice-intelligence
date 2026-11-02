# SDS Voice Intelligence
> **Intelligent Calls. Smarter Connections.**  
> *AI-Powered Smart Call Screening and Routing System*

---

## 1. Project Overview

**SDS Voice Intelligence** is an enterprise virtual receptionist engineered for colleges, universities, corporate offices, healthcare institutions, and call centers.

When completed across all development phases, the system will:
1. Automatically answer incoming calls via Asterisk PBX / SIP.
2. Transcribe caller statements in real time using local Whisper STT.
3. Understand intent and department targets using a local Ollama LLM (`llama3.2:1b`).
4. Evaluate database-backed routing rules (staff priority, availability, schedule).
5. Notify staff in real time via a web dashboard with caller details, AI summary, and a 20-second countdown.
6. Bridge accepted calls directly to staff softphones (MicroSIP / Linphone on Android or desktop).
7. Record messages or schedule callbacks if the call is rejected or times out.
8. Support authorized outbound calling workflows.

---

## 2. Project Milestone Roadmap

| Milestone | Status | Details |
| :--- | :--- | :--- |
| **Phase 1: Environment Audit & Architecture** | **Completed** | Hardware feasibility analyzed; softphone test architecture documented. |
| **Phase 2: Workspace Foundation** | **Completed** | Full-stack monorepo, Express TypeScript backend, React Vite frontend, shared types, diagnostic health APIs, automated tests. |
| **Phase 3: Database & Authentication** | **Completed** | Supabase PostgreSQL 12-table schema migrations, RLS policies, staff extensions, JWT verification and RBAC middleware. |
| **Phase 4: Frontend Development** | **Completed** | SDS Voice Intelligence enterprise dashboard, in-memory auth, call screening management, staff console, 100% test pass rate. |
| **Phase 5: Backend API & State Machine** | Planned | Finite state machine, routing engine, Socket.IO real-time server. |
| **Phase 6: Local AI Pipeline** | Planned | Whisper STT, Ollama LLM, and Piper TTS integration. |
| **Phase 7: Asterisk ARI Telephony** | Planned | PJSIP channel bridging and softphone verification. |

---

## 3. Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript and Vite
- **Styling:** Bootstrap 5 with custom modern glassmorphism design tokens
- **Routing:** React Router v6
- **Icons:** Lucide React
- **HTTP Client:** Axios with centralized error normalization

### Backend
- **Runtime:** Node.js (v24.x LTS tested) with TypeScript
- **Framework:** Express
- **Validation:** Zod for environment and request payload safety
- **Security:** Helmet (HTTP security headers), CORS, Express Rate Limit
- **Logging:** Pino structured logging with redaction for privacy

### Shared Package (`@call-screening/shared`)
- Type-safe contracts shared between frontend and backend (`HealthStatus`, `ServiceHealth`, `CallStatus`, `CallSummary`, `ApiErrorResponse`).

---

## 4. Quick Start (Windows)

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+` or `v11+`
- Git

### Installation
From the root workspace directory:
```powershell
npm install
```

### Starting Development Servers
To run both backend and frontend concurrently with synchronized graceful shutdown:
```powershell
npm run dev
```

Alternatively, start them separately:
```powershell
# Backend API only (http://localhost:5000)
npm run dev:backend

# Frontend React UI only (http://localhost:5173)
npm run dev:frontend
```

---

## 5. Endpoints & URLs

- **Frontend Console:** [http://localhost:5173](http://localhost:5173)
- **System Status Page:** [http://localhost:5173/status](http://localhost:5173/status)
- **Backend Liveness Probe:** [http://localhost:5000/health](http://localhost:5000/health)
- **Backend Detailed Diagnostics:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 6. Testing, Quality & Builds

```powershell
# Run all unit and integration tests
npm test

# Run type checks across all packages
npm run typecheck

# Build shared, backend, and frontend for production
npm run build
```

---

## 7. Troubleshooting

- **Backend Port Conflict (EADDRINUSE: 5000):**  
  Update `PORT=5001` in `backend/.env` and `VITE_API_BASE_URL=http://localhost:5001/api/v1` in `frontend/.env`.
- **PowerShell Script Execution Policy:**  
  If npm scripts fail due to Windows execution policies, run PowerShell as Administrator:  
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

## 8. Documentation Index

- [Architecture & Blueprint](docs/ARCHITECTURE.md)
- [Telephony Testing Guide](docs/TELEPHONY_GUIDE.md)
- [Phase 2 Setup Guide](docs/PHASE_2_SETUP.md)
- [API Specification](docs/API_SPEC.md)
- [Phase 2 Test Report](docs/PHASE_2_TEST_REPORT.md)
