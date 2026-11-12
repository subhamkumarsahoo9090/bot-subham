/**
 * Backend voice catalog.
 * Male / Female defaults + beat voices for each.
 * Settings UI loads this through /api/voice-types.
 */

export const VOICE_GENDERS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
];

/** @typedef {{ id: string, label: string, description: string, gender: "male" | "female", kind: "default" | "beat", rate: number, pitch: number, volume: number, nameHints: string[] }} VoiceType */

/** @type {VoiceType[]} */
export const VOICE_TYPES = [
  // Female default
  {
    id: "female-default",
    label: "Default Female",
    description: "Warm natural female voice",
    gender: "female",
    kind: "default",
    rate: 0.96,
    pitch: 1.1,
    volume: 1,
    nameHints: ["neerja", "heera", "swara", "veena", "female", "zira"],
  },
  // Female beat voices
  {
    id: "female-soft-beat",
    label: "Soft Beat",
    description: "Soft and gentle female tone",
    gender: "female",
    kind: "beat",
    rate: 0.9,
    pitch: 1.16,
    volume: 0.95,
    nameHints: ["neerja", "heera", "swara", "female"],
  },
  {
    id: "female-bright-beat",
    label: "Bright Beat",
    description: "Bright energetic female tone",
    gender: "female",
    kind: "beat",
    rate: 1.05,
    pitch: 1.2,
    volume: 1,
    nameHints: ["swara", "neerja", "heera", "female"],
  },
  {
    id: "female-calm-beat",
    label: "Calm Beat",
    description: "Calm slow female narration",
    gender: "female",
    kind: "beat",
    rate: 0.86,
    pitch: 1.05,
    volume: 0.95,
    nameHints: ["heera", "neerja", "veena", "female"],
  },
  {
    id: "female-radio-beat",
    label: "Radio Beat",
    description: "Clear radio-style female voice",
    gender: "female",
    kind: "beat",
    rate: 1.0,
    pitch: 1.08,
    volume: 1,
    nameHints: ["neerja", "heera", "swara", "female"],
  },
  {
    id: "female-story-beat",
    label: "Story Beat",
    description: "Storytelling female rhythm",
    gender: "female",
    kind: "beat",
    rate: 0.92,
    pitch: 1.12,
    volume: 1,
    nameHints: ["swara", "neerja", "heera", "female"],
  },

  // Male default
  {
    id: "male-default",
    label: "Default Male",
    description: "Clear natural male voice",
    gender: "male",
    kind: "default",
    rate: 0.95,
    pitch: 0.92,
    volume: 1,
    nameHints: ["ravi", "hemant", "prabhat", "male", "microsoft ravi", "microsoft hemant"],
  },
  // Male beat voices
  {
    id: "male-deep-beat",
    label: "Deep Beat",
    description: "Deep steady male tone",
    gender: "male",
    kind: "beat",
    rate: 0.88,
    pitch: 0.8,
    volume: 1,
    nameHints: ["ravi", "hemant", "prabhat", "male"],
  },
  {
    id: "male-energy-beat",
    label: "Energy Beat",
    description: "Fast energetic male tone",
    gender: "male",
    kind: "beat",
    rate: 1.08,
    pitch: 0.9,
    volume: 1,
    nameHints: ["ravi", "hemant", "prabhat", "male"],
  },
  {
    id: "male-calm-beat",
    label: "Calm Beat",
    description: "Calm slow male narration",
    gender: "male",
    kind: "beat",
    rate: 0.84,
    pitch: 0.85,
    volume: 0.95,
    nameHints: ["ravi", "hemant", "prabhat", "male"],
  },
  {
    id: "male-news-beat",
    label: "News Beat",
    description: "News-anchor style male voice",
    gender: "male",
    kind: "beat",
    rate: 0.98,
    pitch: 0.88,
    volume: 1,
    nameHints: ["ravi", "hemant", "prabhat", "male"],
  },
  {
    id: "male-story-beat",
    label: "Story Beat",
    description: "Storytelling male rhythm",
    gender: "male",
    kind: "beat",
    rate: 0.91,
    pitch: 0.9,
    volume: 1,
    nameHints: ["ravi", "hemant", "prabhat", "male"],
  },
];

export const DEFAULT_VOICE_GENDER = "female";
export const DEFAULT_VOICE_TYPE_ID = "female-default";

export function getVoicesByGender(gender) {
  return VOICE_TYPES.filter((voice) => voice.gender === gender);
}

export function getDefaultVoiceForGender(gender) {
  return (
    VOICE_TYPES.find((voice) => voice.gender === gender && voice.kind === "default") ||
    VOICE_TYPES.find((voice) => voice.gender === gender) ||
    VOICE_TYPES[0]
  );
}

export function getVoiceTypeById(id) {
  return VOICE_TYPES.find((voice) => voice.id === id) || getDefaultVoiceForGender(DEFAULT_VOICE_GENDER);
}

export function getVoiceCatalog() {
  return {
    genders: VOICE_GENDERS,
    voices: VOICE_TYPES,
    defaults: {
      gender: DEFAULT_VOICE_GENDER,
      voiceTypeId: DEFAULT_VOICE_TYPE_ID,
    },
    grouped: {
      female: {
        default: getDefaultVoiceForGender("female"),
        beats: getVoicesByGender("female").filter((voice) => voice.kind === "beat"),
      },
      male: {
        default: getDefaultVoiceForGender("male"),
        beats: getVoicesByGender("male").filter((voice) => voice.kind === "beat"),
      },
    },
  };
}
