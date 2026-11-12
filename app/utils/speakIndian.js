/**
 * Client player for Indian neural TTS (/api/tts).
 * Uses clear en-IN / hi-IN Microsoft neural voices.
 */

let currentAudio = null;
let currentUrl = null;

export function stopIndianSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * @param {string} text
 * @param {{ gender?: "male"|"female", lang?: string, rate?: number, pitch?: number, volume?: number }} options
 */
export async function speakIndianNeural(text, options = {}) {
  const clean = String(text || "").trim();
  if (!clean) return;

  stopIndianSpeech();

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: clean,
      gender: options.gender === "male" ? "male" : "female",
      lang: options.lang || "en-IN",
      rate: options.rate ?? 1,
      pitch: options.pitch ?? 1,
      volume: options.volume ?? 1,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `TTS HTTP ${res.status}`);
  }

  const voice = res.headers.get("X-TTS-Voice") || "indian-neural";
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  currentUrl = url;

  const audio = new Audio(url);
  currentAudio = audio;
  audio.volume = Math.min(
    1,
    Math.max(0, typeof options.volume === "number" ? options.volume : 1)
  );

  if (typeof console !== "undefined") {
    console.info("[tts-indian]", options.gender || "female", voice);
  }

  await new Promise((resolve, reject) => {
    audio.onended = () => {
      stopIndianSpeech();
      resolve();
    };
    audio.onerror = () => {
      stopIndianSpeech();
      reject(new Error("Audio playback failed"));
    };
    const play = audio.play();
    if (play?.catch) {
      play.catch((err) => {
        stopIndianSpeech();
        reject(err);
      });
    }
  });
}
