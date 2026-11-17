"use client";

/**
 * FlowCapy — ciclo 1 (prompts 9–12): gestor de tareas.
 * Alta de tareas (título + urgencia + importancia), lista ordenada por
 * prioridad Eisenhower, completar/descompletar y eliminar.
 * Persistencia en localStorage vía src/lib/tasks.ts; sin backend ni datos falsos.
 * Pomodoro y Rachas siguen como placeholders honestos (ciclos 2 y 3).
 */
import { useState, type FormEvent } from "react";
import {
  createTaskId,
  priorityBadge,
  sortByPriority,
  useTasks,
  type Importance,
  type Task,
  type Urgency,
} from "@/lib/tasks";

const BADGE_STYLES: Record<number, string> = {
  1: "border-[#ff6b5e]/50 bg-[#ff6b5e]/15 text-[#ff9d92]",
  2: "border-accent/50 bg-accent/15 text-accent",
  3: "border-[#7cc7e8]/50 bg-[#7cc7e8]/15 text-[#7cc7e8]",
  4: "border-white/10 bg-white/5 text-muted",
};

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const badge = priorityBadge(task);
  return (
    <li className="flex min-h-11 items-center gap-3 border-b border-white/5 px-1 py-2 last:border-b-0">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`Marcar como ${task.completed ? "pendiente" : "completada"}: ${task.title}`}
        className="h-6 w-6 shrink-0 cursor-pointer accent-[#e8a94e]"
      />
      <span
        className={
          task.completed
            ? "min-w-0 flex-1 text-sm text-muted line-through"
            : "min-w-0 flex-1 text-sm"
        }
      >
        {task.title}
      </span>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BADGE_STYLES[badge.level]}`}
        title={`Prioridad ${badge.label} (${badge.text}) — urgencia ${task.urgency}, importancia ${task.importance}`}
      >
        {badge.label} · {badge.text}
      </span>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Eliminar tarea: ${task.title}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-muted transition-colors hover:bg-white/10 hover:text-foreground"
      >
        ×
      </button>
    </li>
  );
}

export default function Home() {
  // Store externo sincronizado con localStorage (sin efectos: ver useTasks).
  const { tasks, updateTasks } = useTasks();
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("media");
  const [importance, setImportance] = useState<Importance>("media");

  const ordered = sortByPriority(tasks);
  const pending = ordered.filter((t) => !t.completed);
  const completed = ordered.filter((t) => t.completed);

  function addTask(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const task: Task = {
      id: createTaskId(),
      title: trimmed,
      urgency,
      importance,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    updateTasks((prev) => [task, ...prev]);
    setTitle("");
  }

  function toggleTask(id: string) {
    updateTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed
                ? new Date().toISOString()
                : undefined,
            }
          : t,
      ),
    );
  }

  function deleteTask(id: string) {
    updateTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <a
          href="#"
          className="font-display text-2xl font-bold tracking-tight"
          aria-label="FlowCapy — inicio"
        >
          FlowCapy<span className="text-accent">.</span>
        </a>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted">
          Local-first · sin cuentas
        </span>
      </header>

      <section aria-label="Resumen del día" className="flow-section">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Tu día en una sola pantalla
        </h1>
        <p className="flow-empty mt-2">
          Tareas con prioridad automática, Pomodoro y rachas — todo guardado en
          tu navegador, sin backend.
        </p>
      </section>

      <section aria-labelledby="tasks-title" className="flow-section">
        <h2 id="tasks-title" className="font-display text-xl font-semibold">
          Plan del día
        </h2>
        <p className="flow-empty mt-2">
          {pending.length === 0
            ? "Aún no hay tareas. Añade la primera abajo: se ordena sola por prioridad (Eisenhower: urgencia + importancia)."
            : `${pending.length} pendiente${pending.length === 1 ? "" : "s"} · ${completed.length} completada${completed.length === 1 ? "" : "s"}`}
        </p>

        <form onSubmit={addTask} className="mt-4 flex flex-col gap-3">
          <div>
            <label
              htmlFor="new-task-title"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Nueva tarea
            </label>
            <input
              id="new-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej.: Terminar el ensayo de historia"
              maxLength={120}
              autoComplete="off"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="new-task-urgency"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Urgencia
              </label>
              <select
                id="new-task-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="new-task-importance"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Importancia
              </label>
              <select
                id="new-task-importance"
                value={importance}
                onChange={(e) => setImportance(e.target.value as Importance)}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={title.trim() === ""}
            className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            Añadir tarea
          </button>
        </form>

        {pending.length > 0 && (
          <ul className="mt-4" aria-label="Tareas pendientes por prioridad">
            {pending.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
              />
            ))}
          </ul>
        )}

        {completed.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Completadas ({completed.length})
            </h3>
            <ul aria-label="Tareas completadas">
              {completed.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="pomodoro-title" className="flow-section">
        <h2 id="pomodoro-title" className="font-display text-xl font-semibold">
          Pomodoro
        </h2>
        <p className="flow-empty mt-2">
          Temporizador de 25 minutos de enfoque y 5 de descanso, con contador
          de sesiones completadas.
        </p>
      </section>

      <section aria-labelledby="streaks-title" className="flow-section">
        <h2 id="streaks-title" className="font-display text-xl font-semibold">
          Rachas
        </h2>
        <p className="flow-empty mt-2">
          Días seguidos completando al menos una tarea. Tu racha aparecerá aquí.
        </p>
      </section>

      <footer className="mt-auto pt-4 text-center text-xs text-muted">
        FlowCapy · Teens Hack Houston (Triple H) · Tech Track
      </footer>
    </main>
  );
}
