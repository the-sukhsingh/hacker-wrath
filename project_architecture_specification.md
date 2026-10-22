# Project Blueprint: Local-First Privacy Companion for Meeting Notes

## 1. Executive Summary
This application is an offline-first mobile meeting companion built for Android using React Native and Expo. It reimagines standard voice recording and meeting summary tools by giving users full control over data privacy, running local Whisper speech-to-text models directly on-device, and offering flexible dual-mode summarization (100% On-Device vs. Cloud API). 

---

## 2. Technical Stack & Dependencies

* **Framework:** React Native (`Expo SDK 51+` using Development Build for native C++ bindings).
* **Language:** TypeScript.
* **Local Speech-To-Text (STT):** `whisper.rn` (Native bindings for `whisper.cpp`).
* **Audio Recording & Processing:** `expo-audio` (Expo SDK 57+ unified audio module, configured for 16kHz PCM WAV output).
* **Calendar Integration:** `expo-calendar`.
* **On-Device LLM (Local Summarization):** `@react-native-mlkit/text-recognition` / `@llama.rn` (or lightweight WebAssembly/ExecuTorch wrapper using Llama-3.2-1B-Instruct GGUF quantized).
* **Cloud API Summarization:** Gemini API SDK (`@google/genai` or direct REST integration) or OpenAI API.
* **State & Local Storage:** Zustand + `react-native-mmkv` / `expo-sqlite` (for fast local note index).

---

## 3. High-Level System Architecture & Flow

```
[ Calendar Integration ]
         │ (Pulls Meeting Title, Attendees, Agenda)
         ▼
[ Local Audio Recorder ] ──(16kHz Mono WAV)──► [ On-Device Whisper Engine ]
                                                          │
                                                    (Raw Text)
                                                          │
                                         ┌────────────────┴────────────────┐
                                         ▼                                 ▼
                               [ Local LLM Engine ]               [ Cloud API Engine ]
                              (Llama-3.2 1B GGUF)               (Gemini / OpenAI API)
                                         │                                 │
                                         └────────────────┬────────────────┘
                                                          ▼
                                            [ Structured Markdown Note ]
```

### Detailed User Flow
1. **Launch & Model Onboarding:**
   * On first launch, the app checks if the Whisper quantized model file (`ggml-tiny.en.bin` ~75MB or `ggml-base.en.bin` ~140MB) exists in the application document directory.
   * If missing, the app displays a lightweight Model Manager screen to download the GGUF/bin file over HTTP into local storage with progress feedback.
2. **Calendar Sync & Selection:**
   * User grants calendar permissions. The home view displays current and upcoming calendar events for the day.
   * The user selects an active calendar event (e.g., "Sprint Planning"), which pre-populates metadata (Title, Time, Participants).
3. **Recording Session:**
   * User taps **Start Recording**.
   * Audio stream is captured in real-time and written into temporary local storage (`.wav` format forced to 16,000 Hz, 16-bit, Mono channel required for Whisper).
   * Live audio waveform animation shows active recording status.
4. **Transcription Phase:**
   * User hits **Stop & Process**.
   * The file URI is passed directly to the native `whisper.rn` binding.
   * C++ native threads run inference against the downloaded `.bin` model using Android NDK/NEON hardware acceleration.
   * Progress bar updates as audio chunks are converted into plain text.
5. **Summarization Phase (Dual Strategy):**
   * **Mode A: Local (100% Offline):** The app feeds the raw transcript + calendar metadata into a small quantized local model via `@llama.rn` running on CPU/GPU.
   * **Mode B: Cloud (Speed & Higher Accuracy):** If active internet is present and selected in settings, the app sends a lightweight request to the Gemini 1.5 Flash API with structured JSON output instructions.
6. **Note Output & Export:**
   * Output is rendered as a clean Markdown note containing:
     * **Executive Summary**
     * **Action Items** (assigned to calendar participants where applicable)
     * **Key Decisions**
     * **Full Raw Transcript**
   * User can copy, export, or save locally.

---

## 4. Local Model Lifecycle & File Management

### Model Download & Storage Strategy
To avoid inflating the initial APK build size, models are fetched on-demand:

```
[ Remote Storage CDN / HuggingFace ]
               │
      (HTTP GET Chunked Download)
               │
               ▼
[ Device File System: FileSystem.documentDirectory + 'models/' ]
               │
               ├── ggml-tiny.en.bin  (75 MB - Default STT)
               └── llama-3.2-1b.gguf (700 MB - Optional Local Summarizer)
```

1. **Remote Location:** Models are fetched from verified HuggingFace Hub URLs (e.g., `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin`).
2. **Download Implementation:** Managed via `expo-file-system` using `createDownloadResumable` to provide percentage progress updates to the UI.
3. **Verification:** Check sum or file size check upon completion before initializing C++ bindings.

---

## 5. Screen Breakdown & UI Requirements

1. **Dashboard / Home Screen (`/index`):**
   * Top Banner: Dynamic status badge (**🔒 Mode: 100% On-Device / Active**).
   * Calendar Widget: Carousel or list of today's meetings.
   * Prominent FAB (Floating Action Button): Quick Record / Quick Note.
2. **Live Recorder Screen (`/recorder`):**
   * Dynamic Audio Waveform visualizer.
   * Timer and File Size indicators.
   * Stop / Pause / Resume controls.
3. **Transcription & Summary Viewer (`/note/[id]`):**
   * Segmented Control tabs: `[ Action Notes ]` | `[ Full Transcript ]`.
   * Markdown rendering with checkbox functionality for action items.
   * Quick Export button (Share text/Markdown file).
4. **Settings & Model Manager (`/settings`):**
   * Processing Engine Toggle: `[ Cloud API (Fast) | On-Device (Private) ]`.
   * API Key Config (for Cloud mode).
   * Model Downloader Card: Download status, Delete local model, Storage footprint metrics.

---

## 6. Target Prompt Schema for Summarization

When invoking the local LLM or Cloud API, format the system prompt using strict context injection:

```text
System: You are an executive assistant summarizing a meeting transcript. 
Context:
- Meeting Title: {CALENDAR_EVENT_TITLE}
- Attendees: {CALENDAR_ATTENDEES}

Transcript:
{RAW_WHISPER_TRANSCRIPT}

Task: Output a concise summary in Markdown with 3 sections:
1. Executive Summary (2-3 sentences)
2. Key Decisions Made (bullet points)
3. Action Items (List action items and assign to attendees if explicitly mentioned, otherwise set as Unassigned).
```

---

## 7. Solo Developer Hackathon Execution Timeline (24-36 Hours)

### Phase 1: Core Setup & Native Module Wiring (Hours 1–6)
* [ ] Initialize Expo app (`npx create-expo-app@latest -t tabs`).
* [ ] Configure Expo Prebuild (`npx expo run:android`) to support native C++ libraries.
* [ ] Install `whisper.rn` and test `ggml-tiny.en.bin` initialization with a sample static `.wav` audio file on an Android emulator or device.

### Phase 2: Audio Recording & Model Download (Hours 7–12)
* [ ] Implement `expo-audio` recording service; ensure audio config is locked to `Sample Rate: 16000Hz`, `Channels: 1 (Mono)`, `Encoding: PCM 16-bit`.
* [ ] Build the HTTP chunked download screen with progress bars for fetching `ggml-tiny.en.bin`.

### Phase 3: Calendar & Summarization Pipeline (Hours 13–18)
* [ ] Wire up `expo-calendar` to query today's events.
* [ ] Implement Cloud Summarization handler (Gemini API) as the default fast path.
* [ ] Implement Local Summarization fallbacks (Regex/Heuristics or `@llama.rn`).

### Phase 4: UI Refinement & Demo Preparation (Hours 19–24)
* [ ] Build clean Note Viewer with Markdown rendering (`react-native-markdown-display`).
* [ ] Add the "Zero-Cloud / Local Privacy Badge" to highlight the track problem statement.
* [ ] Conduct end-to-end testing offline (Airplane mode enabled).
* [ ] Prepare demo pitch video highlighting speed, privacy, and zero server costs.