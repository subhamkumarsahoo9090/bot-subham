/**
 * Skill: natural Hindi + English speech style with Indian accent.
 */

import { pickBrowserVoice, resolveSpeechLang } from "../../pickBrowserVoice.js";

const HINDI_CHARS = /[\u0900-\u097F]/;

function isMostlyHindi(text) {
  const hindi = (text.match(HINDI_CHARS) || []).length;
  const letters = (text.match(/[A-Za-z\u0900-\u097F]/g) || []).length;
  return letters > 0 && hindi / letters >= 0.35;
}

function softenForSpeech(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, " code block. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/\b(e\.g\.|i\.e\.)\b/gi, " for example ")
    .replace(/\b(etc)\b/gi, " etcetera ")
    .replace(/\b(AI)\b/g, " A I ")
    .replace(/\b(API)\b/g, " A P I ")
    .replace(/\b(UI)\b/g, " U I ")
    .replace(/([.!?])\s+/g, "$1 ")
    .replace(/,\s+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const humanSpeechSkill = {
  id: "human-speech",
  name: "Human Speech Hindi/English",
  enabled: true,
  priority: 10,

  getPromptRules() {
    return `
SKILL MODULE: Human Speech
- Speak like a real person, not like a robot or textbook.
- Match the user's language: Hindi, English, or natural Hinglish.
- Keep spoken answers short, warm, and conversational.
- Prefer everyday words over formal / robotic phrasing.
- Use light natural connectors when helpful: "haan", "dekho", "okay so", "basically".
- Avoid markdown, bullet spam, and symbol-heavy formatting in normal chat replies.
- Never use LaTeX ($...$, \\int, \\frac). Write math in plain text like x^2 / 2 + C.
- For code, keep code blocks, but add one short spoken summary around them.
- Do not over-explain. Sound natural in Hindi and English.
`.trim();
  },

  prepareText(text) {
    return softenForSpeech(text);
  },

  resolveLang(text, preferredLang = "en-IN") {
    if (isMostlyHindi(text) || preferredLang?.startsWith("hi")) {
      return "hi-IN";
    }
    return resolveSpeechLang(preferredLang || "en-IN", text);
  },

  pickVoice(voices, context) {
    const lang = this.resolveLang(context.text, context.lang);
    const profile = context.options?.voiceProfile || {};
    return pickBrowserVoice(voices, {
      gender: profile.gender === "male" ? "male" : "female",
      lang,
      nameHints: profile.nameHints || [],
      preferIndian: true,
    });
  },

  configureUtterance(utterance, context) {
    const lang = this.resolveLang(context.text, context.lang);
    const profile = context.options?.voiceProfile;
    const gender = profile?.gender === "male" ? "male" : "female";

    // Rate/pitch only — final voice + matching lang are applied in speakWithSkills
    utterance.rate = profile?.rate ?? (lang.startsWith("hi") ? 0.9 : 0.95);
    utterance.pitch = profile?.pitch ?? (gender === "male" ? 0.85 : 1.1);
    utterance.volume = profile?.volume ?? 1;
  },
};

export default humanSpeechSkill;
