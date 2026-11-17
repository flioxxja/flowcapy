/**
 * Tareas de FlowCapy — lógica base (scaffold, prompts 5–8).
 * Se conecta a la UI en los ciclos de construcción (prompts 9–38).
 * Persistencia: localStorage, sin backend ni cuentas.
 */

import { useSyncExternalStore } from "react";

export type Urgency = "alta" | "media" | "baja";
export type Importance = "alta" | "media" | "baja";

export interface Task {
  id: string;
  title: string;
  urgency: Urgency;
  importance: Importance;
  completed: boolean;
  createdAt: string; // ISO
  completedAt?: string; // ISO, solo si completed
}

export const TASKS_STORAGE_KEY = "flowcapy.tasks.v1";

/** Peso para ordenar el día: urgencia + importancia (Eisenhower). */
const WEIGHT: Record<Urgency | Importance, number> = {
  alta: 3,
  media: 2,
  baja: 1,
};

/** Puntuación de prioridad: 2 (baja/baja) a 6 (alta/alta). */
export function priorityScore(task: Task): number {
  return WEIGHT[task.urgency] + WEIGHT[task.importance];
}

/**
 * Insignia de prioridad derivada de la puntuación Eisenhower (2–6).
 * Mapeo: 6 → P1 (Alta), 5 → P2 (Alta), 4 → P3 (Media), 3–2 → P4 (Baja).
 * El orden dentro del mismo nivel lo decide priorityScore en sortByPriority.
 */
export interface PriorityBadge {
  level: 1 | 2 | 3 | 4;
  label: string; // "P1".."P4"
  text: string; // "Alta" | "Media" | "Baja"
}

export function priorityBadge(task: Task): PriorityBadge {
  const score = priorityScore(task);
  if (score >= 6) return { level: 1, label: "P1", text: "Alta" };
  if (score === 5) return { level: 2, label: "P2", text: "Alta" };
  if (score === 4) return { level: 3, label: "P3", text: "Media" };
  return { level: 4, label: "P4", text: "Baja" };
}

/** Orden del día: primero sin completar, por prioridad desc, luego por creación. */
export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const byScore = priorityScore(b) - priorityScore(a);
    if (byScore !== 0) return byScore;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Lee las tareas guardadas; [] si no hay nada o el dato está corrupto. */
export function loadTasks(): Task[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Task =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Task).id === "string" &&
        typeof (item as Task).title === "string",
    );
  } catch {
    return [];
  }
}

/** Guarda las tareas; no hace nada fuera del navegador. */
export function saveTasks(tasks: Task[]): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Almacenamiento lleno o bloqueado: se ignora, la app sigue funcionando en memoria.
  }
}

export function createTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Tareas como store externo sincronizado con localStorage.
 * React 19 recomienda `useSyncExternalStore` para datos externos como
 * localStorage: evita el anti-patrón de setState dentro de un efecto
 * (regla react-hooks/set-state-in-effect) y el mismatch de hidratación,
 * porque en el servidor se usa el snapshot vacío y en el cliente se
 * re-renderiza con el snapshot real tras hidratar.
 */
let cachedTasks: Task[] | null = null;
const taskListeners = new Set<() => void>();

function getTasksSnapshot(): Task[] {
  if (cachedTasks === null) {
    cachedTasks = loadTasks();
  }
  return cachedTasks;
}

// React exige que el snapshot del servidor sea una referencia estable
// (si no, avisa de posible bucle infinito). Nunca se muta: updateTasks
// siempre crea un array nuevo.
const EMPTY_TASKS: Task[] = [];

function getTasksServerSnapshot(): Task[] {
  return EMPTY_TASKS;
}

function subscribeToTasks(listener: () => void): () => void {
  taskListeners.add(listener);
  return () => {
    taskListeners.delete(listener);
  };
}

function emitTasksChange(): void {
  for (const listener of taskListeners) listener();
}

/** Hook de tareas: lee de localStorage y persiste cada cambio. */
export function useTasks(): {
  tasks: Task[];
  updateTasks: (updater: (prev: Task[]) => Task[]) => void;
} {
  const tasks = useSyncExternalStore(
    subscribeToTasks,
    getTasksSnapshot,
    getTasksServerSnapshot,
  );
  const updateTasks = (updater: (prev: Task[]) => Task[]) => {
    const next = updater(getTasksSnapshot());
    cachedTasks = next;
    saveTasks(next);
    emitTasksChange();
  };
  return { tasks, updateTasks };
}
