"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultSettings,
  loadSettings,
  normalizeSettings,
  saveSettings,
  type AppSettings,
} from "../utils/settings";

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettingsState(loadSettings());
    setReady(true);
  }, []);

  const setSettings = useCallback((next: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      const normalized = normalizeSettings(value);
      saveSettings(normalized);
      return normalized;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, [setSettings]);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, [setSettings]);

  return { settings, ready, setSettings, updateSettings, resetSettings };
}
