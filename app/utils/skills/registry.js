/**
 * Central skill registry.
 *
 * Add a new skill later:
 * 1) create app/utils/skills/modules/yourSkill.js
 * 2) register it in modules/index.js
 *
 * Existing modules stay untouched.
 */

import { applyVoiceToUtterance, safeSpeak } from "../pickBrowserVoice.js";
import { speakIndianNeural, stopIndianSpeech } from "../speakIndian.js";

const skills = new Map();

function sortSkills(list) {
  return [...list].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

export function registerSkill(skill) {
  if (!skill?.id) {
    throw new Error("Skill must have an id");
  }
  skills.set(skill.id, skill);
}

export function unregisterSkill(id) {
  skills.delete(id);
}

export function listSkills() {
  return sortSkills([...skills.values()]);
}

/**
 * @param {string[]} [disabledSkillIds]
 */
export function getEnabledSkills(disabledSkillIds = []) {
  const disabled = new Set(disabledSkillIds || []);
  return listSkills().filter(
    (skill) => skill.enabled !== false && !disabled.has(skill.id)
  );
}

/**
 * Merge all enabled skill prompt rules for the LLM.
 * @param {string[]} [disabledSkillIds]
 */
export function getSkillsPrompt(disabledSkillIds = []) {
  return getEnabledSkills(disabledSkillIds)
    .map((skill) => skill.getPromptRules?.())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Append skill training rules to the base system instruction.
 * @param {string} baseInstruction
 * @param {string[]} [disabledSkillIds]
 */
export function withSkillInstructions(baseInstruction = "", disabledSkillIds = []) {
  const training = getSkillsPrompt(disabledSkillIds);
  if (!training) return baseInstruction;
  return `${baseInstruction.trim()}\n\n${training}`;
}

/**
 * Build final speech settings after every enabled speech-capable skill runs.
 */
export function buildSpeechPlan(rawText, options = {}) {
  const enabled = getEnabledSkills(options.disabledSkillIds || []);
  let text = String(rawText || "").trim();
  const context = {
    lang: options.lang || "en-IN",
    text,
    options,
  };

  for (const skill of enabled) {
    if (typeof skill.prepareText === "function") {
      text = skill.prepareText(text, context) || text;
      context.text = text;
    }
  }

  const plan = {
    text,
    lang: context.lang,
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null,
  };

  const voices =
    typeof window !== "undefined" && window.speechSynthesis
      ? window.speechSynthesis.getVoices()
      : [];

  for (const skill of enabled) {
    if (typeof skill.pickVoice === "function") {
      const picked = skill.pickVoice(voices, { ...context, text });
      if (picked) plan.voice = picked;
    }
  }

  return { plan, context, enabled };
}

function waitForVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.onvoiceschanged = done;
    setTimeout(done, 400);
  });
}

async function speakBrowserFallback(plan, context, enabled, options) {
  await waitForVoices();
  if (typeof window === "undefined" || !window.speechSynthesis) {
    throw new Error("Speech synthesis not available");
  }

  const utterance = new SpeechSynthesisUtterance(plan.text);
  utterance.lang = plan.lang;
  utterance.rate = plan.rate;
  utterance.pitch = plan.pitch;
  utterance.volume = plan.volume;

  for (const skill of enabled) {
    if (typeof skill.configureUtterance === "function") {
      skill.configureUtterance(utterance, { ...context, text: plan.text });
    }
  }

  const voices = window.speechSynthesis.getVoices();
  applyVoiceToUtterance(utterance, voices, {
    ...(options.voiceProfile || {}),
    lang: options.lang || options.voiceProfile?.lang || "en-IN",
    preferIndian: true,
  });

  return safeSpeak(utterance);
}

/**
 * Speak with Indian neural accent first (Edge en-IN / hi-IN).
 * Falls back to browser TTS only if neural API fails.
 */
export async function speakWithSkills(rawText, options = {}) {
  if (typeof window === "undefined") {
    throw new Error("Speech not available");
  }

  const { plan, context, enabled } = buildSpeechPlan(rawText, options);
  if (!plan.text) return;

  stopIndianSpeech();

  const profile = options.voiceProfile || {};
  const gender = profile.gender === "male" ? "male" : "female";
  // Always Indian neural locale (never US/UK accent voices)
  const rawLang = options.lang || profile.lang || "en-IN";
  const lang = String(rawLang).toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN";

  // Soften rate/pitch from skills if present
  let rate = typeof profile.rate === "number" ? profile.rate : 0.98;
  let pitch = typeof profile.pitch === "number" ? profile.pitch : gender === "male" ? 0.92 : 1.05;
  let volume = typeof profile.volume === "number" ? profile.volume : 1;

  for (const skill of enabled) {
    if (typeof skill.configureUtterance === "function") {
      const fake = { rate, pitch, volume, lang };
      skill.configureUtterance(fake, { ...context, text: plan.text });
      if (typeof fake.rate === "number") rate = fake.rate;
      if (typeof fake.pitch === "number") pitch = fake.pitch;
      if (typeof fake.volume === "number") volume = fake.volume;
    }
  }

  try {
    await speakIndianNeural(plan.text, {
      gender,
      lang,
      rate,
      pitch,
      volume,
    });
    return;
  } catch (err) {
    console.warn("[tts] Indian neural failed, browser fallback:", err);
    return speakBrowserFallback(plan, context, enabled, options);
  }
}
