"""
Test script for Ollama local LLM inference (Llama 3.2 1B)
SDS Voice Intelligence - Phase 6 Step 2
"""
import time
import json
import urllib.request
import urllib.error

OLLAMA_URL = "http://127.0.0.1:11434"

def test_ollama():
    print("=== Testing Ollama Llama 3.2 1B Inference ===")

    # 1. Verify model is loaded/available
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            models = [m.get("name") for m in data.get("models", [])]
            print(f"Available models: {models}")
            assert any("llama3.2:1b" in m for m in models), "llama3.2:1b model not found in Ollama!"
    except Exception as e:
        assert False, f"ERROR connecting to Ollama: {e}"

    # 2. Run telephony intent classification prompt
    prompt = (
        "You are a telephony routing assistant for SDS Voice Intelligence. "
        "Classify caller intent into one of: [Admissions, Billing, Technical Support, General Inquiry].\n"
        "Caller: \"Hello, I need help with paying my admission fee and getting an official receipt.\"\n"
        "Respond in format:\n"
        "Intent: <intent>\n"
        "Department: <department>\n"
        "Confidence: <high/medium/low>"
    )

    payload = {
        "model": "llama3.2:1b",
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 100
        }
    }

    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )

    print("\nSending telephony intent classification prompt to llama3.2:1b...")
    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            elapsed = time.perf_counter() - start_time
            result = json.loads(resp.read().decode())

            response_text = result.get("response", "").strip()
            total_duration_s = result.get("total_duration", 0) / 1e9
            load_duration_s = result.get("load_duration", 0) / 1e9
            prompt_eval_count = result.get("prompt_eval_count", 0)
            eval_count = result.get("eval_count", 0)
            eval_duration_s = result.get("eval_duration", 0) / 1e9
            tok_per_sec = (eval_count / eval_duration_s) if eval_duration_s > 0 else 0

            print(f"\nModel Response:\n{response_text}")
            print(f"\n--- Performance Metrics ---")
            print(f"Wall-clock elapsed time: {elapsed:.2f}s")
            print(f"Model load duration:     {load_duration_s:.2f}s")
            print(f"Prompt evaluation:       {prompt_eval_count} tokens")
            print(f"Output evaluation:       {eval_count} tokens in {eval_duration_s:.2f}s")
            print(f"Generation speed:        {tok_per_sec:.2f} tokens/second")
            print(f"Total model time:        {total_duration_s:.2f}s")
            assert len(response_text) > 0, "Empty response from Ollama"
            print("\nOLLAMA_INFERENCE_TEST_PASSED")
    except Exception as e:
        assert False, f"ERROR during generation: {e}"

if __name__ == "__main__":
    test_ollama()
