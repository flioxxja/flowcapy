/**
 * Pomodoro de FlowCapy — motor, persistencia atómica y store de React.
 * No usa backend, cuentas ni claves externas.
 */

import { useCallback, useSyncExternalStore } from "react";

import {
  createPomodoroState,
  durationForPhase,
  localDateKey,
  type PomodoroSession,
  type PomodoroState,
  type PomodoroTimerState,
} from "@/lib/pomodoro-engine";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
  type StorageFailure,
} from "@/lib/storage";

export {
  advancePomodoro,
  createPomodoroState,
  durationForPhase,
  localDateKey,
  pausePomodoro,
  remainingPomodoroSeconds,
  resetPomodoro,
  startPomodoro,
  type PomodoroDurations,
  type PomodoroPhase,
  type PomodoroSession,
  type PomodoroState,
  type PomodoroStatus,
  type PomodoroTimerState,
} from "@/lib/pomodoro-engine";

export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;
export const POMODORO_STORAGE_KEY = "flowcapy.pomodoro.v2";
export const LEGACY_POMODORO_STORAGE_KEY = "flowcapy.pomodoro.v1";

export function focusSeconds(): number {
  return FOCUS_MINUTES * 60;
}

export function breakSeconds(): number {
  return BREAK_MINUTES * 60;
}

/** Formatea una cantidad de segundos como mm:ss. */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Sesiones de enfoque completadas hoy. */
export function sessionsToday(
  sessions: PomodoroSession[],
  date: Date = new Date(),
): number {
  const today = localDateKey(date);
  return sessions.filter((session) => session.date === today).length;
}

export interface PomodoroStoreSnapshot {
  state: PomodoroState;
  storageWarning: string | null;
}

const DEFAULT_STATE = createPomodoroState();
const SERVER_SNAPSHOT: PomodoroStoreSnapshot = {
  state: DEFAULT_STATE,
  storageWarning: null,
};

const READ_WARNING =
  "No se pudo leer el progreso del Pomodoro. Se quedó usando solo en esta pestaña.";
const WRITE_WARNING =
  "No se pudo guardar el progreso del Pomodoro. Se quedará solo en esta pestaña.";
const QUOTA_WARNING =
  "El almacenamiento del Pomodoro está lleno. Se quedó usando solo en esta pestaña.";
const CORRUPT_WARNING =
  "El progreso guardado del Pomodoro estaba dañado. Se reinició de forma segura.";
const MIGRATED_WARNING =
  "No se pudo migrar el progreso anterior del Pomodoro. Se quedará solo en esta pestaña.";
const MIGRATED_CLEANUP_WARNING =
  "El progreso del Pomodoro se migró, pero no se pudo limpiar el almacenamiento anterior.";

function storageWarning(failure: StorageFailure, action: "read" | "write"): string {
  if (failure === "unavailable") {
    return "El almacenamiento local no está disponible. El Pomodoro funciona solo en esta pestaña.";
  }
  if (failure === "read") return READ_WARNING;
  if (failure === "quota") return QUOTA_WARNING;
  if (failure === "write") return WRITE_WARNING;
  return action === "read" ? READ_WARNING : WRITE_WARNING;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidCompletedAt(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isValidSession(value: unknown): value is PomodoroSession {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isValidDateKey(value.date) &&
    isValidCompletedAt(value.completedAt)
  );
}

function isValidTimer(value: unknown): value is PomodoroTimerState {
  if (!isRecord(value)) return false;
  if (value.phase !== "focus" && value.phase !== "break") return false;
  if (value.status !== "idle" && value.status !== "running" && value.status !== "paused") {
    return false;
  }
  if (typeof value.remainingSeconds !== "number") return false;
  if (!Number.isInteger(value.remainingSeconds) || value.remainingSeconds < 0) {
    return false;
  }
  if (typeof value.cycleId !== "number") return false;
  if (!Number.isInteger(value.cycleId) || value.cycleId < 1) return false;

  const maximum = durationForPhase(value.phase);
  if (value.remainingSeconds > maximum) return false;

  if (value.status === "running") {
    return typeof value.deadline === "number" && Number.isFinite(value.deadline) && value.deadline > 0;
  }
  return value.deadline === null;
}

function isValidSnapshot(value: unknown): value is PomodoroState {
  if (!isRecord(value) || value.version !== 2 || !Array.isArray(value.sessions)) {
    return false;
  }
  if (!value.sessions.every(isValidSession)) return false;
  if (new Set(value.sessions.map((session) => session.id)).size !== value.sessions.length) {
    return false;
  }
  return isValidTimer(value.timer);
}

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

/** Migra el array legacy y asigna IDs que no colisionan con focus-N. */
function migrateLegacySessions(value: unknown): PomodoroSession[] | null {
  if (!Array.isArray(value)) return null;
  const sessions: PomodoroSession[] = [];
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    if (!isValidDateKey(item.date) || !isValidCompletedAt(item.completedAt)) return;
    sessions.push({
      id: `legacy-${index + 1}`,
      date: item.date,
      completedAt: item.completedAt,
    });
  });
  return sessions;
}

function buildSnapshot(
  state: PomodoroState,
  storageWarning: string | null = null,
): PomodoroStoreSnapshot {
  return { state, storageWarning };
}

function loadLegacyState(): {
  state: PomodoroState;
  storageWarning: string | null;
} {
  const legacyRead = readLocalStorage(LEGACY_POMODORO_STORAGE_KEY);
  if (legacyRead.failure) {
    return {
      state: DEFAULT_STATE,
      storageWarning: storageWarning(legacyRead.failure, "read"),
    };
  }
  if (legacyRead.value === null) {
    return { state: DEFAULT_STATE, storageWarning: null };
  }

  const parsed = parseJson(legacyRead.value);
  if (!parsed.ok) {
    return { state: DEFAULT_STATE, storageWarning: CORRUPT_WARNING };
  }

  const sessions = migrateLegacySessions(parsed.value);
  if (!sessions) {
    return { state: DEFAULT_STATE, storageWarning: CORRUPT_WARNING };
  }

  const migratedState: PomodoroState = {
    ...DEFAULT_STATE,
    sessions,
  };
  const writeResult = writeLocalStorage(
    POMODORO_STORAGE_KEY,
    JSON.stringify(migratedState),
  );

  if (!writeResult.ok) {
    return {
      state: migratedState,
      storageWarning:
        writeResult.failure === "quota"
          ? QUOTA_WARNING
          : MIGRATED_WARNING,
    };
  }

  const cleanupResult = removeLocalStorage(LEGACY_POMODORO_STORAGE_KEY);
  return {
    state: migratedState,
    storageWarning: cleanupResult.ok ? null : MIGRATED_CLEANUP_WARNING,
  };
}

function loadPersistedSnapshot(): PomodoroStoreSnapshot {
  const currentRead = readLocalStorage(POMODORO_STORAGE_KEY);
  if (currentRead.failure) {
    return {
      state: DEFAULT_STATE,
      storageWarning: storageWarning(currentRead.failure, "read"),
    };
  }

  if (currentRead.value !== null) {
    const parsed = parseJson(currentRead.value);
    if (parsed.ok && isValidSnapshot(parsed.value)) {
      return buildSnapshot(parsed.value);
    }
    return {
      state: DEFAULT_STATE,
      storageWarning: CORRUPT_WARNING,
    };
  }

  const legacy = loadLegacyState();
  return buildSnapshot(legacy.state, legacy.storageWarning);
}

let cachedSnapshot: PomodoroStoreSnapshot | null = null;
const storeListeners = new Set<() => void>();

function getSnapshot(): PomodoroStoreSnapshot {
  if (cachedSnapshot === null) {
    cachedSnapshot = loadPersistedSnapshot();
  }
  return cachedSnapshot;
}

function getServerSnapshot(): PomodoroStoreSnapshot {
  return SERVER_SNAPSHOT;
}

function emitStoreChange(): void {
  for (const listener of storeListeners) listener();
}

function handleStorageChange(event: StorageEvent): void {
  if (
    event.key !== POMODORO_STORAGE_KEY &&
    event.key !== LEGACY_POMODORO_STORAGE_KEY
  ) {
    return;
  }
  cachedSnapshot = null;
  emitStoreChange();
}

function subscribeToStore(listener: () => void): () => void {
  storeListeners.add(listener);
  window.addEventListener("storage", handleStorageChange);
  return () => {
    storeListeners.delete(listener);
    window.removeEventListener("storage", handleStorageChange);
  };
}

/**
 * Aplica una transición al snapshot completo y lo persiste con un único
 * `setItem`. El estado en memoria se actualiza aunque localStorage falle.
 */
export function updatePomodoroState(
  updater: (previous: PomodoroState) => PomodoroState,
): void {
  const previous = getSnapshot();
  const nextState = updater(previous.state);
  if (nextState === previous.state) return;

  const writeResult = writeLocalStorage(
    POMODORO_STORAGE_KEY,
    JSON.stringify(nextState),
  );
  cachedSnapshot = buildSnapshot(
    nextState,
    writeResult.ok
      ? null
      : storageWarning(writeResult.failure ?? "write", "write"),
  );
  emitStoreChange();
}

/** Store completo del Pomodoro: sesiones y temporizador comparten snapshot. */
export function usePomodoroStore(): {
  state: PomodoroState;
  storageWarning: string | null;
  updateState: (updater: (previous: PomodoroState) => PomodoroState) => void;
} {
  const snapshot = useSyncExternalStore(
    subscribeToStore,
    getSnapshot,
    getServerSnapshot,
  );
  const updateState = useCallback(
    (updater: (previous: PomodoroState) => PomodoroState) => {
      updatePomodoroState(updater);
    },
    [],
  );
  return {
    state: snapshot.state,
    storageWarning: snapshot.storageWarning,
    updateState,
  };
}
