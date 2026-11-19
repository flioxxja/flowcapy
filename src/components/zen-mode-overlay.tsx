"use client";

import { useEffect } from "react";
import { formatDuration, type PomodoroPhase, type PomodoroStatus } from "@/lib/pomodoro";
import type { SoundscapeMode } from "@/lib/audio/soundscape";
import type { Task } from "@/lib/tasks";

interface ZenModeOverlayProps {
  open: boolean;
  onClose: () => void;
  phase: PomodoroPhase;
  status: PomodoroStatus;
  remainingSeconds: number;
  progress: number;
  activeTask: Task | null;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onCompleteActiveTask: () => void;
  soundMode: SoundscapeMode;
  onSoundModeChange: (mode: SoundscapeMode) => void;
}

export function ZenModeOverlay({
  open,
  onClose,
  phase,
  status,
  remainingSeconds,
  progress,
  activeTask,
  onToggleTimer,
  onResetTimer,
  onCompleteActiveTask,
  soundMode,
  onSoundModeChange,
}: ZenModeOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const phaseLabel = phase === "focus" ? "Enfoque profundo" : "Descanso consciente";
  const actionLabel =
    status === "running" ? "Pausar" : status === "paused" ? "Reanudar" : "Iniciar";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#050609]/98 px-6 py-8 text-white backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Zen de enfoque profundo"
    >
      <div className="flex w-full max-w-4xl items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#e8a94e]">
          FlowCapy · Modo Zen
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 px-4 py-1.5 font-mono text-xs text-white/75 hover:bg-white/10 hover:text-white"
        >
          Salir (ESC)
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <div
          className="relative grid h-72 w-72 place-items-center rounded-full shadow-[0_0_120px_rgba(232,169,78,0.2)] sm:h-80 sm:w-80"
          style={{
            background: `conic-gradient(${phase === "break" ? "#4ade80" : "#e8a94e"} ${progress * 360}deg, rgba(255, 255, 255, 0.08) 0deg)`,
            transition: "background 250ms linear",
          }}
        >
          <div className="grid h-[calc(100%-10px)] w-[calc(100%-10px)] place-items-center rounded-full bg-[#07090e]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e8a94e]">
                {phaseLabel}
              </p>
              <p className="mt-2 font-display text-7xl font-semibold tabular-nums tracking-tight text-white sm:text-8xl">
                {formatDuration(remainingSeconds)}
              </p>
            </div>
          </div>
        </div>

        {activeTask ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8a94e]">
              Objetivo activo
            </span>
            <span className="text-sm font-medium text-white">{activeTask.title}</span>
            {!activeTask.completed && (
              <button
                type="button"
                onClick={onCompleteActiveTask}
                className="rounded-full bg-emerald-400/20 px-3 py-0.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/30"
              >
                Completar ✓
              </button>
            )}
          </div>
        ) : (
          <p className="mt-8 font-mono text-xs text-white/45">
            Fija una tarea desde tu Plan del día para verla aquí durante tu sesión.
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onToggleTimer}
            className="min-h-11 rounded-full bg-white px-7 text-sm font-semibold text-[#06070a] hover:bg-[#f7d794]"
          >
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={onResetTimer}
            className="min-h-11 rounded-full border border-white/20 px-6 text-sm font-medium text-white/85 hover:bg-white/10"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {(["off", "brown", "rain", "binaural"] as SoundscapeMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSoundModeChange(mode)}
            className={`rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
              soundMode === mode
                ? "bg-[#e8a94e] font-semibold text-[#06070a]"
                : "border border-white/15 text-white/60 hover:text-white"
            }`}
          >
            {mode === "off"
              ? "Silencio"
              : mode === "brown"
                ? "Marrón"
                : mode === "rain"
                  ? "Lluvia"
                  : "40Hz"}
          </button>
        ))}
      </div>
    </div>
  );
}
