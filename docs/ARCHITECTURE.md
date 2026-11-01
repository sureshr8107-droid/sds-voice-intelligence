# AI-Powered Smart Call Screening and Routing System

## Architectural Blueprint & System Design

### 1. High-Level System Architecture

The system consists of five primary layers:
1. **Telephony & PBX Layer**: Asterisk 20+ running PJSIP channels, with Asterisk REST Interface (ARI) WebSocket / HTTP stasis event streaming.
2. **AI Screening Engine**:
   - Audio capture & conversion (16-bit 8kHz/16kHz Mono PCM via FFmpeg/PJSIP).
   - Local STT: Whisper / faster-whisper.
   - Intent & Entity Extraction: Ollama (LLM) with strict JSON schema validation.
   - Local TTS: Piper TTS / audio greeting synthesis.
3. **Core Backend & Routing Service**:
   - Node.js & TypeScript Express REST API.
   - Socket.IO server for real-time staff push notifications.
   - State Machine: Strict finite state machine tracking call progression (`initiated` -> `answered_by_ai` -> `processing` -> `awaiting_staff` -> `bridged` / `callback_requested` / `completed`).
   - Audit logging & Security guards (rate-limiting, CORS, Zod validation).
4. **Data & Identity Layer**:
   - Supabase PostgreSQL with Row Level Security (RLS).
   - Supabase Auth (JWT validation on Express backend).
5. **Frontend Web Console**:
   - React 18+ / Vite / TypeScript.
   - Bootstrap 5 + custom modern luxury glassmorphism aesthetics.
   - Dual dashboards:
     - **Admin Management Console**: Live calls monitor, call history, department & staff management, routing rules, AI settings, telephony diagnostics, audit logs.
     - **Staff Call Reception Console**: Live incoming screened call alerts with 20s countdown, caller summary, intent tags, one-click Accept (bridge) and Reject (transfer to voicemail) controls, and availability toggle.

---

### 2. Telephony Reality & Hardware Constraints

- **Android Smartphone SIM Card Reality**:
  Android OS does not expose the baseband radio cellular voice stream over USB to a host PC as a voice audio device without custom baseband firmware or specialized GSM hardware. Attempting to hijack an Android phone's SIM via ADB/USB for real-time audio bridging will cause high latency, audio clipping, and connection drops.
- **Testing Approach**:
  - We configure standard **SIP endpoints (Softphones)**:
    - **MicroSIP** or **Linphone** on Windows (representing an external caller or staff extension).
    - **Linphone** or **Zoiper** on the Android smartphone connected over local Wi-Fi / LTE to Asterisk (representing staff extension 101/102).
  - This allows testing real 2-way audio, DTMF, ARI channel bridging, and failover completely free with zero hardware expense.
- **Production Approach**:
  - Connect a Cloud SIP Trunk (e.g. Twilio, Telnyx, Zadarma) or an on-premise hardware GSM/VoIP Gateway (e.g. OpenVox / Yeastar with SIM card slots) to Asterisk PBX.
