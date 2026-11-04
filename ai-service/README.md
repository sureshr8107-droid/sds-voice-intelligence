# SDS Voice Intelligence - Local AI Service

FastAPI-based microservice orchestrating local Speech-to-Text (STT), Local LLM intent classification, and Text-to-Speech (TTS) for the SDS Voice Intelligence platform.

## Architecture

- **STT:** faster-whisper (CTranslate2 INT8 CPU inference)
- **LLM:** Ollama (Llama 3.2 1B via localhost HTTP API)
- **TTS:** Piper TTS (Standalone Windows binary with Lessac Medium voice)
- **Audio Processing:** FFmpeg / soundfile (16kHz mono WAV conversion)

## Setup

1. Create and activate virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Copy configuration:
   ```bash
   copy .env.example .env
   ```

3. Ensure Ollama is running:
   ```bash
   ollama run llama3.2:1b
   ```
