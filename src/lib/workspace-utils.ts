import { localDateKey } from "@/lib/pomodoro-engine";
import { priorityBadge, type Task } from "@/lib/tasks";
import type { CompletedDaySet } from "@/lib/streaks";

export interface HeatmapDay {
  key: string;
  label: string;
  active: boolean;
  isToday: boolean;
}

/** Construye los últimos `count` días (por defecto 28) para el mapa de calor de consistencia. */
export function buildHeatmapDays(
  days: CompletedDaySet,
  today: Date = new Date(),
  count = 28,
): HeatmapDay[] {
  const result: HeatmapDay[] = [];
  const todayKey = localDateKey(today);
  const formatter = new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  for (let offset = count - 1; offset >= 0; offset--) {
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = localDateKey(cursor);
    result.push({
      key,
      label: formatter.format(cursor),
      active: days.has(key),
      isToday: key === todayKey,
    });
  }

  return result;
}

/** Calcula la mejor racha histórica dentro del conjunto de días completados. */
export function longestStreak(days: CompletedDaySet): number {
  if (days.size === 0) return 0;
  const sorted = [...days].filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort();
  if (sorted.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime();
    const curr = new Date(`${sorted[i]}T00:00:00Z`).getTime();
    const diffDays = Math.round((curr - prev) / 86_400_000);
    if (diffDays === 1) {
      current += 1;
      if (current > best) best = current;
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return best;
}

/** Genera un resumen diario en Markdown limpio para copiar o exportar. */
export function buildDailyMarkdown(
  tasks: Task[],
  sessionsTodayCount: number,
  streakCount: number,
): string {
  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const dateLabel = localDateKey(new Date());

  const lines = [
    `# FlowCapy · Resumen Diario (${dateLabel})`,
    ``,
    `- **Tareas pendientes**: ${pending.length}`,
    `- **Tareas completadas**: ${completed.length}`,
    `- **Sesiones Pomodoro hoy**: ${sessionsTodayCount}`,
    `- **Racha actual**: ${streakCount} ${streakCount === 1 ? "día" : "días"}`,
    ``,
    `## Pendientes por prioridad`,
  ];

  if (pending.length === 0) {
    lines.push(`- Sin tareas pendientes.`);
  } else {
    for (const task of pending) {
      const badge = priorityBadge(task);
      lines.push(`- [ ] **[${badge.label}]** ${task.title}`);
    }
  }

  lines.push(``, `## Completadas`);
  if (completed.length === 0) {
    lines.push(`- Aún no hay tareas completadas.`);
  } else {
    for (const task of completed) {
      lines.push(`- [x] ${task.title}`);
    }
  }

  return lines.join("\n");
}
