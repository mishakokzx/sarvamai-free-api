# 🎙️ Sarvam Voice & Vision SDK (FREE)

A modern, lightweight, and fully-featured Node.js SDK for the Sarvam AI Playground APIs. Supports Text-to-Speech (TTS), Speech-to-Text (STT Streaming), Translation, and OCR (Vision) out of the box. No API keys required for playground-level usage.

## ✨ Features

- **🗣️ Text-to-Speech (TTS)**: 11+ Indic languages, 37+ neural speakers, adjustable pace, temperature, sample rate, and codec.
- **📄 Speech-to-Text (STT)**: Real-time WebSocket streaming with VAD (Voice Activity Detection) events, auto-language detection, and transcribe/translate/verbatim modes.
- **🌐 Translation**: Bidirectional English ↔ Indic language translation with style control (formal, colloquial), script switching, and gender formatting.
- **👁️ OCR / Vision**: Extract text from images natively in Node.js using Buffers.

## 📦 Installation

```bash
npm install aria-voice-sdk
```

> **Requires Node.js 18+** (Uses native `fetch`, `FormData`, and `Blob`).

## 🚀 Usage

Import the SDK and initialize it:

```javascript
import { AriaVoiceStudio } from 'aria-voice-sdk';
import fs from 'fs';

const aria = new AriaVoiceStudio();
```

### 1. Text-to-Speech (TTS)

Generates an audio buffer that you can save to a file or stream.

```javascript
const audioBuffer = await aria.tts({
  text: "नमस्ते, आप कैसे हैं?",
  language: "hi-IN",
  speaker: "Shubh",
  pace: 1.1,
  temperature: 0.6,
  codec: "mp3"
});

fs.writeFileSync('output.mp3', audioBuffer);
console.log("Audio saved!");
```

### 2. Translation

```javascript
const result = await aria.translate({
  text: "Hello, how are you doing today?",
  sourceLanguage: "auto", // or 'en-IN'
  targetLanguage: "ta-IN", // Tamil
  mode: "formal" // "classic-colloquial", "modern-colloquial"
});

console.log(`Translated: ${result.translatedText}`);
console.log(`Detected Source: ${result.detectedSourceLanguage}`);
```

### 3. OCR / Vision

Extracts text from images. Pass a file buffer and its MIME type.

```javascript
const imageBuffer = fs.readFileSync('document.png');

const ocrResult = await aria.ocr({
  imageBuffer: imageBuffer,
  mimeType: 'image/png',
  language: 'en-IN'
});

console.log("Extracted Text:", ocrResult);
```

### 4. Speech-to-Text (STT Streaming)

Stream raw 16kHz PCM/WAV audio buffers directly to the WebSocket API.

```javascript
const sttController = aria.stt({
  language: "unknown", // Auto-detect
  mode: "transcribe",
  onData: (text, langCode, probability) => {
    console.log(`Transcript chunk: ${text}`);
  },
  onEvent: (event) => {
    if (event === "START_SPEECH") console.log("User started speaking...");
  },
  onError: (err) => console.error("STT Error:", err),
  onClose: () => console.log("STT Connection closed")
});

// Simulate sending audio chunks from a file stream
const audioStream = fs.createReadStream('audio.wav', { highWaterMark: 8000 });
audioStream.on('data', (chunk) => {
  sttController.sendAudioChunk(chunk);
});

audioStream.on('end', () => {
  sttController.stop(); // Flushes remaining audio and closes WS
});
```

## 📚 API Reference

### `aria.tts(options)`
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | `string` | *Required* | Text to synthesize (max 2500 chars). |
| `language` | `string` | `'hi-IN'` | Target language code. |
| `speaker` | `string` | `'Shubh'` | Speaker name. |
| `pace` | `number` | `1.1` | Speech pace (0.5 - 2.0). |
| `temperature` | `number` | `0.6` | Variability (0 - 1.5). |
| `sampleRate` | `number` | `22050` | Audio sample rate. |
| `codec` | `string` | `'mp3'` | Audio format (`mp3`, `wav`, `pcm`). |
| `preprocessing` | `boolean`| `true` | Enable smart text preprocessing. |

### `aria.translate(options)`
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | `string` | *Required* | Text to translate (max 1000 chars). |
| `sourceLanguage` | `string` | `'auto'` | Source language code or `auto`. |
| `targetLanguage` | `string` | `'hi-IN'` | Target language code. |
| `mode` | `string` | `'formal'` | `formal`, `classic-colloquial`, `modern-colloquial`. |
| `script` | `string` | `''` | `roman`, `fully-native`, `spoken-form-in-native`. |
| `numerals` | `string` | `'international'` | `international` (0-9) or `native`. |
| `gender` | `string` | `''` | `Male` or `Female`. |

### `aria.ocr(options)`
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `imageBuffer` | `Buffer` | *Required*| Image file buffer. |
| `mimeType` | `string` | *Required*| e.g., `image/jpeg`, `image/png`. |
| `filename` | `string` | `'upload.jpg'` | Original file name. |
| `language` | `string` | `'en-IN'` | Language code for OCR. |

### `aria.stt(options)`
Returns a controller with `sendAudioChunk(buffer)` and `stop()` methods.
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | `string` | `'unknown'` | Language code or `unknown` for auto-detect. |
| `mode` | `string` | `'transcribe'`| `transcribe`, `translate`, `verbatim`. |
| `onData` | `function` | `null` | Callback `(text, langCode, probability)`. |
| `onEvent` | `function` | `null` | Callback `(signal_type)`. e.g., `START_SPEECH`. |
| `onError` | `function` | `null` | Callback `(error)`. |
| `onClose` | `function` | `null` | Callback `(code, reason)`. |



