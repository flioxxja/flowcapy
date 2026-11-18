import { expect, test } from "@playwright/test";

import {
  advancePomodoro,
  createPomodoroState,
  localDateKey,
  pausePomodoro,
  remainingPomodoroSeconds,
  resetPomodoro,
  startPomodoro,
  type PomodoroDurations,
} from "../src/lib/pomodoro-engine";

const shortDurations: PomodoroDurations = {
  focusSeconds: 2,
  breakSeconds: 1,
};

test.describe("motor determinista de Pomodoro", () => {
  test("completa un foco corto una sola vez y cambia a descanso", () => {
    let state = createPomodoroState(shortDurations);
    state = startPomodoro(state, 1_000, shortDurations);

    state = advancePomodoro(state, 2_999, shortDurations);
    expect(state.sessions).toHaveLength(0);
    expect(state.timer.phase).toBe("focus");

    state = advancePomodoro(state, 3_000, shortDurations);
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]).toMatchObject({
      id: "focus-1",
      date: localDateKey(new Date(3_000)),
    });
    expect(state.timer.phase).toBe("break");
    expect(state.timer.status).toBe("running");
    expect(remainingPomodoroSeconds(state, 3_000)).toBe(1);
  });

  test("la expiración repetida nunca duplica la sesión", () => {
    let state = createPomodoroState(shortDurations);
    state = startPomodoro(state, 1_000, shortDurations);
    state = advancePomodoro(state, 3_000, shortDurations);

    const persistedState = state;
    state = advancePomodoro(state, 3_000, shortDurations);
    state = advancePomodoro(state, 4_000, shortDurations);
    state = advancePomodoro(persistedState, 3_000, shortDurations);

    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe("focus-1");
  });

  test("pausa congela el deadline y reanuda desde el tiempo restante", () => {
    let state = createPomodoroState(shortDurations);
    state = startPomodoro(state, 1_000, shortDurations);
    state = pausePomodoro(state, 2_500);

    expect(state.timer.status).toBe("paused");
    expect(state.timer.deadline).toBeNull();
    expect(remainingPomodoroSeconds(state, 99_000)).toBe(1);

    state = startPomodoro(state, 10_000, shortDurations);
    expect(state.timer.status).toBe("running");
    expect(state.timer.deadline).toBe(11_000);
  });

  test("reiniciar conserva el ciclo y no reutiliza un foco completado", () => {
    let state = createPomodoroState(shortDurations);
    state = startPomodoro(state, 1_000, shortDurations);
    state = advancePomodoro(state, 3_000, shortDurations);

    state = resetPomodoro(state, shortDurations);
    expect(state.timer).toMatchObject({
      phase: "focus",
      status: "idle",
      cycleId: 2,
    });

    state = startPomodoro(state, 4_000, shortDurations);
    state = advancePomodoro(state, 6_000, shortDurations);
    expect(state.sessions.map((session) => session.id)).toEqual([
      "focus-1",
      "focus-2",
    ]);
  });

  test("un elapsed largo de fondo completa solo el foco vencido", () => {
    let state = createPomodoroState(shortDurations);
    state = startPomodoro(state, 1_000, shortDurations);

    state = advancePomodoro(state, 120_000, shortDurations);

    expect(state.sessions).toHaveLength(1);
    expect(state.timer.phase).toBe("break");
    expect(state.timer.status).toBe("running");
  });
});
