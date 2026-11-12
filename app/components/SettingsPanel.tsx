"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "./AppNav";
import { MODEL_OPTIONS } from "../utils/modelNames";
import { VOICE_LANGUAGES, type AppSettings } from "../utils/settings";
import { useSettings } from "../hooks/useSettings";
import { listSkills } from "../utils/skills";
import {
  listBrowserVoiceOptions,
  pickBrowserVoice,
  waitForBrowserVoices,
} from "../utils/pickBrowserVoice.js";
import { speakIndianNeural } from "../utils/speakIndian.js";
import { resolveIndianVoice } from "../backend/indianTts.js";
import { getVoiceTypeById } from "../backend/voiceTypes.js";

type BrowserVoiceOption = {
  uri: string;
  name: string;
  lang: string;
  gender: string;
  indian: boolean;
  label: string;
};

type VoiceTypeItem = {
  id: string;
  label: string;
  description: string;
  gender: "male" | "female";
  kind: "default" | "beat";
  rate?: number;
  pitch?: number;
  volume?: number;
};

type VoiceCatalog = {
  genders: { id: string; label: string }[];
  voices: VoiceTypeItem[];
  grouped: {
    female: { default: VoiceTypeItem; beats: VoiceTypeItem[] };
    male: { default: VoiceTypeItem; beats: VoiceTypeItem[] };
  };
};

function toPercent(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || max <= min) return 0;
  return Math.round(((value - min) / (max - min)) * 100);
}

function safeVoiceValue(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function FieldLabel({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-white/90">{title}</p>
      {hint ? <p className="mt-0.5 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8"
    >
      <div>
        <p className="text-sm text-white/90">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-white/40">{hint}</p> : null}
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[var(--teal)]" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

const selectClass =
  "w-full rounded-2xl border border-white/10 bg-[var(--ink-soft)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--teal)]/50";

const cardClass =
  "min-w-0 rounded-[28px] border border-white/10 bg-[rgba(13,33,51,0.72)] p-5 backdrop-blur-xl sm:p-6";

export default function SettingsPanel() {
  const { settings, ready, updateSettings, resetSettings, setSettings } = useSettings();
  const [voiceCatalog, setVoiceCatalog] = useState<VoiceCatalog | null>(null);
  const [voiceLoadError, setVoiceLoadError] = useState("");
  const [browserVoices, setBrowserVoices] = useState<BrowserVoiceOption[]>([]);
  const [activeVoiceLabel, setActiveVoiceLabel] = useState("");
  const trainingSkills = useMemo(() => listSkills(), []);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [trainingMenuOpen, setTrainingMenuOpen] = useState(false);

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });
  };

  useEffect(() => {
    if (!selectedSkillId && trainingSkills[0]?.id) {
      setSelectedSkillId(trainingSkills[0].id);
    }
  }, [selectedSkillId, trainingSkills]);

  const selectedSkill = trainingSkills.find((skill) => skill.id === selectedSkillId);
  const selectedSkillDisabled = settings.disabledSkillIds.includes(selectedSkillId);
  const selectedTrainingData = useMemo(() => {
    if (!selectedSkill || typeof selectedSkill.getPromptRules !== "function") {
      return "No training data available for this module.";
    }
    return selectedSkill.getPromptRules() || "No training data available for this module.";
  }, [selectedSkill]);

  const toggleTrainingById = (skillId: string) => {
    if (!skillId) return;
    const disabled = new Set(settings.disabledSkillIds);
    if (disabled.has(skillId)) disabled.delete(skillId);
    else disabled.add(skillId);
    patch("disabledSkillIds", [...disabled]);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadVoices() {
      try {
        const res = await fetch("/api/voice-types");
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load voices");
        }
        if (!cancelled) {
          setVoiceCatalog(json.data as VoiceCatalog);
          setVoiceLoadError("");
        }
      } catch (err) {
        if (!cancelled) {
          setVoiceLoadError(err instanceof Error ? err.message : "Failed to load voices");
        }
      }
    }

    void loadVoices();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load real OS/browser voices and auto-lock a matching gender + Indian voice
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function syncBrowserVoices() {
      const voices = await waitForBrowserVoices();
      if (cancelled) return;

      const gender = settings.voiceGender === "male" ? "male" : "female";
      const options = listBrowserVoiceOptions(voices, gender) as BrowserVoiceOption[];
      setBrowserVoices(options);

      const profile = getVoiceTypeById(settings.voiceTypeId);
      const preferred = pickBrowserVoice(voices, {
        gender,
        lang: settings.voiceLanguage,
        preferIndian: true,
        nameHints: profile.nameHints || [],
        voiceURI: settings.browserVoiceURI || "",
      });

      const preferredURI = preferred?.voiceURI || preferred?.name || "";
      const currentStillValid = options.some(
        (opt) => opt.uri === settings.browserVoiceURI
      );

      if (preferredURI && (!settings.browserVoiceURI || !currentStillValid)) {
        updateSettings({ browserVoiceURI: preferredURI });
        setActiveVoiceLabel(
          preferred
            ? `${preferred.name} (${preferred.lang})`
            : ""
        );
      } else if (preferred) {
        setActiveVoiceLabel(`${preferred.name} (${preferred.lang})`);
      }
    }

    void syncBrowserVoices();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.voiceGender, settings.voiceLanguage, settings.voiceTypeId]);

  const genderVoices = useMemo(() => {
    if (!voiceCatalog) return [];
    const group = voiceCatalog.grouped[settings.voiceGender];
    if (!group) return [];
    return [group.default, ...group.beats];
  }, [voiceCatalog, settings.voiceGender]);

  if (!ready) {
    return (
      <div className="relative flex h-full min-h-0 overflow-hidden bg-[var(--ink)] text-[var(--foam)]">
        <div className="flex h-full w-full items-center justify-center px-4">
          <p className="text-sm text-white/50">Loading settings…</p>
        </div>
      </div>
    );
  }

  const selectedModel = MODEL_OPTIONS.find((model) => model.id === settings.model);

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-[var(--ink)] text-[var(--foam)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-blob aurora-blob-a -left-16 top-10" />
        <div className="aurora-blob aurora-blob-b right-[-4rem] top-1/3" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_0%,rgba(7,19,31,0.55)_55%,rgba(7,19,31,0.92)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-4 py-4 sm:max-w-none sm:px-6 sm:py-6 md:px-8">
        <div className="mb-3 flex shrink-0 justify-end sm:mb-4">
          <AppNav compact />
        </div>
        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4">
          <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-3">
            <section className={cardClass}>
              <FieldLabel
                title="Primary model"
                hint="This model is used first for every reply."
              />
              <select
                value={settings.model}
                onChange={(e) => patch("model", e.target.value)}
                className={selectClass}
              >
                {MODEL_OPTIONS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
              {selectedModel ? (
                <p className="mt-2 text-xs text-white/40">
                  {selectedModel.description} ·{" "}
                  <span className="text-white/55">{selectedModel.id}</span>
                </p>
              ) : null}

              <div className="mt-5">
                <FieldLabel
                  title="Fallback model"
                  hint="Used automatically if the primary model is busy or fails."
                />
                <select
                  value={settings.fallbackModel}
                  onChange={(e) => patch("fallbackModel", e.target.value)}
                  className={selectClass}
                >
                  {MODEL_OPTIONS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <Toggle
                  checked={settings.useFallback}
                  onChange={(value) => patch("useFallback", value)}
                  label="Use fallback model"
                  hint="Retry with the fallback when Gemini returns high demand or network errors."
                />
              </div>
            </section>

            <section className={cardClass}>
              <FieldLabel
                title={`Temperature · ${toPercent(settings.temperature, 0, 2)}%`}
                hint={`Lower is more focused. Higher is more creative. (${settings.temperature.toFixed(1)})`}
              />
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={settings.temperature}
                onChange={(e) => patch("temperature", Number(e.target.value))}
                className="w-full accent-[var(--teal)]"
              />

              <div className="mt-6">
                <FieldLabel
                  title={`Max output tokens · ${toPercent(settings.maxOutputTokens, 64, 4096)}%`}
                  hint={`Higher allows longer answers. (${settings.maxOutputTokens} tokens)`}
                />
                <input
                  type="range"
                  min={64}
                  max={4096}
                  step={64}
                  value={settings.maxOutputTokens}
                  onChange={(e) => patch("maxOutputTokens", Number(e.target.value))}
                  className="w-full accent-[var(--teal)]"
                />
              </div>
            </section>

            <section className={cardClass}>
              <FieldLabel
                title="Training modules"
                hint="Open dropdown and disable a training from inside the list."
              />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTrainingMenuOpen((open) => !open)}
                  className={`${selectClass} flex items-center justify-between text-left`}
                >
                  <span className="truncate">
                    {selectedSkill
                      ? `${selectedSkill.name || selectedSkill.id}${
                          selectedSkillDisabled ? " · Disabled" : " · Active"
                        }`
                      : "Select training"}
                  </span>
                  <span className="ml-3 text-white/40">{trainingMenuOpen ? "▲" : "▼"}</span>
                </button>

                {trainingMenuOpen ? (
                  <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[var(--ink-soft)] shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                    {trainingSkills.map((skill) => {
                      const isOff = settings.disabledSkillIds.includes(skill.id);
                      const isSelected = selectedSkillId === skill.id;
                      return (
                        <div
                          key={skill.id}
                          className={`flex items-center gap-2 border-b border-white/5 px-3 py-2 last:border-b-0 ${
                            isSelected ? "bg-white/8" : "hover:bg-white/5"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSkillId(skill.id);
                              setTrainingMenuOpen(false);
                            }}
                            className="min-w-0 flex-1 truncate text-left text-sm text-white/85"
                          >
                            {skill.name || skill.id}
                            <span className="ml-2 text-xs text-white/35">
                              {isOff ? "Disabled" : "Active"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleTrainingById(skill.id)}
                            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                              isOff
                                ? "bg-gradient-to-r from-[var(--teal)] to-[var(--teal-bright)] text-[var(--ink)]"
                                : "border border-[var(--coral)]/40 bg-[var(--coral)]/15 text-[var(--coral-soft)]"
                            }`}
                          >
                            {isOff ? "Enable" : "Disable"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <p className="mt-3 text-xs text-white/35">
                {settings.disabledSkillIds.length > 0
                  ? `Disabled: ${settings.disabledSkillIds
                      .map(
                        (id) =>
                          trainingSkills.find((skill) => skill.id === id)?.name || id
                      )
                      .join(", ")}`
                  : "All trainings are active."}
              </p>

              <div className="mt-4">
                <FieldLabel
                  title="Training data"
                  hint="Instructions used by the selected training module."
                />
                <pre className="scrollbar-hide max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[var(--ink)]/70 px-4 py-3 text-xs leading-relaxed text-white/75">
                  {selectedTrainingData}
                </pre>
              </div>
            </section>

            <section className={`${cardClass} col-span-1 space-y-5 lg:col-span-3`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-[family-name:var(--font-syne)] text-xl text-white/95">
                    Voice Studio
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Control how Subham listens and speaks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      if (typeof window === "undefined") return;

                      const hindiPreview =
                        "Namaste, main Subham hoon. Yeh meri current voice ka preview hai. " +
                        "Main aapse natural Hindi aur English dono mein baat kar sakta hoon. " +
                        "Aap rate, pitch aur volume change karke check kar sakte ho ki awaaz kaisi lag rahi hai. " +
                        "Agar yeh voice theek lage, to isi setting ko save karke chat mein use kar sakte ho.";
                      const englishPreview =
                        "Hello, I am Subham. This is a longer preview of my current speaking voice. " +
                        "I can talk with you in a clear and natural Indian accent, just like a normal conversation. " +
                        "You can adjust my speech rate, pitch, and volume to make the voice feel right for you. " +
                        "If this voice sounds good, keep these settings and continue chatting with me anytime.";

                      const gender =
                        settings.voiceGender === "male" ? "male" : "female";
                      const lang = settings.voiceLanguage.startsWith("hi")
                        ? "hi-IN"
                        : "en-IN";
                      const previewText = lang.startsWith("hi")
                        ? hindiPreview
                        : englishPreview;
                      const neural = resolveIndianVoice({ gender, lang });
                      setActiveVoiceLabel(
                        `${neural.voice} · clear Indian accent`
                      );

                      await speakIndianNeural(previewText, {
                        gender,
                        lang,
                        rate: settings.voiceRate,
                        pitch: settings.voicePitch,
                        volume: settings.voiceVolume,
                      });
                    })();
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[var(--teal)] to-[var(--teal-bright)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:scale-[1.02]"
                >
                  Preview voice
                </button>
              </div>

              {activeVoiceLabel ? (
                <p className="text-xs text-white/45">
                  Active voice: <span className="text-white/80">{activeVoiceLabel}</span>
                </p>
              ) : (
                <p className="text-xs text-white/45">
                  Uses clear Indian neural voices: female Neerja / male Prabhat (English),
                  Swara / Madhur (Hindi).
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel title="Listen language" hint="Speech recognition language." />
                  <select
                    value={settings.voiceLanguage}
                    onChange={(e) => patch("voiceLanguage", e.target.value)}
                    className={selectClass}
                  >
                    {VOICE_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel title="Voice gender" hint="Male or female voice family." />
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[var(--ink-soft)] p-1.5">
                    {(["female", "male"] as const).map((gender) => {
                      const active = settings.voiceGender === gender;
                      return (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => {
                            const nextDefault =
                              voiceCatalog?.grouped[gender]?.default ||
                              (voiceCatalog?.voices || []).find(
                                (voice) => voice.gender === gender && voice.kind === "default"
                              );
                            const nextId =
                              nextDefault?.id ||
                              (gender === "male" ? "male-default" : "female-default");
                            updateSettings({
                              voiceGender: gender,
                              voiceTypeId: nextId,
                              browserVoiceURI: "",
                              voiceRate: nextDefault?.rate ?? settings.voiceRate,
                              voicePitch: nextDefault?.pitch ?? settings.voicePitch,
                              voiceVolume: nextDefault?.volume ?? settings.voiceVolume,
                            });
                          }}
                          className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                            active
                              ? "bg-gradient-to-r from-[var(--teal)] to-[var(--teal-bright)] text-[var(--ink)] shadow-md shadow-teal-900/20"
                              : "text-white/55 hover:bg-white/5 hover:text-white/80"
                          }`}
                        >
                          {gender === "female" ? "Female" : "Male"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel
                  title="Fallback system voice"
                  hint="Only used if Indian neural TTS is offline. Main voice is always Indian neural."
                />
                <select
                  value={settings.browserVoiceURI}
                  onChange={(e) => {
                    const uri = e.target.value;
                    const selected = browserVoices.find((v) => v.uri === uri);
                    patch("browserVoiceURI", uri);
                    if (selected) {
                      setActiveVoiceLabel(`${selected.name} (${selected.lang}) · fallback`);
                    }
                  }}
                  className={selectClass}
                >
                  <option value="">Auto fallback</option>
                  {browserVoices.map((voice) => (
                    <option key={voice.uri} value={voice.uri}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel
                  title="Voice type / beat"
                  hint="Pick default or beat voice from backend voiceTypes."
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {genderVoices.map((voice) => {
                    const active = settings.voiceTypeId === voice.id;
                    return (
                      <button
                        key={voice.id}
                        type="button"
                        onClick={() => {
                          const full =
                            (voiceCatalog?.voices || []).find((v) => v.id === voice.id) || voice;
                          updateSettings({
                            voiceTypeId: voice.id,
                            voiceRate: full.rate ?? settings.voiceRate,
                            voicePitch: full.pitch ?? settings.voicePitch,
                            voiceVolume: full.volume ?? settings.voiceVolume,
                          });
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-[var(--teal)]/50 bg-[var(--teal)]/15 shadow-[0_0_0_1px_rgba(31,184,160,0.25)]"
                            : "border-white/10 bg-white/5 hover:bg-white/8"
                        }`}
                      >
                        <p className="text-sm text-white/90">
                          {voice.label}
                          {voice.kind === "beat" ? (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--coral-soft)]">
                              Beat
                            </span>
                          ) : (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--teal-bright)]">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-white/40">{voice.description}</p>
                      </button>
                    );
                  })}
                </div>
                {voiceLoadError ? (
                  <p className="mt-2 text-xs text-[var(--coral-soft)]">{voiceLoadError}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <FieldLabel
                    title={`Speech rate · ${toPercent(safeVoiceValue(settings.voiceRate, 1), 0.5, 2)}%`}
                    hint={`How fast the bot speaks. (${safeVoiceValue(settings.voiceRate, 1).toFixed(2)})`}
                  />
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={safeVoiceValue(settings.voiceRate, 1)}
                    onChange={(e) => patch("voiceRate", Number(e.target.value))}
                    className="w-full accent-[var(--teal)]"
                  />
                </div>
                <div>
                  <FieldLabel
                    title={`Pitch · ${toPercent(safeVoiceValue(settings.voicePitch, 1), 0, 2)}%`}
                    hint={`Higher sounds brighter. (${safeVoiceValue(settings.voicePitch, 1).toFixed(2)})`}
                  />
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={safeVoiceValue(settings.voicePitch, 1)}
                    onChange={(e) => patch("voicePitch", Number(e.target.value))}
                    className="w-full accent-[var(--teal)]"
                  />
                </div>
                <div>
                  <FieldLabel
                    title={`Volume · ${toPercent(safeVoiceValue(settings.voiceVolume, 1), 0, 1)}%`}
                    hint={`Speech output loudness. (${Math.round(safeVoiceValue(settings.voiceVolume, 1) * 100)}%)`}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={safeVoiceValue(settings.voiceVolume, 1)}
                    onChange={(e) => patch("voiceVolume", Number(e.target.value))}
                    className="w-full accent-[var(--teal)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Toggle
                  checked={settings.speakReplies}
                  onChange={(value) => patch("speakReplies", value)}
                  label="Speak replies"
                  hint="Read bot answers aloud."
                />
                <Toggle
                  checked={settings.autoSendVoice}
                  onChange={(value) => patch("autoSendVoice", value)}
                  label="Auto-send voice"
                  hint="Send after you finish speaking."
                />
                <Toggle
                  checked={settings.continuousListen}
                  onChange={(value) => patch("continuousListen", value)}
                  label="Continuous listen"
                  hint="Keep mic session more continuous."
                />
              </div>
            </section>

            <section className={`${cardClass} col-span-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-3`}>
              <Toggle
                checked={settings.enterToSend}
                onChange={(value) => patch("enterToSend", value)}
                label="Enter to send"
                hint="Press Enter to send. Shift+Enter still adds a new line."
              />
              <Toggle
                checked={settings.showTimestamps}
                onChange={(value) => patch("showTimestamps", value)}
                label="Show message timestamps"
                hint="Display time under each chat bubble."
              />
            </section>

            <div className="col-span-1 flex flex-wrap gap-3 lg:col-span-3">
              <button
                type="button"
                onClick={resetSettings}
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
              >
                Reset to defaults
              </button>
              <button
                type="button"
                onClick={() => setSettings(settings)}
                className="rounded-2xl bg-gradient-to-r from-[var(--teal)] to-[var(--teal-bright)] px-5 py-3 text-sm font-medium text-[var(--ink)] transition hover:scale-[1.02]"
              >
                Settings saved automatically
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
