/**
 * Pomodoro de FlowCapy — lógica base (scaffold, prompts 5–8).
 * Se conecta a la UI en los ciclos de construcción (prompts 9–38).
 * Persistencia: localStorage, sin backend ni cuentas.
 */

export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;

export type PomodoroPhase = "focus" | "break" | "idle";

export interface PomodoroSession {
  /** Fecha local YYYY-MM-DD en la que se completó la sesión de enfoque. */
  date: string;
  completedAt: string; // ISO
}

export const POMODORO_STORAGE_KEY = "flowcapy.pomodoro.v1";

/** Fecha local en formato YYYY-MM-DD (sin depender de la zona UTC). */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function focusSeconds(): number {
  return FOCUS_MINUTES * 60;
}

export function breakSeconds(): number {
  return BREAK_MINUTES * 60;
}

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Sesiones de enfoque completadas; [] si no hay nada o el dato está corrupto. */
export function loadSessions(): PomodoroSession[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PomodoroSession =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as PomodoroSession).date === "string",
    );
  } catch {
    return [];
  }
}

export function saveSessions(sessions: PomodoroSession[]): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Almacenamiento lleno o bloqueado: se ignora.
  }
}

/** Sesiones de enfoque completadas hoy. */
export function sessionsToday(
  sessions: PomodoroSession[],
  date: Date = new Date(),
): number {
  const today = localDateKey(date);
  return sessions.filter((session) => session.date === today).length;
}
