# Telephony Integration & Testing Guide

## 1. Overview

This document details the configuration and testing procedures for the Asterisk PBX, Asterisk REST Interface (ARI), and SIP softphones.

---

## 2. Test Environment Architecture

Because native Asterisk requires a Linux kernel, there are two primary options for development:
1. **Ubuntu Environment / Cloud VPS / WSL2**: Native Asterisk 20+ installation.
2. **Built-in Node.js Telephony Simulator**: Included in the backend for rapid full-lifecycle testing on Windows without requiring Linux virtualization.

---

## 3. Configuring Softphones for Zero-Cost Testing

### Softphone A: Caller Endpoint (Windows)
- Software: **MicroSIP** (Free, Open-Source for Windows) or **Linphone Desktop**.
- Extension: `100` (Caller)
- Domain / PBX Host: `127.0.0.1:5060` (or your Asterisk server IP)
- Transport: UDP or TCP

### Softphone B: Staff Endpoint (Android Phone)
- Software: **Linphone** or **Zoiper** (Free from Google Play Store).
- Extension: `101` or `102` (Staff - Admissions / Dr. Sharma)
- Domain / PBX Host: Laptop's local Wi-Fi IP (e.g. `192.168.1.15:5060`)
- Audio Codec: Opus, PCMU (G.711u), PCMA (G.711a)

---

## 4. Asterisk ARI Call Flow Details

1. **Incoming Call Arrival**:
   - PJSIP channel triggers Stasis application `call-screening`.
   - Backend ARI client receives `StasisStart` event.
2. **AI Greeting & Recording**:
   - Backend calls `POST /channels/{channelId}/play` with greeting audio.
   - Backend initiates `POST /channels/{channelId}/record` to capture caller's spoken statement (WAV format, 8kHz Mono).
3. **Speech-to-Text & Classification**:
   - Audio buffer is passed to Whisper / faster-whisper.
   - Text is sent to Ollama with the system prompt to classify intent and extract target department and staff name.
4. **Staff Notification & Bridging**:
   - Backend evaluates routing rules in database.
   - Socket.IO broadcasts `call_screening_incoming` to the assigned staff member's dashboard.
   - If accepted within 20s:
     - Backend calls `POST /channels/create` to originate a call to staff endpoint (`PJSIP/102`).
     - Once staff answers, ARI creates a bridge (`POST /bridges`) and adds both channels (`POST /bridges/{bridgeId}/addChannel`).
   - If rejected or timeout:
     - Backend plays prompt: *"All staff members are currently occupied. Please leave a message or request a callback."*
     - Asterisk records caller's voicemail/callback audio, transcribes it, and saves it in `callback_requests`.
