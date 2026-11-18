"use client";

/**
 * FlowCapy — ciclos 1 y 2: gestor de tareas y temporizador Pomodoro.
 * Alta de tareas (título + urgencia + importancia), lista ordenada por
 * prioridad Eisenhower, completar/descompletar y eliminar.
 * Persistencia en localStorage vía src/lib/tasks.ts; sin backend ni datos falsos.
 * Rachas sigue como placeholder honesto (ciclo 3).
 */
import { useEffect, useState, type FormEvent } from "react";
import {
  advancePomodoro,
  durationForPhase,
  formatDuration,
  pausePomodoro,
  remainingPomodoroSeconds,
  resetPomodoro,
  sessionsToday,
  startPomodoro,
  usePomodoroStore,
} from "@/lib/pomodoro";
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

function PomodoroTimer() {
  const { state, storageWarning, updateState } = usePomodoroStore();
  const [now, setNow] = useState(() => Date.now());
  const [currentDay, setCurrentDay] = useState(() => new Date());

  const { timer, sessions } = state;
  const totalSeconds = durationForPhase(timer.phase);
  const remainingSeconds = remainingPomodoroSeconds(state, now);
  const progress =
    totalSeconds === 0
      ? 0
      : Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  const completedToday = sessionsToday(sessions, currentDay);

  useEffect(() => {
    const updateCurrentDay = () => setCurrentDay(new Date());
    const interval = window.setInterval(updateCurrentDay, 60_000);
    window.addEventListener("focus", updateCurrentDay);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", updateCurrentDay);
    };
  }, []);

  useEffect(() => {
    if (timer.status !== "running") return;

    const updateTimer = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      updateState((previous) => advancePomodoro(previous, currentTime));
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(interval);
  }, [timer.status, updateState]);

  function toggleTimer() {
    const currentTime = Date.now();
    setNow(currentTime);
    updateState((previous) =>
      previous.timer.status === "running"
        ? pausePomodoro(previous, currentTime)
        : startPomodoro(previous, currentTime),
    );
  }

  function resetTimer() {
    setNow(Date.now());
    updateState(resetPomodoro);
  }

  const phaseLabel = timer.phase === "focus" ? "Enfoque" : "Descanso";
  const actionLabel =
    timer.status === "running"
      ? "Pausar"
      : timer.status === "paused"
        ? "Reanudar"
        : "Iniciar";
  const minutesRemaining = Math.ceil(remainingSeconds / 60);
  const announcement = `${phaseLabel}: ${minutesRemaining} minutos restantes`;

  return (
    <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 flex-col items-center">
        <div
          className="relative grid h-56 w-56 place-items-center rounded-full shadow-[0_0_90px_rgba(232,169,78,0.14)] sm:h-64 sm:w-64"
          style={{
            background: `conic-gradient(var(--accent) ${progress * 360}deg, rgba(255, 255, 255, 0.08) 0deg)`,
            transition: "background 250ms linear",
          }}
          role="progressbar"
          aria-label={`Progreso de ${phaseLabel.toLowerCase()}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={`${formatDuration(remainingSeconds)} restantes`}
        >
          <div className="grid h-[calc(100%-12px)] w-[calc(100%-12px)] place-items-center rounded-full bg-surface text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                {phaseLabel}
              </p>
              <p
                className="mt-1 font-display text-6xl font-bold leading-none tabular-nums tracking-tight text-foreground sm:text-7xl"
                role="timer"
                aria-live="off"
                aria-label={`${phaseLabel}: ${formatDuration(remainingSeconds)} restantes`}
              >
                {formatDuration(remainingSeconds)}
              </p>
              <p className="mt-2 text-xs text-muted">tiempo restante</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          {timer.phase === "focus"
            ? "Concéntrate en una tarea. Al terminar, tendrás 5 minutos de descanso."
            : "Respira y descansa. Después volverás a una sesión de enfoque."}
        </p>
        <p
          className="sr-only"
          data-testid="pomodoro-announcement"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:w-44">
        <button
          type="button"
          onClick={toggleTimer}
          className="min-h-11 rounded-xl bg-accent px-5 text-sm font-bold text-black shadow-[0_10px_30px_rgba(232,169,78,0.22)] transition-all hover:opacity-90 active:scale-[0.98]"
        >
          {actionLabel}
        </button>
        <button
          type="button"
          onClick={resetTimer}
          className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
        >
          Reiniciar
        </button>
        <div
          className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-center"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-xs text-muted">
            Sesiones completadas hoy:{" "}
            <strong className="font-display text-3xl font-bold tabular-nums text-accent">
              {completedToday}
            </strong>
          </p>
        </div>
        {storageWarning && (
          <p
            className="rounded-xl border border-[#ff6b5e]/40 bg-[#ff6b5e]/10 px-4 py-3 text-sm text-[#ff9d92]"
            data-testid="pomodoro-storage-warning"
            role="status"
          >
            {storageWarning}
          </p>
        )}
      </div>
    </div>
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
    <main className="relative z-[1] mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <a
          href="#"
          className="font-display text-3xl font-bold tracking-tight"
          aria-label="FlowCapy — inicio"
        >
          FlowCapy<span className="text-accent">.</span>
        </a>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted">
          Local-first · sin cuentas
        </span>
      </header>

      <div className="flow-marquee" aria-hidden="true">
        <div className="flow-marquee-track">
          <span>Enfoque ✦ Tareas ✦ Pomodoro ✦ Rachas ✦ FlowCapy ✦&nbsp;</span>
          <span>Enfoque ✦ Tareas ✦ Pomodoro ✦ Rachas ✦ FlowCapy ✦&nbsp;</span>
        </div>
      </div>

      <section aria-label="Resumen del día" className="flow-section relative overflow-hidden">
        <span className="flow-watermark" aria-hidden="true">FLOWCAPY</span>
        <h1 className="flow-hero-title relative">
          Tu <span className="flow-hero-accent">día</span> en una sola pantalla
        </h1>
        <p className="flow-empty relative mt-4 max-w-md">
          Tareas con prioridad automática, Pomodoro y rachas — todo guardado en
          tu navegador, sin backend.
        </p>
        <div className="relative mt-6 flex gap-10">
          <div>
            <p className="font-display text-3xl font-bold tabular-nums">
              {pending.length}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              pendientes
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold tabular-nums text-accent">
              {completed.length}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              completadas
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="tasks-title" className="flow-section">
        <div className="flex items-center gap-3">
          <span className="flow-num" aria-hidden="true">01</span>
          <h2 id="tasks-title" className="font-display text-xl font-semibold">
            Plan del día
          </h2>
        </div>
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
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground placeholder:text-muted/70 focus:border-accent"
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
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground focus:border-accent"
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
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-foreground focus:border-accent"
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
            className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-black shadow-[0_10px_30px_rgba(232,169,78,0.22)] transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="flex items-center gap-3">
          <span className="flow-num" aria-hidden="true">02</span>
          <h2 id="pomodoro-title" className="font-display text-xl font-semibold">
            Pomodoro
          </h2>
        </div>
        <p className="flow-empty mt-2">
          Temporizador de 25 minutos de enfoque y 5 de descanso, con contador
          de sesiones completadas.
        </p>
        <PomodoroTimer />
      </section>

      <section aria-labelledby="streaks-title" className="flow-section">
        <div className="flex items-center gap-3">
          <span className="flow-num" aria-hidden="true">03</span>
          <h2 id="streaks-title" className="font-display text-xl font-semibold">
            Rachas
          </h2>
        </div>
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
