/**
 * Tareas de FlowCapy — lógica base (scaffold, prompts 5–8).
 * Se conecta a la UI en los ciclos de construcción (prompts 9–38).
 * Persistencia: localStorage, sin backend ni cuentas.
 */

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
