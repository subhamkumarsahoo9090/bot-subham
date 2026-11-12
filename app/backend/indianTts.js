/**
 * Indian-accent neural TTS via Microsoft Edge Read Aloud voices.
 * These are real en-IN / hi-IN voices (not US/UK browser voices).
 */

export const INDIAN_NEURAL_VOICES = {
  "en-IN": {
    female: "en-IN-NeerjaNeural",
    male: "en-IN-PrabhatNeural",
  },
  "hi-IN": {
    female: "hi-IN-SwaraNeural",
    male: "hi-IN-MadhurNeural",
  },
};

export function resolveIndianVoice({ gender = "female", lang = "en-IN" } = {}) {
  const g = gender === "male" ? "male" : "female";
  const key = String(lang || "en-IN").toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN";
  return {
    voice: INDIAN_NEURAL_VOICES[key][g],
    locale: key,
    gender: g,
  };
}

/** Escape text for SSML / Edge TTS input. */
export function escapeTtsText(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Map UI rate (0.5–2) to Edge prosody rate string.
 * 1 = default, 1.1 ≈ +10%
 */
export function toProsodyRate(rate = 1) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n === 1) return "+0%";
  const pct = Math.round((n - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

/**
 * Map UI pitch (0–2, default ~1) to Edge prosody pitch.
 */
export function toProsodyPitch(pitch = 1, gender = "female") {
  const n = Number(pitch);
  const base = Number.isFinite(n) ? n : gender === "male" ? 0.9 : 1.1;
  // Keep Indian neural voices natural — light pitch nudge only
  const delta = Math.round((base - 1) * 20);
  const clamped = Math.max(-20, Math.min(20, delta));
  return `${clamped >= 0 ? "+" : ""}${clamped}Hz`;
}

export function toProsodyVolume(volume = 1) {
  const n = Number(volume);
  if (!Number.isFinite(n)) return "+0%";
  const pct = Math.round((Math.min(1, Math.max(0, n)) - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}
