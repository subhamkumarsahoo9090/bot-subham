export type ModelOption = {
  id: string;
  label: string;
  description: string;
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    description: "Fast and low-cost for everyday chat",
  },
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    description: "Balanced speed and quality",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    description: "Solid all-round flash model",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite",
    description: "Lightweight and quick replies",
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash Preview",
    description: "Preview flash model",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
    description: "Stronger reasoning for harder tasks",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Legacy flash (may route to newer models)",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    description: "Legacy lite model",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    description: "Older generation flash model",
  },
  {
    id: "gemini-2.0-flash-lite",
    label: "Gemini 2.0 Flash-Lite",
    description: "Older generation lite model",
  },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0].id;

export const MODEL_IDS = MODEL_OPTIONS.map((model) => model.id);
