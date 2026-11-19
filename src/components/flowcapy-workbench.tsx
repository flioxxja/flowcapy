"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AmbientFlowCanvas } from "@/components/ambient-flow-canvas";
import { CommandPalette, type CommandItem } from "@/components/command-palette";
import { EisenhowerMatrix } from "@/components/eisenhower-matrix";
import { SoundscapeBar } from "@/components/soundscape-bar";
import { ZenModeOverlay } from "@/components/zen-mode-overlay";
import { soundEngine, type SoundscapeMode } from "@/lib/audio/soundscape";
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
  currentStreak,
  registerToday,
  useCompletedDays,
} from "@/lib/streaks";
import {
  createTaskId,
  priorityBadge,
  sortByPriority,
  useTasks,
  type Importance,
  type Task,
  type Urgency,
} from "@/lib/tasks";
import {
  buildDailyMarkdown,
  buildHeatmapDays,
  longestStreak,
} from "@/lib/workspace-utils";

const BADGE_STYLES: Record<number, string> = {
  1: "border-[#ff6b5e]/45 bg-[#ff6b5e]/15 text-[#ff9d92]",
  2: "border-[#e8a94e]/45 bg-[#e8a94e]/15 text-[#f7d794]",
  3: "border-[#7cc7e8]/45 bg-[#7cc7e8]/15 text-[#7cc7e8]",
  4: "border-white/15 bg-white/5 text-white/65",
};

function TaskRow({
  task,
  isFocused,
  onToggle,
  onDelete,
  onFocus,
}: {
  task: Task;
  isFocused: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const badge = priorityBadge(task);
  return (
    <li
      className={`group flex min-h-12 items-center gap-3 border-b border-white/[0.07] px-2 py-2.5 transition-colors last:border-b-0 ${
        isFocused ? "bg-[#e8a94e]/[0.07]" : "hover:bg-white/[0.025]"
      }`}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`Marcar como ${task.completed ? "pendiente" : "completada"}: ${task.title}`}
        className="h-5 w-5 shrink-0 cursor-pointer accent-[#e8a94e]"
      />
      <span
        className={
          task.completed
            ? "min-w-0 flex-1 text-sm text-white/45 line-through"
            : "min-w-0 flex-1 text-sm text-white/90"
        }
      >
        {task.title}
      </span>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${BADGE_STYLES[badge.level]}`}
        title={`Prioridad ${badge.label} (${badge.text}) — urgencia ${task.urgency}, importancia ${task.importance}`}
      >
        {badge.label} · {badge.text}
      </span>
      {!task.completed && (
        <button
          type="button"
          onClick={() => onFocus(task.id)}
          className={`hidden shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition sm:inline-flex ${
            isFocused
              ? "bg-[#e8a94e] font-semibold text-[#06070a]"
              : "border border-white/15 text-white/55 hover:border-[#e8a94e]/50 hover:text-white"
          }`}
          title="Fijar esta tarea en el temporizador Pomodoro"
        >
          {isFocused ? "En foco" : "Enfocar"}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Eliminar tarea: ${task.title}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white"
      >
        ×
      </button>
    </li>
  );
}

function Capybara() {
  return (
    <svg
      role="img"
      aria-label="Capibara"
      viewBox="0 0 220 130"
      className="flow-capybara mx-auto h-auto w-56"
    >
      <ellipse cx="135" cy="100" rx="72" ry="30" fill="#9c7a54" />
      <ellipse cx="135" cy="106" rx="58" ry="20" fill="#a9855e" />
      <rect x="96" y="112" width="18" height="12" rx="6" fill="#8a6d4b" />
      <rect x="150" y="112" width="18" height="12" rx="6" fill="#8a6d4b" />
      <circle cx="80" cy="32" r="7" fill="#8a6d4b" />
      <circle cx="52" cy="34" r="8" fill="#8a6d4b" />
      <circle cx="52" cy="34" r="4" fill="#6b543a" />
      <circle cx="64" cy="28" r="7" fill="#e8a94e" />
      <circle cx="62" cy="62" r="30" fill="#a9855e" />
      <ellipse cx="38" cy="72" rx="16" ry="11" fill="#b08d63" />
      <ellipse cx="26" cy="66" rx="5" ry="4" fill="#3a2e22" />
      <circle cx="58" cy="54" r="3.5" fill="#2b2118" />
      <circle cx="59" cy="53" r="1" fill="#ffffff" />
    </svg>
  );
}

export function FlowCapyWorkbench() {
  const { tasks, updateTasks } = useTasks();
  const { state: pomodoroState, storageWarning, updateState: updatePomodoro } = usePomodoroStore();
  const { days } = useCompletedDays();

  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("media");
  const [importance, setImportance] = useState<Importance>("media");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMatrix, setShowMatrix] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const [logoClicks, setLogoClicks] = useState(0);
  const [capybaraVisible, setCapybaraVisible] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const [currentDay, setCurrentDay] = useState(() => new Date());

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [zenOpen, setZenOpen] = useState(false);
  const [soundMode, setSoundMode] = useState<SoundscapeMode>("off");
  const [soundVolume, setSoundVolume] = useState(0.28);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const prevPhaseRef = useRef(pomodoroState.timer.phase);

  // Sync current day for streaks and Pomodoro daily counter
  useEffect(() => {
    const updateCurrentDay = () => setCurrentDay(new Date());
    const interval = window.setInterval(updateCurrentDay, 60_000);
    window.addEventListener("focus", updateCurrentDay);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", updateCurrentDay);
    };
  }, []);

  // Pomodoro tick loop
  useEffect(() => {
    if (pomodoroState.timer.status !== "running") return;

    const updateTimer = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      updatePomodoro((previous) => advancePomodoro(previous, currentTime));
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(interval);
  }, [pomodoroState.timer.status, updatePomodoro]);

  // Harmonic chime when Pomodoro transitions phase
  useEffect(() => {
    if (prevPhaseRef.current !== pomodoroState.timer.phase) {
      prevPhaseRef.current = pomodoroState.timer.phase;
      if (chimeEnabled && pomodoroState.timer.status === "running") {
        soundEngine.playChime();
      }
    }
  }, [pomodoroState.timer.phase, pomodoroState.timer.status, chimeEnabled]);

  // Global Cmd+K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Cleanup ambient sound on unmount
  useEffect(() => {
    return () => {
      soundEngine.setMode("off");
    };
  }, []);

  // Cursor spotlight for architectural panels
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let rafId = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || rafId) return;
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-spotlight]");
      if (!target) return;
      const x = event.clientX;
      const y = event.clientY;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${x - rect.left}px`);
        target.style.setProperty("--my", `${y - rect.top}px`);
      });
    };
    root.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      root.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  const ordered = useMemo(() => sortByPriority(tasks), [tasks]);
  const pending = useMemo(() => ordered.filter((t) => !t.completed), [ordered]);
  const completed = useMemo(() => ordered.filter((t) => t.completed), [ordered]);

  const visiblePending = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((t) => t.title.toLowerCase().includes(q));
  }, [pending, searchQuery]);

  const activeTask = useMemo(
    () => pending.find((t) => t.id === focusedTaskId) ?? pending[0] ?? null,
    [pending, focusedTaskId],
  );

  const { timer, sessions } = pomodoroState;
  const totalSeconds = durationForPhase(timer.phase);
  const remainingSeconds = remainingPomodoroSeconds(pomodoroState, now);
  const progress =
    totalSeconds === 0 ? 0 : Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  const completedToday = sessionsToday(sessions, currentDay);
  const streak = currentStreak(days, currentDay);
  const bestStreak = useMemo(() => longestStreak(days), [days]);
  const heatmap = useMemo(() => buildHeatmapDays(days, currentDay, 28), [days, currentDay]);

  const phaseLabel = timer.phase === "focus" ? "Enfoque" : "Descanso";
  const actionLabel =
    timer.status === "running"
      ? "Pausar"
      : timer.status === "paused"
        ? "Reanudar"
        : "Iniciar";
  const minutesRemaining = Math.ceil(remainingSeconds / 60);
  const announcement = `${phaseLabel}: ${minutesRemaining} minutos restantes`;

  const completionRatio =
    tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100);

  function handleLogoClick() {
    const next = logoClicks + 1;
    if (next >= 3) {
      setCapybaraVisible((prev) => !prev);
      setLogoClicks(0);
    } else {
      setLogoClicks(next);
    }
  }

  const toggleTimer = useCallback(() => {
    const currentTime = Date.now();
    setNow(currentTime);
    updatePomodoro((previous) =>
      previous.timer.status === "running"
        ? pausePomodoro(previous, currentTime)
        : startPomodoro(previous, currentTime),
    );
  }, [updatePomodoro]);

  const resetTimer = useCallback(() => {
    setNow(Date.now());
    updatePomodoro(resetPomodoro);
  }, [updatePomodoro]);

  const handleSoundModeChange = useCallback((nextMode: SoundscapeMode) => {
    setSoundMode(nextMode);
    soundEngine.setMode(nextMode);
  }, []);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setSoundVolume(nextVolume);
    soundEngine.setVolume(nextVolume);
  }, []);

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

  const quickAddUrgentTask = useCallback(
    (quickTitle: string) => {
      const trimmed = quickTitle.trim();
      if (!trimmed) return;
      const task: Task = {
        id: createTaskId(),
        title: trimmed,
        urgency: "alta",
        importance: "alta",
        completed: false,
        createdAt: new Date().toISOString(),
      };
      updateTasks((prev) => [task, ...prev]);
      setFocusedTaskId(task.id);
    },
    [updateTasks],
  );

  const toggleTask = useCallback(
    (id: string) => {
      updateTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const nextCompleted = !t.completed;
          if (nextCompleted) {
            registerToday();
          }
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }),
      );
    },
    [updateTasks],
  );

  const deleteTask = useCallback(
    (id: string) => {
      updateTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [updateTasks],
  );

  const clearCompletedTasks = useCallback(() => {
    updateTasks((prev) => prev.filter((t) => !t.completed));
  }, [updateTasks]);

  const copyMarkdownSummary = useCallback(async () => {
    const md = buildDailyMarkdown(ordered, completedToday, streak);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Ignore restricted clipboard contexts.
    }
  }, [ordered, completedToday, streak]);

  const exportBackupJson = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "FlowCapy",
      tasks: ordered,
      pomodoroSessions: sessions,
      completedDays: [...days],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flowcapy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [ordered, sessions, days]);

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "timer-toggle",
        section: "Pomodoro",
        label: timer.status === "running" ? "Pausar temporizador" : "Iniciar / reanudar temporizador",
        shortcut: "P",
        run: toggleTimer,
      },
      {
        id: "timer-reset",
        section: "Pomodoro",
        label: "Reiniciar temporizador a 25:00",
        run: resetTimer,
      },
      {
        id: "zen-mode",
        section: "Enfoque",
        label: "Entrar en Modo Zen pantalla completa",
        shortcut: "ZEN",
        run: () => setZenOpen(true),
      },
      {
        id: "toggle-matrix",
        section: "Tareas",
        label: showMatrix ? "Ocultar Matriz Eisenhower 2×2" : "Mostrar Matriz Eisenhower 2×2",
        run: () => setShowMatrix((prev) => !prev),
      },
      {
        id: "sound-brown",
        section: "Audio",
        label: "Activar paisaje sonoro: Ruido marrón profundo",
        run: () => handleSoundModeChange("brown"),
      },
      {
        id: "sound-rain",
        section: "Audio",
        label: "Activar paisaje sonoro: Lluvia cálida",
        run: () => handleSoundModeChange("rain"),
      },
      {
        id: "sound-binaural",
        section: "Audio",
        label: "Activar paisaje sonoro: Binaural 40Hz Focus",
        run: () => handleSoundModeChange("binaural"),
      },
      {
        id: "sound-off",
        section: "Audio",
        label: "Silenciar paisaje sonoro",
        run: () => handleSoundModeChange("off"),
      },
      {
        id: "copy-md",
        section: "Exportar",
        label: "Copiar resumen diario en Markdown",
        run: () => void copyMarkdownSummary(),
      },
      {
        id: "export-json",
        section: "Exportar",
        label: "Descargar respaldo completo (.json)",
        run: exportBackupJson,
      },
      {
        id: "capybara",
        section: "Secreto",
        label: capybaraVisible ? "Esconder el Capibara" : "Invocar al Capibara de enfoque",
        run: () => setCapybaraVisible((prev) => !prev),
      },
    ],
    [
      timer.status,
      toggleTimer,
      resetTimer,
      showMatrix,
      handleSoundModeChange,
      copyMarkdownSummary,
      exportBackupJson,
      capybaraVisible,
    ],
  );

  return (
    <div ref={containerRef} className="flow-shell min-h-dvh bg-[#06070a] text-[#f5f3ef]">
      {/* Floating Glassmorphic Pill Navbar */}
      <div className="flow-nav-wrap">
        <header className="flow-nav">
          <button
            type="button"
            onClick={handleLogoClick}
            className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
            aria-label="FlowCapy — inicio"
          >
            FlowCapy<span className="text-[#e8a94e]">.</span>
          </button>

          <nav aria-label="Navegación principal" className="hidden items-center gap-1 md:flex">
            <a href="#plan" className="flow-nav-link">
              <span className="flow-nav-idx">01</span>Plan
            </a>
            <a href="#pomodoro" className="flow-nav-link">
              <span className="flow-nav-idx">02</span>Pomodoro
            </a>
            <a href="#rachas" className="flow-nav-link">
              <span className="flow-nav-idx">03</span>Rachas
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZenOpen(true)}
              className="hidden rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/80 hover:border-[#e8a94e]/55 hover:text-white sm:inline-flex"
            >
              Modo Zen
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#06070a] transition hover:bg-[#f7d794]"
              aria-label="Abrir paleta de comandos (Ctrl+K)"
            >
              <span>Comandos</span>
              <kbd className="rounded bg-black/15 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
          </div>
        </header>
      </div>

      <main id="contenido-principal">
        {/* Full-Bleed Editorial Hero with Live 60fps Generative Constellation */}
        <section aria-label="Resumen del día" className="flow-hero">
          <AmbientFlowCanvas phase={timer.phase} status={timer.status} />
          <div className="flow-hero-vignette" aria-hidden="true" />

          <div className="flow-hero-meta" aria-hidden="true">
            <span>+ LOCAL-FIRST · SIN CUENTAS · CERO BACKEND</span>
            <span className="hidden sm:inline">EISENHOWER × POMODORO × AUDIO GENERATIVO</span>
          </div>

          <div className="flow-hero-inner">
            <div className="max-w-2xl">
              <p className="flow-kicker">
                <span className="flow-kicker-dot" aria-hidden="true" />
                <span>Centro de enfoque personal</span>
              </p>

              <h1 className="flow-hero-title">
                Tu <em className="flow-editorial-italic">día</em> en una
                <br />
                sola pantalla<span className="text-[#e8a94e]">.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
                Prioridad automática Eisenhower, temporizador Pomodoro con paisajes sonoros Web
                Audio, Modo Zen y mapa de rachas — todo guardado al instante en tu navegador.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#plan" className="btn-flow-primary">
                  Organizar mi día
                </a>
                <button
                  type="button"
                  onClick={() => setZenOpen(true)}
                  className="btn-flow-ghost"
                >
                  Entrar en Modo Zen
                </button>
              </div>
            </div>
          </div>

          {/* Full-width Architectural Bottom Telemetry Rail */}
          <div className="flow-rail">
            <div className="flow-rail-inner">
              <div className="flow-rail-cell">
                <span className="rail-kicker">01 / Pendientes</span>
                <strong className="rail-num tabular-nums">{pending.length}</strong>
              </div>
              <div className="flow-rail-cell">
                <span className="rail-kicker">02 / Completadas</span>
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="rail-num tabular-nums text-[#e8a94e]">{completed.length}</strong>
                  <span className="font-mono text-xs text-white/45">{completionRatio}%</span>
                </div>
              </div>
              <div className="flow-rail-cell">
                <span className="rail-kicker">03 / Pomodoros hoy</span>
                <strong className="rail-num tabular-nums text-white">{completedToday}</strong>
              </div>
              <div className="flow-rail-cell">
                <span className="rail-kicker">04 / Racha actual</span>
                <strong className="rail-num tabular-nums text-[#4ade80]">
                  {streak} <span className="text-sm font-normal text-white/50">d</span>
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* Main Precision Cockpit Workspace */}
        <div className="mx-auto w-full max-w-[1320px] space-y-10 px-4 py-14 sm:px-8">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            {/* 01 · Plan del día */}
            <section id="plan" aria-labelledby="tasks-title" className="flow-panel" data-spotlight>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <span className="flow-num" aria-hidden="true">01</span>
                  <h2 id="tasks-title" className="font-display text-2xl font-semibold text-white">
                    Plan del día
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={showMatrix}
                    onClick={() => setShowMatrix((prev) => !prev)}
                    className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
                      showMatrix
                        ? "border-[#e8a94e]/50 bg-[#e8a94e]/15 text-[#f7d794]"
                        : "border-white/15 text-white/65 hover:text-white"
                    }`}
                  >
                    Matriz 2×2
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyMarkdownSummary()}
                    className="rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white/65 hover:text-white"
                  >
                    {copiedSummary ? "Copiado ✓" : "Copiar .md"}
                  </button>
                  <button
                    type="button"
                    onClick={exportBackupJson}
                    className="rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white/65 hover:text-white"
                  >
                    Backup
                  </button>
                </div>
              </div>

              <p className="flow-empty mt-4">
                {pending.length === 0
                  ? "Aún no hay tareas. Añade la primera abajo: se ordena sola por prioridad (Eisenhower: urgencia + importancia)."
                  : `${pending.length} pendiente${pending.length === 1 ? "" : "s"} · ${completed.length} completada${completed.length === 1 ? "" : "s"}`}
              </p>

              <form onSubmit={addTask} className="mt-5 flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="new-task-title"
                    className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-white/55"
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
                    className="min-h-11 w-full rounded-xl border border-white/15 bg-black/45 px-3.5 text-sm text-white placeholder:text-white/35 focus:border-[#e8a94e]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="new-task-urgency"
                      className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-white/55"
                    >
                      Urgencia
                    </label>
                    <select
                      id="new-task-urgency"
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as Urgency)}
                      className="min-h-11 w-full rounded-xl border border-white/15 bg-black/45 px-3 text-sm text-white focus:border-[#e8a94e]"
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="new-task-importance"
                      className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-white/55"
                    >
                      Importancia
                    </label>
                    <select
                      id="new-task-importance"
                      value={importance}
                      onChange={(e) => setImportance(e.target.value as Importance)}
                      className="min-h-11 w-full rounded-xl border border-white/15 bg-black/45 px-3 text-sm text-white focus:border-[#e8a94e]"
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
                  className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-[#06070a] transition hover:bg-[#f7d794] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Añadir tarea
                </button>
              </form>

              {pending.length > 3 && (
                <div className="mt-4">
                  <label htmlFor="task-filter-search" className="sr-only">
                    Filtrar tareas pendientes
                  </label>
                  <input
                    id="task-filter-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar en tus tareas pendientes…"
                    className="min-h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 text-xs text-white placeholder:text-white/35"
                  />
                </div>
              )}

              {showMatrix && (
                <EisenhowerMatrix
                  tasks={ordered}
                  focusedTaskId={activeTask?.id ?? null}
                  onFocusTask={setFocusedTaskId}
                  onToggleTask={toggleTask}
                />
              )}

              {visiblePending.length > 0 && (
                <ul className="mt-5" aria-label="Tareas pendientes por prioridad">
                  {visiblePending.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isFocused={activeTask?.id === task.id}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onFocus={setFocusedTaskId}
                    />
                  ))}
                </ul>
              )}

              {completed.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-white/50">
                      Completadas ({completed.length})
                    </h3>
                    <button
                      type="button"
                      onClick={clearCompletedTasks}
                      className="font-mono text-[11px] text-white/45 hover:text-white"
                    >
                      Limpiar completadas
                    </button>
                  </div>
                  <ul aria-label="Tareas completadas">
                    {completed.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isFocused={false}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onFocus={setFocusedTaskId}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* 02 · Pomodoro Cockpit */}
            <section
              id="pomodoro"
              aria-labelledby="pomodoro-title"
              className="flow-panel"
              data-spotlight
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <span className="flow-num" aria-hidden="true">02</span>
                  <h2 id="pomodoro-title" className="font-display text-2xl font-semibold text-white">
                    Pomodoro
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setZenOpen(true)}
                  className="rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white/70 hover:border-[#e8a94e]/50 hover:text-white"
                >
                  Pantalla Zen ↗
                </button>
              </div>

              <p className="flow-empty mt-4">
                Temporizador de 25 minutos de enfoque y 5 de descanso, con contador de sesiones
                completadas y paisajes sonoros generativos.
              </p>

              {activeTask && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#e8a94e]/25 bg-[#e8a94e]/[0.07] px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8a94e]">
                      Enfocando ahora
                    </p>
                    <p className="truncate text-sm font-medium text-white">{activeTask.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTask(activeTask.id)}
                    className="shrink-0 rounded-full border border-[#e8a94e]/40 px-3 py-1 text-xs font-medium text-[#f7d794] hover:bg-[#e8a94e]/20"
                  >
                    Completar
                  </button>
                </div>
              )}

              <div className="mt-6 flex flex-col items-center">
                <div
                  className="relative grid h-60 w-60 place-items-center rounded-full shadow-[0_0_100px_rgba(232,169,78,0.16)] sm:h-68 sm:w-68"
                  style={{
                    background: `conic-gradient(${timer.phase === "break" ? "#4ade80" : "var(--accent)"} ${progress * 360}deg, rgba(255, 255, 255, 0.08) 0deg)`,
                    transition: "background 250ms linear",
                  }}
                  role="progressbar"
                  aria-label={`Progreso de ${phaseLabel.toLowerCase()}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  aria-valuetext={`${formatDuration(remainingSeconds)} restantes`}
                >
                  <div className="grid h-[calc(100%-10px)] w-[calc(100%-10px)] place-items-center rounded-full bg-[#090b10] text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
                    <div>
                      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#e8a94e]">
                        {phaseLabel}
                      </p>
                      <p
                        className="mt-1.5 font-display text-6xl font-bold leading-none tabular-nums tracking-tight text-white sm:text-7xl"
                        role="timer"
                        aria-live="off"
                        aria-label={`${phaseLabel}: ${formatDuration(remainingSeconds)} restantes`}
                      >
                        {formatDuration(remainingSeconds)}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-white/45">tiempo restante</p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 max-w-sm text-center text-xs text-white/55">
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

                {/* Preserves exact Tab order: Iniciar/Pausar -> Reiniciar */}
                <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={toggleTimer}
                    className="min-h-11 min-w-36 rounded-full bg-[#e8a94e] px-6 text-sm font-bold text-[#06070a] shadow-[0_12px_34px_rgba(232,169,78,0.28)] transition hover:opacity-90 active:scale-[0.98]"
                  >
                    {actionLabel}
                  </button>
                  <button
                    type="button"
                    onClick={resetTimer}
                    className="min-h-11 rounded-full border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Reiniciar
                  </button>
                </div>

                <div
                  className="mt-5 w-full rounded-2xl border border-[#e8a94e]/25 bg-[#e8a94e]/[0.07] px-4 py-3 text-center"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <p className="text-xs text-white/70">
                    Sesiones completadas hoy:{" "}
                    <strong className="ml-1 font-display text-2xl font-bold tabular-nums text-[#e8a94e]">
                      {completedToday}
                    </strong>
                  </p>
                </div>

                {storageWarning && (
                  <p
                    className="mt-4 w-full rounded-xl border border-[#ff6b5e]/40 bg-[#ff6b5e]/10 px-4 py-3 text-sm text-[#ff9d92]"
                    data-testid="pomodoro-storage-warning"
                    role="status"
                  >
                    {storageWarning}
                  </p>
                )}
              </div>

              <SoundscapeBar
                mode={soundMode}
                volume={soundVolume}
                chimeEnabled={chimeEnabled}
                onModeChange={handleSoundModeChange}
                onVolumeChange={handleVolumeChange}
                onToggleChime={() => setChimeEnabled((prev) => !prev)}
              />
            </section>
          </div>

          {/* 03 · Rachas + 28-Day Consistency Heatmap + Secret Capybara */}
          <section id="rachas" aria-labelledby="streaks-title" className="flow-panel" data-spotlight>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flow-num" aria-hidden="true">03</span>
                  <h2 id="streaks-title" className="font-display text-2xl font-semibold text-white">
                    Rachas
                  </h2>
                </div>

                <div className="mt-5 flex items-end gap-5">
                  <p className="sr-only">
                    Racha actual: {streak} {streak === 1 ? "día" : "días"}
                  </p>
                  <p
                    className="font-display text-7xl font-bold leading-none tabular-nums text-[#e8a94e]"
                    aria-hidden="true"
                  >
                    {streak}
                  </p>
                  <p className="flow-empty pb-1">
                    {streak === 0
                      ? "Aún no tienes racha. Completa una tarea hoy para empezar la tuya."
                      : streak === 1
                        ? "día seguido completando al menos una tarea."
                        : "días seguidos completando al menos una tarea."}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-6 border-t border-white/10 pt-4 font-mono text-xs text-white/55">
                  <span>
                    Mejor racha: <strong className="text-white">{bestStreak} d</strong>
                  </span>
                  <span>
                    Días activos: <strong className="text-white">{days.size}</strong>
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">
                  <span>Mapa de consistencia · últimos 28 días</span>
                  <span className="text-[#e8a94e]">{heatmap.filter((d) => d.active).length}/28</span>
                </div>
                <div className="grid grid-cols-7 gap-2 sm:grid-cols-14" role="list" aria-label="Actividad de los últimos 28 días">
                  {heatmap.map((cell) => (
                    <div
                      key={cell.key}
                      role="listitem"
                      title={`${cell.label}: ${cell.active ? "Día completado" : "Sin actividad"}`}
                      className={`h-8 rounded-lg border transition ${
                        cell.active
                          ? "border-[#e8a94e]/60 bg-[#e8a94e]/80 shadow-[0_0_16px_rgba(232,169,78,0.3)]"
                          : cell.isToday
                            ? "border-white/35 bg-white/[0.06]"
                            : "border-white/10 bg-white/[0.025]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div aria-live="polite">
              {capybaraVisible && (
                <div className="flow-reveal mt-6 border-t border-white/10 pt-6">
                  <Capybara />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/10 py-8 text-center font-mono text-xs text-white/45">
        FlowCapy · Local-first · Teens Hack Houston (Triple H) · Tech Track
      </footer>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        onQuickAddTask={quickAddUrgentTask}
        soundMode={soundMode}
      />

      <ZenModeOverlay
        open={zenOpen}
        onClose={() => setZenOpen(false)}
        phase={timer.phase}
        status={timer.status}
        remainingSeconds={remainingSeconds}
        progress={progress}
        activeTask={activeTask}
        onToggleTimer={toggleTimer}
        onResetTimer={resetTimer}
        onCompleteActiveTask={() => {
          if (activeTask) toggleTask(activeTask.id);
        }}
        soundMode={soundMode}
        onSoundModeChange={handleSoundModeChange}
      />
    </div>
  );
}
