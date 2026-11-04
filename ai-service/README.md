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

## Resource Constraints & CPU Execution

- **Hardware Target:** Pure CPU execution on Intel Core i5-1334U (10 cores, 12 threads) with ~1.8–2.2 GB available system memory.
- **Quantization:** `compute_type="int8"` provides ~4x memory reduction and ~3-5x acceleration over full float32 without noticeable telephony transcription degradation.
- **Thread Safety & Sequential Execution:** `WhisperService` enforces internal locks to prevent concurrent inference requests from saturating CPU threads or exceeding RAM limits.
- **Temporary File Isolation:** Uploads and intermediate normalized files are stored under `tmp/audio/` and automatically deleted upon completion or error.

---

## Running Automated Tests

Run the full Phase 6.3 test suite using pytest:
```powershell
# From ai-service directory
pytest -v tests/test_audio_service.py tests/test_whisper_service.py tests/test_api_endpoints.py tests/test_whisper_standalone.py
```

---

## Known Limitations

1. **English Language Only:** The default model `base.en` is an English-only model optimized for rapid telephony routing; non-English speech is decoded into English or rejected.
2. **Audio Duration Cap:** Telephony utterances are capped at 120 seconds by default to maintain bounded CPU time.
3. **No Speaker Diarization / Emotion Analysis:** Phase 6.3 is focused purely on telephony speech-to-text; speaker diarization and emotion tagging are not supported by the lightweight base model.
