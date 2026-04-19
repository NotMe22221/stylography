/**
 * ElevenLabs Text-to-Speech integration for Stylography.
 * Uses the REST API directly from the browser — no SDK needed.
 */

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const BASE    = 'https://api.elevenlabs.io/v1';

// Rachel — warm, friendly female voice. Good fit for a guide bot.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

/**
 * Convert text to speech and return an audio Blob.
 *
 * @param {string} text       — the narration text
 * @param {object} [options]
 * @param {string} [options.voiceId]  — ElevenLabs voice ID
 * @param {string} [options.modelId]  — model to use
 * @returns {Promise<Blob>}   — mp3 audio blob
 */
export async function textToSpeech(text, options = {}) {
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  const modelId = options.modelId || 'eleven_multilingual_v2';

  const res = await fetch(`${BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key':   API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability:        0.6,
        similarity_boost:  0.8,
        style:            0.4,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${err}`);
  }

  return res.blob();
}

/**
 * Play an MP3 blob (e.g. from {@link textToSpeech}). Used when you need to
 * cancel after fetch — wait for blob, check a guard, then play.
 *
 * @param {Blob} blob
 * @returns {{ audio: HTMLAudioElement, stop: () => void, finished: Promise<void> }}
 */
export function playAudioBlob(blob) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  const cleanup = () => {
    audio.pause();
    audio.currentTime = 0;
    URL.revokeObjectURL(url);
  };

  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });

  return {
    audio,
    stop: cleanup,
    finished: new Promise((resolve) => {
      audio.addEventListener('ended', resolve, { once: true });
      audio.addEventListener('error', resolve, { once: true });
    }),
  };
}

/**
 * Play a text string as speech. Returns a controller to stop playback.
 *
 * @param {string} text
 * @param {object} [options]
 * @returns {Promise<{ audio: HTMLAudioElement, stop: () => void, finished: Promise<void> }>}
 */
export async function speak(text, options = {}) {
  const blob = await textToSpeech(text, options);
  const playback = playAudioBlob(blob);
  await playback.audio.play();
  return playback;
}
