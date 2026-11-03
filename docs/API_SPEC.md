# API Specification (Phase 2 Foundation)

## 1. Overview
This document defines the REST API endpoints, protocols, status codes, and error representations implemented in Phase 2 of the AI-Powered Smart Call Screening and Routing System.

---

## 2. Global Standards

- **Base URL:** `/api/v1`
- **Content Type:** `application/json`
- **Request Tracing:** All responses include an `X-Request-Id` HTTP header (UUID v4). Clients may provide an `X-Request-Id` header to correlate distributed requests.
- **Security Headers:** Enforced via Helmet (HSTS, Content-Type Options, DNS Prefetch Control, Frameguard).
- **CORS:** Restricted to `FRONTEND_ORIGIN` (defaults to `http://localhost:5173`).
- **Rate Limiting:** 500 requests per 15-minute window per IP.

---

## 3. Endpoints

### 3.1 Basic Liveness Probe

- **Route:** `GET /health`
- **Access:** Public
- **Purpose:** Fast container / load balancer liveness health check.
- **Success Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-01T18:00:00.000Z"
}
```

---

### 3.2 Detailed Diagnostics & Dependency Health

- **Route:** `GET /api/v1/health`
- **Access:** Public
- **Purpose:** Diagnostic overview of system uptime, environment, and external integration adapters.
- **Response Headers:**
  - `X-Request-Id`: `123e4567-e89b-12d3-a456-426614174000`
- **Success Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "ai-call-screening-backend",
  "version": "1.0.0",
  "timestamp": "2026-11-01T18:00:00.000Z",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "uptimeSeconds": 42,
  "environment": "development",
  "dependencies": {
    "database": {
      "provider": "Supabase PostgreSQL",
      "status": "not_configured",
      "message": "Not configured - Phase 2 Foundation Mode"
    },
    "aiEngine": {
      "sttProvider": "Whisper (faster-whisper)",
      "llmProvider": "Ollama (Llama 3.2 / Mistral)",
      "ttsProvider": "Piper TTS",
      "status": "not_configured",
      "message": "Not configured - Local AI Pipeline planned for Phase 6"
    },
    "telephony": {
      "provider": "Asterisk PBX (ARI / PJSIP)",
      "status": "not_configured",
      "message": "Not configured - Asterisk ARI planned for Phase 7"
    }
  }
}
```

---

## 4. Error Handling & Standard Responses

All application errors return a structured JSON response adhering to `ApiErrorResponse`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource 'GET /api/v1/unknown' was not found.",
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": "2026-11-01T18:00:00.000Z"
  }
}
```

### Standard Error Codes
| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `NOT_FOUND` | 404 | Endpoint or resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | IP exceeded 500 requests / 15 min |
| `BAD_REQUEST` | 400 | Invalid request parameters or body |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server error (stack hidden in production) |
| `CORS_ORIGIN_DENIED` | 500 | Request origin rejected by policy |
