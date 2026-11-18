import { useSyncExternalStore } from "react";

/**
 * Rachas de FlowCapy — lógica base (scaffold, prompts 5–8).
 * Se conecta a la UI en los ciclos de construcción (prompts 9–38).
 * Una racha es un día seguido completando al menos una tarea.
 * Las fechas se guardan como claves locales YYYY-MM-DD en localStorage.
 */

export const STREAK_STORAGE_KEY = "flowcapy.streak.days.v1";

/** Días (YYYY-MM-DD) con al menos una tarea completada. */
export type CompletedDaySet = Set<string>;

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadCompletedDays(): CompletedDaySet {
  if (!isStorageAvailable()) return new Set();
  try {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

export function saveCompletedDays(days: CompletedDaySet): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify([...days]));
  } catch {
    // Almacenamiento lleno o bloqueado: se ignora.
  }
}

/** Días consecutivos hasta `today` (incluido hoy si está en el set). */
export function currentStreak(days: CompletedDaySet, today: Date = new Date()): number {
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Si hoy aún no hay tarea completada, la racha se cuenta desde ayer.
  const todayKey = toKey(cursor);
  if (!days.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  while (days.has(toKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Días completados como store externo sincronizado con localStorage.
 * Mismo patrón que useTasks: evita el anti-patrón de setState dentro de un
 * efecto y el mismatch de hidratación, porque en el servidor se usa el
 * snapshot vacío y en el cliente se re-renderiza con el set real tras hidratar.
 */
let cachedDays: CompletedDaySet | null = null;
const dayListeners = new Set<() => void>();

function getDaysSnapshot(): CompletedDaySet {
  if (cachedDays === null) {
    cachedDays = loadCompletedDays();
  }
  return cachedDays;
}

// React exige que el snapshot del servidor sea una referencia estable
// (si no, avisa de posible bucle infinito). Nunca se muta: registerToday
// siempre crea un set nuevo.
const EMPTY_DAYS: CompletedDaySet = new Set();

function getDaysServerSnapshot(): CompletedDaySet {
  return EMPTY_DAYS;
}

function subscribeToDays(listener: () => void): () => void {
  dayListeners.add(listener);
  return () => {
    dayListeners.delete(listener);
  };
}

function emitDaysChange(): void {
  for (const listener of dayListeners) listener();
}

/**
 * Registra el día de hoy como día con al menos una tarea completada.
 * Decisión documentada: el día cuenta cuando se completó al menos una tarea
 * ese día; descompletar o borrar tareas después NO borra el día ya registrado.
 */
export function registerToday(days: CompletedDaySet = getDaysSnapshot()): void {
  const todayKey = toKey(new Date());
  if (days.has(todayKey)) return;
  const next = new Set(days);
  next.add(todayKey);
  cachedDays = next;
  saveCompletedDays(next);
  emitDaysChange();
}

/** Hook de rachas: lee los días guardados y se actualiza con cada registro. */
export function useCompletedDays(): { days: CompletedDaySet } {
  const days = useSyncExternalStore(
    subscribeToDays,
    getDaysSnapshot,
    getDaysServerSnapshot,
  );
  return { days };
}
