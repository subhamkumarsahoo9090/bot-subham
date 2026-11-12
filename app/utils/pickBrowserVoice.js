/**
 * Browser TTS voice picker.
 * Critical: utterance.lang MUST equal voice.lang or Chrome drops the voice
 * and falls back to a default (often Indian female for en-IN / hi-IN).
 */

const FEMALE_HINTS = [
  "female",
  "zira",
  "samantha",
  "neerja",
  "heera",
  "swara",
  "veena",
  "kalpana",
  "hazel",
  "susan",
  "karen",
  "moira",
  "tessa",
  "woman",
  "girl",
  "aria",
  "jenny",
  "michelle",
  "google uk english female",
];

const MALE_HINTS = [
  "male",
  "david",
  "mark",
  "ravi",
  "hemant",
  "prabhat",
  "george",
  "daniel",
  "thomas",
  "richard",
  "james",
  "ryan",
  "christopher",
  "andrew",
  "google uk english male",
  "google us english",
];

const INDIAN_HINTS = [
  "india",
  "indian",
  "hindi",
  "hi-in",
  "en-in",
  "ravi",
  "neerja",
  "heera",
  "swara",
  "veena",
  "kalpana",
  "hemant",
  "prabhat",
];

function textOf(voice) {
  return `${voice?.name || ""} ${voice?.lang || ""} ${voice?.voiceURI || ""}`.toLowerCase();
}

function hasHint(text, hints) {
  return hints.some((hint) => text.includes(hint));
}

function hasMaleKeyword(text) {
  if (text.includes("female") || text.includes("woman") || text.includes("girl")) {
    return false;
  }
  if (text.includes("male")) return true;
  if (/\bman\b/.test(text) || /\bboy\b/.test(text)) return true;
  return false;
}

function hasFemaleKeyword(text) {
  return (
    text.includes("female") ||
    text.includes("woman") ||
    text.includes("girl")
  );
}

export function detectGender(voice) {
  const text = textOf(voice);
  if (hasFemaleKeyword(text) || hasHint(text, FEMALE_HINTS)) return "female";
  if (hasMaleKeyword(text) || hasHint(text, MALE_HINTS)) return "male";
  return "unknown";
}

export function isIndianVoice(voice) {
  const text = textOf(voice);
  const lang = String(voice?.lang || "").toLowerCase();
  if (lang === "hi-in" || lang === "en-in" || lang.startsWith("hi")) return true;
  return hasHint(text, INDIAN_HINTS);
}

export function resolveSpeechLang(preferredLang = "en-IN", text = "") {
  const hindiCount = (String(text).match(/[\u0900-\u097F]/g) || []).length;
  if (hindiCount > 0 || String(preferredLang).toLowerCase().startsWith("hi")) {
    return "hi-IN";
  }
  if (String(preferredLang).toLowerCase().startsWith("en")) {
    return preferredLang;
  }
  return "en-IN";
}

function voiceKey(voice) {
  return voice?.voiceURI || voice?.name || "";
}

export function findVoiceByURI(voices, uri) {
  if (!uri || !voices?.length) return null;
  return (
    voices.find((v) => v.voiceURI === uri) ||
    voices.find((v) => v.name === uri) ||
    null
  );
}

function rankVoice(voice, { gender, lang, preferIndian }) {
  const detected = detectGender(voice);
  const voiceLang = String(voice.lang || "").toLowerCase();
  const want = String(lang || "en-IN").toLowerCase();
  let score = 0;

  if (detected === gender) score += 1000;
  else if (detected === "unknown") score += 30;
  else score -= 5000;

  if (preferIndian && isIndianVoice(voice)) score += 500;

  if (voiceLang === want) score += 120;
  else if (want.startsWith("hi") && voiceLang.startsWith("hi")) score += 100;
  else if (want.startsWith("en") && voiceLang === "en-in") score += 90;
  else if (want.startsWith("en") && voiceLang.startsWith("en")) score += 40;

  if (voice.localService) score += 15;
  return score;
}

function getCandidates(voices, gender, preferIndian) {
  const exact = voices.filter((v) => detectGender(v) === gender);
  const unknown = voices.filter((v) => detectGender(v) === "unknown");
  const indianExact = exact.filter(isIndianVoice);
  const indianUnknown = unknown.filter(isIndianVoice);

  // Gender first. Never return opposite gender.
  if (preferIndian && indianExact.length) return indianExact;
  if (exact.length) return exact;
  if (preferIndian && indianUnknown.length) return indianUnknown;
  if (unknown.length) return unknown;
  return [];
}

export function waitForBrowserVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish);
    // Chrome sometimes needs an initial call to kick off loading
    window.speechSynthesis.getVoices();
    setTimeout(finish, 800);
  });
}

/**
 * List voices for Settings UI.
 */
export function listBrowserVoiceOptions(voices, gender) {
  const want = gender === "male" ? "male" : "female";
  const scored = (voices || []).map((voice) => {
    const detected = detectGender(voice);
    let score = 0;
    if (detected === want) score += 100;
    else if (detected === "unknown") score += 20;
    else score -= 200;
    if (isIndianVoice(voice)) score += 50;
    return {
      uri: voiceKey(voice),
      name: voice.name,
      lang: voice.lang,
      gender: detected,
      indian: isIndianVoice(voice),
      local: Boolean(voice.localService),
      score,
      label: `${voice.name} (${voice.lang})${isIndianVoice(voice) ? " · Indian" : ""}${
        detected !== "unknown" ? ` · ${detected}` : ""
      }`,
    };
  });

  return scored
    .filter((v) => v.score > -100)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/**
 * @param {SpeechSynthesisVoice[]} voices
 * @param {{ gender?: "male"|"female", lang?: string, preferIndian?: boolean, nameHints?: string[], voiceURI?: string }} profile
 */
export function pickBrowserVoice(voices, profile = {}) {
  if (!voices?.length) return null;

  // Exact user-selected OS voice wins
  if (profile.voiceURI) {
    const locked = findVoiceByURI(voices, profile.voiceURI);
    if (locked) return locked;
  }

  const gender = profile.gender === "male" ? "male" : "female";
  const lang = resolveSpeechLang(profile.lang || "en-IN");
  const preferIndian = profile.preferIndian !== false;
  const candidates = getCandidates(voices, gender, preferIndian);
  if (!candidates.length) return null;

  const oppositeHints = gender === "male" ? FEMALE_HINTS : MALE_HINTS;

  const ranked = candidates
    .map((voice) => {
      let score = rankVoice(voice, { gender, lang, preferIndian });
      for (const hint of profile.nameHints || []) {
        const h = String(hint).toLowerCase();
        if (oppositeHints.some((bad) => h.includes(bad))) continue;
        if (textOf(voice).includes(h)) score += 25;
      }
      return { voice, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.voice || null;
  if (!best) return null;

  const bestGender = detectGender(best);
  if (bestGender !== "unknown" && bestGender !== gender) {
    return voices.find((v) => detectGender(v) === gender) || null;
  }

  return best;
}

/**
 * Apply voice safely for Chrome/Edge:
 * set voice, then lang = voice.lang (never force mismatched locale).
 */
export function applyVoiceToUtterance(utterance, voices, profile = {}) {
  const gender = profile.gender === "male" ? "male" : "female";
  const preferredLang = resolveSpeechLang(
    profile.lang || "en-IN",
    utterance.text || ""
  );

  const voice = pickBrowserVoice(voices, {
    gender,
    lang: preferredLang,
    preferIndian: profile.preferIndian !== false,
    nameHints: profile.nameHints || [],
    voiceURI: profile.voiceURI || "",
  });

  if (typeof profile.rate === "number" && Number.isFinite(profile.rate)) {
    utterance.rate = profile.rate;
  }
  if (typeof profile.volume === "number" && Number.isFinite(profile.volume)) {
    utterance.volume = profile.volume;
  }

  const pitch =
    typeof profile.pitch === "number" && Number.isFinite(profile.pitch)
      ? profile.pitch
      : gender === "male"
        ? 0.85
        : 1.12;
  utterance.pitch = gender === "male" ? Math.min(pitch, 0.92) : Math.max(pitch, 1.05);

  if (voice) {
    // Order matters: voice first, then lang MUST match voice.lang
    utterance.voice = voice;
    utterance.lang = voice.lang || preferredLang;
  } else {
    utterance.lang = preferredLang;
  }

  return voice;
}

/** Chrome sometimes stays paused after cancel(); resume before speak. */
export function safeSpeak(utterance) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.reject(new Error("Speech synthesis not available"));
  }

  window.speechSynthesis.cancel();
  try {
    window.speechSynthesis.resume();
  } catch {
    // ignore
  }

  return new Promise((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      if (event?.error === "canceled" || event?.error === "interrupted") {
        resolve();
        return;
      }
      reject(event.error || new Error("Speech failed"));
    };

    // Small delay helps Chrome actually apply utterance.voice
    setTimeout(() => {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
      window.speechSynthesis.speak(utterance);
    }, 40);
  });
}
