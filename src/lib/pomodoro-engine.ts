/**
 * Motor determinista del temporizador Pomodoro.
 *
 * No depende de React, Date.now ni localStorage: recibe el instante actual y
 * las duraciones como datos. Así la UI usa 25/5 y las pruebas pueden ejercitar
 * los mismos casos con duraciones cortas.
 */

export const DEFAULT_POMODORO_DURATIONS: PomodoroDurations = {
  focusSeconds: 25 * 60,
  breakSeconds: 5 * 60,
};

export interface PomodoroDurations {
  focusSeconds: number;
  breakSeconds: number;
}

export type PomodoroPhase = "focus" | "break";
export type PomodoroStatus = "idle" | "running" | "paused";

export interface PomodoroSession {
  /** Identificador estable del ciclo; evita contabilizar dos veces el mismo foco. */
  id: string;
  /** Fecha local YYYY-MM-DD en la que se completó la sesión de enfoque. */
  date: string;
  /** Instante ISO en el que venció el deadline del foco. */
  completedAt: string;
}

export interface PomodoroTimerState {
  phase: PomodoroPhase;
  status: PomodoroStatus;
  /** Deadline absoluto en epoch ms. Solo existe mientras el timer corre. */
  deadline: number | null;
  /** Tiempo restante congelado al pausar o al iniciar un ciclo. */
  remainingSeconds: number;
  /** Número del siguiente ciclo de enfoque. */
  cycleId: number;
}

export interface PomodoroState {
  version: 2;
  sessions: PomodoroSession[];
  timer: PomodoroTimerState;
}

export function durationForPhase(
  phase: PomodoroPhase,
  durations: PomodoroDurations = DEFAULT_POMODORO_DURATIONS,
): number {
  return phase === "focus" ? durations.focusSeconds : durations.breakSeconds;
}

export function createPomodoroState(
  durations: PomodoroDurations = DEFAULT_POMODORO_DURATIONS,
): PomodoroState {
  return {
    version: 2,
    sessions: [],
    timer: {
      phase: "focus",
      status: "idle",
      deadline: null,
      remainingSeconds: durations.focusSeconds,
      cycleId: 1,
    },
  };
}

/** Tiempo visible derivado del deadline; durante una pausa usa el valor congelado. */
export function remainingPomodoroSeconds(
  state: PomodoroState,
  now: number,
): number {
  const { timer } = state;
  if (timer.status === "running" && timer.deadline !== null) {
    return Math.max(0, Math.ceil((timer.deadline - now) / 1000));
  }
  return Math.max(0, timer.remainingSeconds);
}

export function startPomodoro(
  state: PomodoroState,
  now: number,
  durations: PomodoroDurations = DEFAULT_POMODORO_DURATIONS,
): PomodoroState {
  if (state.timer.status === "running") return state;

  const remainingSeconds =
    state.timer.status === "paused"
      ? state.timer.remainingSeconds
      : durationForPhase(state.timer.phase, durations);

  return {
    ...state,
    timer: {
      ...state.timer,
      status: "running",
      deadline: now + remainingSeconds * 1000,
      remainingSeconds,
    },
  };
}

export function pausePomodoro(
  state: PomodoroState,
  now: number,
): PomodoroState {
  if (state.timer.status !== "running" || state.timer.deadline === null) {
    return state;
  }

  const remainingSeconds = Math.max(
    0,
    Math.ceil((state.timer.deadline - now) / 1000),
  );

  return {
    ...state,
    timer: {
      ...state.timer,
      status: "paused",
      deadline: null,
      remainingSeconds,
    },
  };
}

export function resetPomodoro(
  state: PomodoroState,
  durations: PomodoroDurations = DEFAULT_POMODORO_DURATIONS,
): PomodoroState {
  return {
    ...state,
    timer: {
      ...state.timer,
      phase: "focus",
      status: "idle",
      deadline: null,
      remainingSeconds: durations.focusSeconds,
    },
  };
}

/**
 * Avanza el estado hasta el instante indicado. Al vencer un deadline cambia
 * de fase y, en el caso del foco, añade la sesión en la misma transición.
 *
 * Si la aplicación estuvo cerrada o en segundo plano durante varios ciclos,
 * se procesa únicamente el foco que venció: después el siguiente ciclo comienza
 * desde `now`. Esto evita inventar sesiones que el usuario no llegó a hacer.
 */
export function advancePomodoro(
  state: PomodoroState,
  now: number,
  durations: PomodoroDurations = DEFAULT_POMODORO_DURATIONS,
): PomodoroState {
  const { timer } = state;
  if (timer.status !== "running" || timer.deadline === null) return state;

  const secondsLeft = Math.max(0, Math.ceil((timer.deadline - now) / 1000));
  if (secondsLeft > 0) return state;

  if (timer.phase === "focus") {
    const sessionId = `focus-${timer.cycleId}`;
    const completedAt = new Date(timer.deadline).toISOString();
    const sessions = state.sessions.some((session) => session.id === sessionId)
      ? state.sessions
      : [
          ...state.sessions,
          {
            id: sessionId,
            date: localDateKey(new Date(timer.deadline)),
            completedAt,
          },
        ];

    return {
      ...state,
      sessions,
      timer: {
        phase: "break",
        status: "running",
        deadline: now + durations.breakSeconds * 1000,
        remainingSeconds: durations.breakSeconds,
        cycleId: timer.cycleId + 1,
      },
    };
  }

  return {
    ...state,
    timer: {
      ...timer,
      phase: "focus",
      deadline: now + durations.focusSeconds * 1000,
      remainingSeconds: durations.focusSeconds,
    },
  };
}

/** Fecha local YYYY-MM-DD (sin depender de la zona UTC). */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
