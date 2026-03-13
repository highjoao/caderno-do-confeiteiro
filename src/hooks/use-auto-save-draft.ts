import { useEffect, useRef, useState, useCallback } from "react";

export type DraftStatus = "idle" | "saving" | "saved" | "unsaved";

interface UseAutoSaveDraftOptions<T> {
  key: string;
  data: T;
  enabled: boolean;
  intervalMs?: number;
  debounceMs?: number;
}

export function useAutoSaveDraft<T>({ key, data, enabled, intervalMs = 20000, debounceMs = 2000 }: UseAutoSaveDraftOptions<T>) {
  const [status, setStatus] = useState<DraftStatus>("idle");
  const lastSavedRef = useRef<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const storageKey = `draft_${key}`;

  const saveDraft = useCallback(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current) {
      return; // no changes
    }
    setStatus("saving");
    try {
      localStorage.setItem(storageKey, serialized);
      localStorage.setItem(`${storageKey}_ts`, String(Date.now()));
      lastSavedRef.current = serialized;
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 3000);
    } catch {
      setStatus("unsaved");
    }
  }, [enabled, data, storageKey]);

  // Mark unsaved when data changes
  useEffect(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(data);
    if (serialized !== lastSavedRef.current && lastSavedRef.current !== "") {
      setStatus("unsaved");
    }
    // Debounced save
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(saveDraft, debounceMs);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [data, enabled, debounceMs, saveDraft]);

  // Periodic save
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(saveDraft, intervalMs);
    return () => clearInterval(interval);
  }, [enabled, intervalMs, saveDraft]);

  // Set editing flag
  useEffect(() => {
    if (enabled) {
      (window as any).__editingInProgress = true;
    }
    return () => {
      (window as any).__editingInProgress = false;
    };
  }, [enabled]);

  // beforeunload warning
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);

  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [storageKey]);

  const hasDraft = useCallback((): boolean => {
    return localStorage.getItem(storageKey) !== null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_ts`);
    lastSavedRef.current = "";
    setStatus("idle");
  }, [storageKey]);

  return { status, saveDraft, loadDraft, hasDraft, clearDraft };
}
