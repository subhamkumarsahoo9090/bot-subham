import { botConfig } from "./botConfig";
import { DEFAULT_MODEL, MODEL_IDS } from "./modelNames";
import {
  DEFAULT_VOICE_GENDER,
  DEFAULT_VOICE_TYPE_ID,
  getDefaultVoiceForGender,
  getVoiceTypeById,
  VOICE_TYPES,
} from "../backend/voiceTypes.js";

export const SETTINGS_STORAGE_KEY = "miss-ai-settings";

export type AppSettings = {
  model: string;
  fallbackModel: string;
  useFallback: boolean;
  botName: string;
  systemInstruction: string;
  temperature: number;
  maxOutputTokens: number;
  speakReplies: boolean;
  voiceLanguage: string;
  voiceGender: "male" | "female";
  voiceTypeId: string;
  /** Exact OS / browser voiceURI (or name). Empty = auto pick. */
  browserVoiceURI: string;
  voiceRate: number;
  voicePitch: number;
  voiceVolume: number;
  continuousListen: boolean;
  autoSendVoice: boolean;
  enterToSend: boolean;
  showTimestamps: boolean;
  disabledSkillIds: string[];
};

export type ChatRuntimeSettings = Pick<
  AppSettings,
  | "model"
  | "fallbackModel"
  | "useFallback"
  | "systemInstruction"
  | "temperature"
  | "maxOutputTokens"
>;

export const VOICE_LANGUAGES = [
  { id: "en-IN", label: "English (India accent)" },
  { id: "hi-IN", label: "Hindi (India)" },
  { id: "en-US", label: "English listen (US) — speak still Indian" },
  { id: "en-GB", label: "English listen (UK) — speak still Indian" },
] as const;

export const defaultSettings: AppSettings = {
  model: DEFAULT_MODEL,
  fallbackModel: "gemini-3.8-flash",
  useFallback: true,
  botName: botConfig.name,
  systemInstruction: botConfig.systemInstruction.trim(),
  temperature: botConfig.temperature,
  maxOutputTokens: botConfig.maxOutputTokens,
  speakReplies: true,
  voiceLanguage: "en-IN",
  voiceGender: DEFAULT_VOICE_GENDER,
  voiceTypeId: DEFAULT_VOICE_TYPE_ID,
  browserVoiceURI: "",
  voiceRate: getVoiceTypeById(DEFAULT_VOICE_TYPE_ID).rate,
  voicePitch: getVoiceTypeById(DEFAULT_VOICE_TYPE_ID).pitch,
  voiceVolume: getVoiceTypeById(DEFAULT_VOICE_TYPE_ID).volume,
  continuousListen: false,
  autoSendVoice: true,
  enterToSend: true,
  showTimestamps: false,
  disabledSkillIds: [],
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toFinite(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeSettings(input: Partial<AppSettings> | null | undefined): AppSettings {
  const merged = { ...defaultSettings, ...(input || {}) };
  const gender = merged.voiceGender === "male" ? "male" : "female";
  const validVoiceIds = new Set(VOICE_TYPES.map((voice) => voice.id));
  let voiceTypeId = validVoiceIds.has(merged.voiceTypeId)
    ? merged.voiceTypeId
    : getDefaultVoiceForGender(gender).id;

  const selected = getVoiceTypeById(voiceTypeId);
  if (selected.gender !== gender) {
    voiceTypeId = getDefaultVoiceForGender(gender).id;
  }

  return {
    ...merged,
    model: MODEL_IDS.includes(merged.model) ? merged.model : defaultSettings.model,
    fallbackModel: MODEL_IDS.includes(merged.fallbackModel)
      ? merged.fallbackModel
      : defaultSettings.fallbackModel,
    temperature: clamp(Number(merged.temperature) || defaultSettings.temperature, 0, 2),
    maxOutputTokens: clamp(
      Number(merged.maxOutputTokens) || defaultSettings.maxOutputTokens,
      64,
      8192
    ),
    botName: merged.botName?.trim() || defaultSettings.botName,
    systemInstruction: merged.systemInstruction?.trim() || defaultSettings.systemInstruction,
    voiceLanguage: merged.voiceLanguage || defaultSettings.voiceLanguage,
    voiceGender: gender,
    voiceTypeId,
    browserVoiceURI:
      typeof merged.browserVoiceURI === "string" ? merged.browserVoiceURI : "",
    voiceRate: clamp(toFinite(merged.voiceRate, defaultSettings.voiceRate), 0.5, 2),
    voicePitch: clamp(toFinite(merged.voicePitch, defaultSettings.voicePitch), 0, 2),
    voiceVolume: clamp(toFinite(merged.voiceVolume, defaultSettings.voiceVolume), 0, 1),
    continuousListen: Boolean(merged.continuousListen),
    useFallback: Boolean(merged.useFallback),
    speakReplies: Boolean(merged.speakReplies),
    autoSendVoice: Boolean(merged.autoSendVoice),
    enterToSend: Boolean(merged.enterToSend),
    showTimestamps: Boolean(merged.showTimestamps),
    disabledSkillIds: Array.isArray(merged.disabledSkillIds)
      ? merged.disabledSkillIds.filter((id) => typeof id === "string")
      : [],
  };
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizeSettings(settings))
  );
}
