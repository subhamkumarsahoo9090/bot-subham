"use client";

import { useEffect, useRef, useState } from "react";
import { IoRocketSharp, IoMic, IoMicOff } from "react-icons/io5";
import AppNav from "./AppNav";
import { useSettings } from "../hooks/useSettings";
import type { ChatHistoryItem } from "../utils/chatTypes";
import type { ChatRuntimeSettings } from "../utils/settings";
import {
  speakWithSkills,
  withSkillInstructions,
} from "../utils/skills";
import { stopIndianSpeech } from "../utils/speakIndian.js";
import { getVoiceTypeById } from "../backend/voiceTypes.js";
import { formatBotText } from "../utils/formatBotText";

type UiMessage = ChatHistoryItem & { at: number };

type ButUiProps = {
  sendMessage: (
    message: string,
    history?: ChatHistoryItem[],
    runtimeSettings?: ChatRuntimeSettings
  ) => Promise<string | undefined>;
};

type SpeechRecognitionResultLike = {
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function toApiHistory(messages: UiMessage[]): ChatHistoryItem[] {
  return messages.map(({ role, parts }) => ({ role, parts }));
}

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ButUi = ({ sendMessage }: ButUiProps) => {
  const { settings, ready } = useSettings();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const historyRef = useRef<UiMessage[]>([]);
  const loadingRef = useRef(false);
  const settingsRef = useRef(settings);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    settingsRef.current = settings;
    if (recognitionRef.current) {
      recognitionRef.current.lang = settings.voiceLanguage;
    }
  }, [settings]);

  useEffect(() => {
    const box = messagesRef.current;
    if (!box) return;
    // Scroll only inside messages panel — never move the whole page/UI.
    box.scrollTop = box.scrollHeight;
  }, [history, loading]);

  useEffect(() => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);
    const recognition = new Recognition();
    recognition.lang = settingsRef.current.voiceLanguage;
    recognition.continuous = Boolean(settingsRef.current.continuousListen);
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setMessage(transcript);
      if (settingsRef.current.autoSendVoice) {
        void sendText(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      shouldListenRef.current = false;
    };

    recognition.onend = () => {
      setListening(false);
      if (shouldListenRef.current && !loadingRef.current) {
        try {
          recognition.start();
          setListening(true);
        } catch {
          shouldListenRef.current = false;
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognition.stop();
      window.speechSynthesis?.cancel();
      stopIndianSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakText = (text: string) => {
    if (!settingsRef.current.speakReplies || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const baseVoice = getVoiceTypeById(settingsRef.current.voiceTypeId);
    const gender =
      settingsRef.current.voiceGender === "male" ? "male" : "female";
    void speakWithSkills(text, {
      lang: settingsRef.current.voiceLanguage,
      voiceProfile: {
        ...baseVoice,
        gender,
        voiceURI: settingsRef.current.browserVoiceURI || "",
        rate: settingsRef.current.voiceRate,
        pitch:
          gender === "male"
            ? Math.min(settingsRef.current.voicePitch, 1)
            : Math.max(settingsRef.current.voicePitch, 1),
        volume: settingsRef.current.voiceVolume,
      },
      disabledSkillIds: settingsRef.current.disabledSkillIds,
    }).catch(() => {
      // Ignore speech errors so chat still works.
    });
  };

  const sendText = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || loadingRef.current) return;

    setLoading(true);
    setError("");
    setMessage("");

    const runtime: ChatRuntimeSettings = {
      model: settingsRef.current.model,
      fallbackModel: settingsRef.current.fallbackModel,
      useFallback: settingsRef.current.useFallback,
      systemInstruction: withSkillInstructions(
        settingsRef.current.systemInstruction,
        settingsRef.current.disabledSkillIds
      ),
      temperature: settingsRef.current.temperature,
      maxOutputTokens: settingsRef.current.maxOutputTokens,
    };

    try {
      const reply = await sendMessage(text, toApiHistory(historyRef.current), runtime);
      const safeReply = reply || "No response";
      const now = Date.now();
      setHistory((prev) => [
        ...prev,
        { role: "user", parts: [{ text }], at: now },
        { role: "model", parts: [{ text: safeReply }], at: now + 1 },
      ]);
      speakText(safeReply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    void sendText(message);
  };

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition || loading) return;

    if (listening) {
      shouldListenRef.current = false;
      recognition.stop();
      setListening(false);
      return;
    }

    setError("");
    recognition.lang = settingsRef.current.voiceLanguage;
    recognition.continuous = Boolean(settingsRef.current.continuousListen);
    shouldListenRef.current = true;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Could not start microphone. Allow mic permission and try again.");
      shouldListenRef.current = false;
    }
  };

  if (!ready) {
    return (
      <div className="relative flex h-full min-h-0 overflow-hidden bg-[var(--ink)] text-[var(--foam)]">
        <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-4 lg:max-w-none">
          <p className="text-sm text-white/50">Loading chat…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[var(--ink)] text-[var(--foam)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-blob aurora-blob-a -left-16 top-10" />
        <div className="aurora-blob aurora-blob-b right-[-4rem] top-1/3" />
        <div className="aurora-blob aurora-blob-c bottom-[-3rem] left-1/3" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_0%,rgba(7,19,31,0.55)_55%,rgba(7,19,31,0.92)_100%)]" />
      </div>

      <div className="absolute inset-0 z-10 flex min-h-0 w-full flex-col px-4 py-4 sm:px-6 sm:py-6 md:px-8">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(13,33,51,0.72)] shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:rounded-[32px]">
          <div
            ref={messagesRef}
            className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-6 sm:px-8"
          >
            {history.length === 0 && !loading && (
              <div className="message-enter mx-auto mt-10 max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--teal)] to-[var(--coral)] text-2xl font-semibold text-[var(--ink)] shadow-lg shadow-teal-900/30">
                  AI
                </div>
                <p className="font-[family-name:var(--font-syne)] text-xl text-white/90">
                  Ready when you are
                </p>
                <p className="mt-2 text-sm text-white/45">
                  Tap the mic and speak, or type below.
                </p>
              </div>
            )}

            {history.map((item, index) => (
              <div
                key={`${item.role}-${index}-${item.at}`}
                className={`message-enter flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
              >
                <div className="max-w-[85%]">
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      item.role === "user"
                        ? "rounded-br-md bg-gradient-to-br from-[var(--teal)] to-[#168f7c] text-[var(--ink)]"
                        : "rounded-bl-md border border-white/10 bg-white/8 text-white/90"
                    }`}
                  >
                    {item.role === "model"
                      ? formatBotText(item.parts[0]?.text || "")
                      : item.parts[0]?.text}
                  </div>
                  {settings.showTimestamps ? (
                    <p
                      className={`mt-1 text-[10px] text-white/30 ${
                        item.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {formatTime(item.at)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-enter flex items-center gap-2 text-sm text-white/50">
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--teal-bright)]" />
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--teal-bright)] [animation-delay:0.15s]" />
                <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--teal-bright)] [animation-delay:0.3s]" />
                <span>Thinking with {settings.model}</span>
              </div>
            )}

            {error && (
              <p className="message-enter text-sm text-[var(--coral-soft)]">{error}</p>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 px-5 py-3 sm:px-8 sm:py-4">
            {listening && (
              <div className="mb-3 flex items-center gap-3 text-xs text-[var(--coral-soft)]">
                <div className="flex h-4 items-end gap-1">
                  <span className="wave-bar h-4" />
                  <span className="wave-bar h-4 [animation-delay:0.15s]" />
                  <span className="wave-bar h-4 [animation-delay:0.3s]" />
                  <span className="wave-bar h-4 [animation-delay:0.45s]" />
                </div>
                Listening… speak now
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 transition duration-300 focus-within:border-[var(--teal)]/50 focus-within:bg-white/8 sm:p-4">
              <textarea
                title="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (settings.enterToSend && e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={listening ? "Listening to your voice…" : "Type your message here..."}
                rows={2}
                className="w-full resize-none bg-transparent text-base leading-relaxed text-white placeholder:text-white/35 outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="text-xs text-white/35">
                    {voiceSupported ? `Voice · ${settings.voiceLanguage}` : "Voice not supported"}
                  </span>
                  <AppNav compact />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={!voiceSupported || loading}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border transition duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                      listening
                        ? "listening-pulse border-[var(--coral)] bg-[var(--coral)] text-[var(--ink)]"
                        : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                    title={listening ? "Stop listening" : "Talk with voice"}
                  >
                    {listening ? <IoMicOff size={20} /> : <IoMic size={20} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!message.trim() || loading}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--teal)] to-[var(--teal-bright)] text-[var(--ink)] shadow-lg shadow-teal-900/25 transition duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Send"
                  >
                    <IoRocketSharp size={20} />
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-white/30">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ButUi;
