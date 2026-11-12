import { GoogleGenAI } from "@google/genai";
import { botConfig } from "./botConfig";
import type { ChatHistoryItem } from "./chatTypes";
import { DEFAULT_MODEL } from "./modelNames";

type BotArgs = {
  message: string;
  history?: ChatHistoryItem[];
  instruction?: string;
  model?: string;
  fallbackModel?: string;
  useFallback?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateOnce(
  model: string,
  message: string,
  history: ChatHistoryItem[],
  instruction: string,
  temperature: number,
  maxOutputTokens: number
) {
  const response = await ai.models.generateContent({
    model,
    contents: [
      ...history,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ],
    config: {
      systemInstruction: instruction,
      temperature,
      maxOutputTokens,
    },
  });

  return response.text;
}

function isRetryable(err: unknown) {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  return (
    status === 503 ||
    status === 429 ||
    message.includes("fetch failed") ||
    message.includes("UNAVAILABLE") ||
    message.includes("high demand")
  );
}

export default async function bot({
  message,
  history = [],
  instruction,
  model = DEFAULT_MODEL,
  fallbackModel = "gemini-3.8-flash",
  useFallback = true,
  temperature = botConfig.temperature,
  maxOutputTokens = botConfig.maxOutputTokens,
}: BotArgs) {
  if (!message?.trim()) {
    throw new Error("Message is required");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in .env.local");
  }

  const models = useFallback && fallbackModel !== model
    ? [model, fallbackModel]
    : [model];

  let lastError: unknown;

  for (const currentModel of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await generateOnce(
          currentModel,
          message,
          history,
          instruction || botConfig.systemInstruction,
          temperature,
          maxOutputTokens
        );
      } catch (err) {
        lastError = err;
        if (!isRetryable(err) || attempt === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
  }

  const status = (lastError as { status?: number })?.status;
  if (status === 503 || status === 429) {
    throw new Error("Gemini is busy right now. Please try again in a moment.");
  }

  if (lastError instanceof Error && lastError.message.includes("fetch failed")) {
    throw new Error("Could not reach Gemini. Check your internet and try again.");
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to get response from Gemini");
}
