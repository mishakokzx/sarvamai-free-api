import WebSocket from 'ws';

export const TTS_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi' }, { code: 'bn-IN', name: 'Bengali' },
  { code: 'ta-IN', name: 'Tamil' }, { code: 'te-IN', name: 'Telugu' },
  { code: 'gu-IN', name: 'Gujarati' }, { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' }, { code: 'mr-IN', name: 'Marathi' },
  { code: 'pa-IN', name: 'Punjabi' }, { code: 'od-IN', name: 'Odia' },
  { code: 'en-IN', name: 'English' }
];

export const SPEAKERS = ['Shubh','Aditya','Ritu','Priya','Neha','Rahul','Pooja','Rohan','Simran','Kavya','Amit','Dev','Ishita','Shreya','Ratan','Varun','Manan','Sumit','Roopa','Kabir','Aayan','Ashutosh','Advait','Anand','Tanya','Tarun','Sunny','Mani','Gokul','Vijay','Shruti','Suhani','Mohit','Kavitha','Rehan','Soham','Rupali'];

export class AriaVoiceStudio {
  constructor() {
    this.baseUrl = 'https://www.sarvam.ai/api/playground';
  }

  /**
   * Text to Speech
   * @param {Object} options
   * @returns {Promise<Buffer>} Audio Buffer
   */
  async tts({ text, language = 'hi-IN', speaker = 'Shubh', pace = 1.1, temperature = 0.6, sampleRate = 22050, codec = 'mp3', preprocessing = true }) {
    if (!text || text.length > 2500) throw new Error('Text is required and must be under 2500 characters.');

    const body = {
      text, target_language_code: language, speaker: speaker.toLowerCase(),
      model: 'bulbul:v3-beta', pace, speech_sample_rate: parseInt(sampleRate),
      temperature, enable_preprocessing: preprocessing, output_audio_codec: codec
    };

    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': '*/*' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`TTS API Error: ${err.message || response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Translation
   * @param {Object} options
   * @returns {Promise<Object>} Translation result
   */
  async translate({ text, sourceLanguage = 'auto', targetLanguage = 'hi-IN', mode = 'formal', script = '', numerals = 'international', gender = '' }) {
    if (!text || text.length > 1000) throw new Error('Text is required and must be under 1000 characters.');

    const body = {
      input: text, source_language_code: sourceLanguage,
      target_language_code: targetLanguage, model: 'mayura:v1',
      mode, numerals_format: numerals
    };
    if (script) body.output_script = script;
    if (gender) body.speaker_gender = gender;

    const response = await fetch(`${this.baseUrl}/translation`, {
      method: 'POST',
      headers: { 'Accept': '*/*', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Translation Error: ${data.detail || data.message || response.statusText}`);
    
    return {
      translatedText: data.translated_text || data.translatedText,
      detectedSourceLanguage: data.source_language_code,
      raw: data
    };
  }

  /**
   * OCR / Vision
   * @param {Object} options
   * @param {Buffer} options.imageBuffer - The image file buffer.
   * @param {string} options.mimeType - The MIME type of the image (e.g., 'image/jpeg').
   * @param {string} [options.filename='upload.jpg'] - The original filename.
   * @param {string} [options.language='en-IN'] - Language code for OCR.
   * @returns {Promise<Object>} Parsed JSON response from Sarvam Vision API.
   */
  async ocr({ imageBuffer, mimeType, filename = 'upload.jpg', language = 'en-IN' }) {
    if (!imageBuffer) throw new Error('imageBuffer is required.');

    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: mimeType });
    formData.append('file', imageBlob, filename);
    formData.append('language', language);

    const response = await fetch(`${this.baseUrl}/vision`, {
      method: "POST",
      body: formData,
      headers: {
        "accept": "*/*",
        // Spoofed headers to bypass Sarvam's "Cross site forms are forbidden" protection
        "Origin": "https://www.sarvam.ai",
        "Referer": "https://www.sarvam.ai/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      if (!response.ok) {
        throw new Error(`OCR API Error: ${data.message || data.error || JSON.stringify(data)}`);
      }
      return data;
    } catch (parseError) {
      if (!response.ok) throw new Error(`OCR API Error: ${responseText}`);
      throw new Error(`Failed to parse OCR JSON response: ${responseText}`);
    }
  }

  /**
   * Speech to Text (WebSocket Streaming)
   * @param {Object} options
   * @returns {Object} STT Controller { sendAudioChunk(buffer), stop() }
   */
  stt({ language = 'unknown', mode = 'transcribe', onData, onEvent, onError, onClose }) {
    const wsUrl = `wss://www.sarvam.ai/api/playground/stt-ws?language-code=${encodeURIComponent(language)}&model=saaras:v3&mode=${mode}&vad_signals=true&high_vad_sensitivity=true`;
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => console.log('STT WebSocket Connected'));
    ws.on('message', (dataString) => {
      try {
        const message = JSON.parse(dataString.toString());
        if (message.type === 'data') {
          const transcriptChunk = message.data.transcript.replace(/<nospeech>/gi, '').replace(/<\/nospeech>/gi, '').trim();
          if (transcriptChunk && onData) onData(transcriptChunk, message.data.language_code, message.data.language_probability);
        } else if (message.type === 'events') {
          if (onEvent) onEvent(message.data?.signal_type);
        } else if (message.type === 'error') {
          if (onError) onError(message.data);
        }
      } catch (e) {
        console.error('Failed to parse STT message:', e);
      }
    });

    ws.on('error', (err) => { if (onError) onError(err.message); });
    ws.on('close', (code, reason) => { if (onClose) onClose(code, reason.toString()); });

    return {
      sendAudioChunk(audioBuffer) {
        if (ws.readyState !== WebSocket.OPEN) return;
        const base64data = audioBuffer.toString('base64');
        ws.send(JSON.stringify({ audio: { data: base64data, encoding: "audio/wav", sample_rate: 16000 } }));
      },
      stop() {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'flush' }));
          setTimeout(() => ws.close(), 500);
        }
      }
    };
  }
}
