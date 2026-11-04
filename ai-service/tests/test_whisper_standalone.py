import time
import os
from faster_whisper import WhisperModel

def test_transcription():
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "fixtures", "test_16k.wav")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "piper", "test_16k.wav")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tools", "piper", "test_16k.wav")),
        os.path.abspath("tools/piper/test_16k.wav")
    ]
    audio_file = next((p for p in candidates if os.path.exists(p)), None)
    assert audio_file and os.path.exists(audio_file), f"Audio file not found in candidates: {candidates}"

    print("=== Testing faster-whisper (CPU, INT8) ===")
    t0 = time.time()
    # Download / load base.en model with int8 on cpu
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    t_load = time.time() - t0
    print(f"Model loaded in: {t_load:.2f} seconds")

    t1 = time.time()
    segments, info = model.transcribe(audio_file, beam_size=1)
    transcript_segments = list(segments)
    t_infer = time.time() - t1

    full_text = " ".join([s.text.strip() for s in transcript_segments])
    print(f"Transcription completed in: {t_infer:.2f} seconds")
    print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
    print(f"Duration: {info.duration:.2f} seconds")
    print(f"RTF (Real-Time Factor): {t_infer / info.duration:.2f}")
    print(f"Transcription result: \"{full_text}\"")

    assert len(full_text) > 5, "Transcription produced empty result"
    print("\nFASTER_WHISPER_TEST_PASSED")

if __name__ == "__main__":
    test_transcription()
