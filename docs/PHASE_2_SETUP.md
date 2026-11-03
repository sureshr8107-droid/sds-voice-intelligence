# Phase 2: Setup and Execution Guide (Windows Environment)

## 1. Overview
This guide provides exact instructions for installing, configuring, running, and verifying the **Phase 2 Technical Foundation** of the AI-Powered Smart Call Screening & Routing System on Windows.

---

## 2. Prerequisites
- **Operating System:** Windows 10 or 11 (PowerShell environment)
- **Node.js:** v20.x, v22.x, or v24.x (Detected: `v24.16.0`)
- **npm:** v10.x or v11.x (Detected: `11.13.0`)
- **Git:** Installed and available in PATH
- **Hardware/Virtualization:** No WSL, Ubuntu, Docker, Asterisk, or paid AI APIs required for this phase.

---

## 3. Installation
From the root of the repository (`c:\Users\Admin\OneDrive\Documents\hodpro`), run:

```powershell
npm install
```

This single command installs all dependencies across the `shared`, `backend`, and `frontend` npm workspaces and links the local `@call-screening/shared` package.

---

## 4. Environment Configuration
The system works out-of-the-box in development with secure defaults. If customized ports or URLs are desired, copy the provided `.env.example` templates:

```powershell
# In backend
Copy-Item backend\.env.example backend\.env

# In frontend
Copy-Item frontend\.env.example frontend\.env
```

### Backend Default Settings
- `PORT=5000`
- `HOST=0.0.0.0`
- `FRONTEND_ORIGIN=http://localhost:5173`
- `LOG_LEVEL=info`
- `API_PREFIX=/api/v1`

### Frontend Default Settings
- `VITE_API_BASE_URL=http://localhost:5000/api/v1`

---

## 5. Development Server Execution

### Run Both Frontend & Backend Concurrently
From the root directory:
```powershell
npm run dev
```
This launches both processes simultaneously with color-coded prefixes (`[BACKEND]`, `[FRONTEND]`) and handles synchronized graceful shutdown upon pressing `Ctrl+C`.

### Run Backend Only
```powershell
npm run dev:backend
```
Backend API will be accessible at: `http://localhost:5000`

### Run Frontend Only
```powershell
npm run dev:frontend
```
Frontend console will be accessible at: `http://localhost:5173`

---

## 6. Local Endpoints & Verification
- **Frontend Web UI:** [http://localhost:5173](http://localhost:5173)
- **System Status Dashboard:** [http://localhost:5173/status](http://localhost:5173/status)
- **Backend Liveness Probe:** [http://localhost:5000/health](http://localhost:5000/health)
- **Backend Detailed Diagnostics:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 7. Testing, Type Checking, and Building

### Run Automated Tests
```powershell
# Run all tests across backend and frontend
npm test

# Run backend unit & integration tests only
npm run test:backend

# Run frontend component tests only
npm run test:frontend
```

### Type Checking
```powershell
npm run typecheck
```

### Production Build
```powershell
npm run build
```

---

## 8. Common Windows PowerShell Issues & Solutions
1. **Execution Policy Error (`script cannot be loaded because running scripts is disabled`):**
   Run PowerShell as Administrator and execute:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
2. **Port 5000 or 5173 in use:**
   If another application is running on port 5000, modify `PORT=5001` in `backend/.env` and `VITE_API_BASE_URL=http://localhost:5001/api/v1` in `frontend/.env`.
3. **PowerShell `&&` syntax error in older versions:**
   Use `;` instead of `&&` when chaining commands in Windows PowerShell.
