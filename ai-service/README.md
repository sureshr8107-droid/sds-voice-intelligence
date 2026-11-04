# SDS Voice Intelligence - Local AI Service

FastAPI-based microservice orchestrating local Speech-to-Text (STT), Local LLM intent classification, and Text-to-Speech (TTS) for the SDS Voice Intelligence platform.

## Architecture

- **Speech-to-Text (STT):** `faster-whisper` (CTranslate2 INT8 CPU inference with `base.en` model)
- **Audio Processing:** `FFmpeg` transcoding to telephony standard 16,000 Hz, 1-channel, 16-bit signed PCM WAV
- **Local LLM (Phase 6.4):** `Ollama` (`llama3.2:1b` via localhost HTTP API)
- **Text-to-Speech (Phase 6.5):** `Piper TTS` (Standalone Windows binary with Lessac Medium voice)

---

## Environment Setup & Activation

### 1. Activate the Virtual Environment

From the `ai-service` directory:
```powershell
.\.venv\Scripts\Activate.ps1
```
Or from the project repository root:
```powershell
.\ai-service\.venv\Scripts\Activate.ps1
```

### 2. Configure Environment Variables

Copy the provided example configuration:
```powershell
copy .env.example .env
```

Ensure the key paths and limits are configured:
```ini
# FFmpeg Executable Path
FFMPEG_EXECUTABLE_PATH=../tools/ffmpeg/bin/ffmpeg.exe

# faster-whisper STT Configuration
WHISPER_MODEL=base.en
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_CPU_THREADS=4

# Audio Processing and Upload Limits
MAX_UPLOAD_SIZE_BYTES=26214400
MAX_AUDIO_DURATION_SECONDS=120.0
AUDIO_PROCESSING_TIMEOUT_SECONDS=30.0
```

---

## Starting the Service

Launch the FastAPI service with Uvicorn:
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation is available at:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

---

## API Endpoints

### 1. Health Check
`GET /health` or `GET /api/v1/health`

Reports overall status, STT model configuration, and FFmpeg binary availability without triggering unnecessary model loading into memory.

#### Example Response:
```json
{
  "status": "healthy",
  "service": "sds-voice-intelligence-ai-service",
  "version": "0.1.0",
  "stt": {
    "model_name": "base.en",
    "device": "cpu",
    "compute_type": "int8",
    "loaded": false,
    "available": true
  },
  "ffmpeg": {
    "available": true,
    "path": "tools/ffmpeg/bin/ffmpeg.exe"
  }
}
```

### 2. Speech-to-Text Transcription
`POST /api/v1/audio/transcribe`

Accepts multipart audio upload, converts source audio to 16 kHz Mono 16-bit PCM WAV via FFmpeg, and transcribes speech to English text.

#### Request Parameters:
- `file` *(form-data, required)*: Uploaded audio file (`.wav`, `.mp3`, `.ogg`, `.flac`, `.m4a`, `.aac`, `.webm`, `.wma`) up to 25 MB and 120 seconds duration.

#### Example Request (cURL):
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/audio/transcribe" \
  -H "X-Request-ID: test-call-001" \
  -F "file=@tests/fixtures/test_16k.wav"
```

#### Example Success Response (HTTP 200):
```json
{
  "success": true,
  "transcript": "Hello, welcome to SDS voice intelligence. How may I direct your call?",
  "detected_language": "en",
  "language_probability": 1.0,
  "duration": 4.92,
  "processing_time": 1.365,
  "real_time_factor": 0.278,
  "request_id": "test-call-001"
}
```

#### Example Error Response (HTTP 400 / 413 / 500):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_AUDIO_FORMAT",
    "message": "Unsupported audio format '.txt'. Supported formats: .wav, .mp3, .ogg, .flac, .m4a, .aac, .webm, .wma"
  },
  "request_id": "test-call-001"
}
```

---

### 3. Intent Classification (Phase 6.4)
`POST /api/v1/intent/classify`

Classifies caller speech transcription text into a validated intent category and maps it to a canonical department routing target using the local `llama3.2:1b` model running on Ollama.

#### Department Routing Map:

| Intent Category | Canonical Department | Purpose / Typical Trigger |
| :--- | :--- | :--- |
| `billing_enquiry` | **Billing** | Rate questions, invoice checks, fee explanations |
| `payment_issue` | **Billing** | Failed transactions, card declined, double debits |
| `appointment_booking` | **Customer Service** | Scheduling consultations, callbacks, meetings |
| `appointment_cancellation` | **Customer Service** | Rescheduling or cancelling booked appointments |
| `technical_support` | **Technical Support** | System bugs, error codes, portal login failures |
| `complaint` | **Customer Relations** | Formal grievances, poor service escalation |
| `product_enquiry` | **Sales** | Feature questions, pricing tiers, purchasing |
| `account_enquiry` | **Customer Service** | Account details, password resets, verification |
| `general_enquiry` | **General Support** | Office hours, physical location, general questions |
| `unknown` | *None* | Unclear, background noise, or irrelevant statements |

#### Example Request (cURL):
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/intent/classify" \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-call-002" \
  -d '{
    "transcription": "Hello, I am calling because my recent invoice INV-2024 has an unexpected charge of seventy five dollars and I need to speak to billing.",
    "language": "en",
    "correlation_id": "test-call-002"
  }'
```

#### Example Success Response (HTTP 200):
```json
{
  "success": true,
  "intent": "billing_enquiry",
  "department": "Billing",
  "confidence": 0.94,
  "urgency": "normal",
  "summary": "Caller inquiring about an unexpected charge on invoice INV-2024.",
  "extracted_entities": {
    "invoice": "INV-2024",
    "amount": "seventy five dollars"
  },
  "suggested_response": "I would be happy to connect you with our Billing department to review invoice INV-2024.",
  "requires_clarification": false,
  "clarification_question": null,
  "fallback_used": false,
  "request_id": "test-call-002",
  "processing_time": 0.582
}
```

#### Fallback Response (HTTP 200, Fallback Used):
When Ollama is unreachable, times out, or produces unparseable output, a safe, deterministic fallback response is generated:
```json
{
  "success": true,
  "intent": "unknown",
  "department": null,
  "confidence": 0.0,
  "urgency": "normal",
  "summary": "Unable to determine intent with sufficient confidence.",
  "extracted_entities": {},
  "suggested_response": "I'm sorry, I didn't quite catch that. Could you please tell me how I can assist you?",
  "requires_clarification": true,
  "clarification_question": "Could you please briefly describe what you need assistance with today?",
  "fallback_used": true,
  "request_id": "test-call-002",
  "processing_time": 0.005
}
```

---

## Starting Ollama and Managing Models

### 1. Ensure Ollama is Installed & Running
Start the Ollama daemon on Windows:
```powershell
ollama serve
```
Or start the Ollama Windows Desktop application. Verify the service is active:
```powershell
ollama list
```
Expected output:
```
NAME           ID              SIZE      MODIFIED
llama3.2:1b    baf6a787fd9e    1.3 GB    ...
```

---

## Running Automated Tests

Run the full test suite or specific test modules:
```powershell
# From ai-service directory

# Run Phase 6.4 LLM and Route tests (mocked, sandboxed)
pytest -v tests/test_llm_service.py tests/test_intent_routes.py

# Run optional live Ollama test (requires running Ollama daemon)
pytest -v -s tests/test_ollama_live.py

# Run Phase 6.3 STT and Audio tests
pytest -v tests/test_audio_service.py tests/test_whisper_service.py tests/test_api_endpoints.py tests/test_whisper_standalone.py

# Run all test suites
pytest -v tests/
```

---

## Security & Reliability Design

- **Prompt Injection Defense:** The system prompt explicitly treats caller speech as untrusted input data, prohibiting execution of embedded commands or system overrides.
- **Entity Verification:** Extracted entities are strictly filtered against the original transcription tokens to eliminate LLM hallucinations.
- **Deterministic Department Mapping:** The LLM does not assign department routing; departments are strictly mapped via central business rules.
- **Controlled Urgency & Confidence:** Urgency is constrained to a controlled set (`low`, `normal`, `high`, `critical`) and confidence is numerically clamped between `0.0` and `1.0`.
- **Zero Cloud Leakage:** All inference executes locally on CPU; no customer speech or data is ever transmitted to third-party APIs.

---

## Known Limitations

1. **English Language Only:** The default model `base.en` is an English-only model optimized for rapid telephony routing; non-English speech is decoded into English or rejected.
2. **Audio Duration Cap:** Telephony utterances are capped at 120 seconds by default to maintain bounded CPU time.
3. **No Speaker Diarization / Emotion Analysis:** Phase 6.3 is focused purely on telephony speech-to-text; speaker diarization and emotion tagging are not supported by the lightweight base model.
