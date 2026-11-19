import { expect, test, type Page } from "@playwright/test";

const CURRENT_STORAGE_KEY = "flowcapy.pomodoro.v2";
const LEGACY_STORAGE_KEY = "flowcapy.pomodoro.v1";
const FIXED_TIME = new Date("2026-07-17T12:00:00.000Z");
const INITIAL_TIME = new Date("2026-07-17T11:59:00.000Z");

function pomodoroSection(page: Page) {
  return page.locator('section[aria-labelledby="pomodoro-title"]');
}

async function openFreshApp(page: Page) {
  await page.clock.install({ time: INITIAL_TIME });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await page.clock.pauseAt(FIXED_TIME);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pomodoro" })).toBeVisible();
}

async function addTask(
  page: Page,
  title: string,
  urgency: "alta" | "media" | "baja",
  importance: "alta" | "media" | "baja",
) {
  await page.locator("#new-task-title").fill(title);
  await page.locator("#new-task-urgency").selectOption(urgency);
  await page.locator("#new-task-importance").selectOption(importance);
  await page.getByRole("button", { name: "Añadir tarea" }).click();
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page);
});

test("inicia, pausa, reanuda y reinicia sin perder segundos", async ({ page }) => {
  const pomodoro = pomodoroSection(page);
  const timer = pomodoro.getByRole("timer");

  await expect(timer).toHaveText("25:00");
  await pomodoro.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(pomodoro.getByRole("button", { name: "Pausar" })).toBeVisible();

  await page.clock.fastForward(1_000);
  await expect(timer).toHaveText("24:59");

  await pomodoro.getByRole("button", { name: "Pausar" }).click();
  await expect(pomodoro.getByRole("button", { name: "Reanudar" })).toBeVisible();
  await page.clock.fastForward(5_000);
  await expect(timer).toHaveText("24:59");

  await pomodoro.getByRole("button", { name: "Reanudar" }).click();
  await page.clock.fastForward(1_000);
  await expect(timer).toHaveText("24:58");

  await pomodoro.getByRole("button", { name: "Reiniciar" }).click();
  await expect(timer).toHaveText("25:00");
  await expect(pomodoro.getByRole("button", { name: "Iniciar", exact: true })).toBeVisible();
});

test("completa el foco, incrementa el contador y conserva un snapshot atómico", async ({
  page,
}) => {
  const pomodoro = pomodoroSection(page);
  const timer = pomodoro.getByRole("timer");

  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    const testWindow = window as Window & { __pomodoroWrites?: string[] };
    testWindow.__pomodoroWrites = [];
    Storage.prototype.setItem = function (key: string, value: string) {
      testWindow.__pomodoroWrites?.push(key);
      originalSetItem.call(this, key, value);
    };
  });

  await pomodoro.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.evaluate(() => {
    const testWindow = window as Window & { __pomodoroWrites?: string[] };
    testWindow.__pomodoroWrites = [];
  });
  await page.clock.fastForward("25:01");

  await expect(timer).toHaveText("05:00");
  await expect(pomodoro.getByRole("progressbar")).toHaveAttribute(
    "aria-label",
    "Progreso de descanso",
  );
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();

  const snapshot = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, CURRENT_STORAGE_KEY);

  expect(snapshot).toMatchObject({
    version: 2,
    timer: {
      phase: "break",
      status: "running",
    },
  });
  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.sessions[0]).toMatchObject({
    id: "focus-1",
    date: "2026-07-17",
  });
  expect(
    await page.evaluate(
      () =>
        (
          window as Window & { __pomodoroWrites?: string[] }
        ).__pomodoroWrites,
    ),
  ).toEqual([CURRENT_STORAGE_KEY]);

  await page.reload();
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();
  await expect(timer).toHaveText("05:00");

  await page.clock.fastForward("05:01");
  await expect(timer).toHaveText("25:00");
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();

  await page.reload();
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();
});

test("reanuda tras recargar a mitad de sesión y cuenta el foco una sola vez", async ({
  page,
}) => {
  const pomodoro = pomodoroSection(page);
  const timer = pomodoro.getByRole("timer");

  await pomodoro.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.fastForward(5_000);
  await expect(timer).toHaveText("24:55");

  await page.reload();
  await expect(timer).toHaveText("24:55");
  await expect(pomodoro.getByRole("button", { name: "Pausar" })).toBeVisible();

  await page.clock.fastForward("24:55");
  await expect(timer).toHaveText("05:00");
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();

  await page.reload();
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();
  await expect(timer).toHaveText("05:00");
});

test("migra el array legacy sin perder las sesiones válidas", async ({ page }) => {
  await page.evaluate((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify([
        { date: "2026-07-17", completedAt: "2026-07-17T11:00:00.000Z" },
        { date: "not-a-date", completedAt: "invalid" },
      ]),
    );
  }, LEGACY_STORAGE_KEY);

  await page.addInitScript(() => {
    const operations: string[] = [];
    const testWindow = window as Window & {
      __pomodoroStorageOperations?: string[];
    };
    testWindow.__pomodoroStorageOperations = operations;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      operations.push(`set:${key}`);
      originalSetItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function (key: string) {
      operations.push(`remove:${key}`);
      originalRemoveItem.call(this, key);
    };
  });
  await page.reload();

  const pomodoro = pomodoroSection(page);
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();

  const migrated = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, CURRENT_STORAGE_KEY);
  expect(migrated?.version).toBe(2);
  expect(migrated?.sessions).toHaveLength(1);
  expect(migrated?.sessions[0]).toMatchObject({
    id: "legacy-1",
    date: "2026-07-17",
  });
  expect(
    await page.evaluate(
      () =>
        (
          window as Window & { __pomodoroStorageOperations?: string[] }
        ).__pomodoroStorageOperations,
    ),
  ).toEqual([
    `set:${CURRENT_STORAGE_KEY}`,
    `remove:${LEGACY_STORAGE_KEY}`,
  ]);
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), LEGACY_STORAGE_KEY),
  ).toBeNull();
});

test("si no se puede limpiar el legacy tras migrar, conserva ambos y avisa", async ({
  page,
}) => {
  await page.evaluate((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify([
        { date: "2026-07-17", completedAt: "2026-07-17T11:00:00.000Z" },
      ]),
    );
  }, LEGACY_STORAGE_KEY);
  await page.addInitScript(() => {
    Storage.prototype.removeItem = () => {
      throw new DOMException("Limpieza bloqueada", "SecurityError");
    };
  });
  await page.reload();

  const pomodoro = pomodoroSection(page);
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();
  await expect(pomodoro.getByTestId("pomodoro-storage-warning")).toContainText(
    "no se pudo limpiar el almacenamiento anterior",
  );
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), CURRENT_STORAGE_KEY),
  ).not.toBeNull();
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), LEGACY_STORAGE_KEY),
  ).not.toBeNull();
});

test("si la migración no puede escribirse, conserva el legacy y avisa", async ({
  page,
}) => {
  await page.evaluate((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify([
        { date: "2026-07-17", completedAt: "2026-07-17T11:00:00.000Z" },
      ]),
    );
  }, LEGACY_STORAGE_KEY);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Cuota agotada", "QuotaExceededError");
    };
  });
  await page.reload();

  const pomodoro = pomodoroSection(page);
  await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*1/)).toBeVisible();
  await expect(pomodoro.getByTestId("pomodoro-storage-warning")).toContainText(
    "almacenamiento del Pomodoro está lleno",
  );
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), CURRENT_STORAGE_KEY),
  ).toBeNull();
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), LEGACY_STORAGE_KEY),
  ).not.toBeNull();
});

test("snapshots corruptos o estructuralmente inválidos vuelven al estado seguro", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const invalidSnapshots = [
    "{not-valid-json",
    JSON.stringify({
      version: 2,
      sessions: [],
      timer: {
        phase: "focus",
        status: "running",
        deadline: null,
        remainingSeconds: 1500,
        cycleId: 1,
      },
    }),
  ];

  for (const snapshot of invalidSnapshots) {
    await page.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: CURRENT_STORAGE_KEY, value: snapshot },
    );
    await page.reload();

    const pomodoro = pomodoroSection(page);
    await expect(pomodoro.getByRole("timer")).toHaveText("25:00");
    await expect(pomodoro.getByText(/Sesiones completadas hoy:\s*0/)).toBeVisible();
    await expect(pomodoro.getByTestId("pomodoro-storage-warning")).toContainText(
      "dañado",
    );
  }
  expect(errors).toEqual([]);
});

test("un localStorage bloqueado permite usar el timer en memoria", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Storage bloqueado", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage bloqueado", "SecurityError");
    };
  });
  await page.reload();

  const pomodoro = pomodoroSection(page);
  await expect(pomodoro.getByRole("timer")).toHaveText("25:00");
  await pomodoro.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.fastForward(1_000);
  await expect(pomodoro.getByRole("timer")).toHaveText("24:59");
  await expect(
    pomodoro.getByTestId("pomodoro-storage-warning"),
  ).toContainText("almacenamiento local no está disponible");
  expect(errors).toEqual([]);
});

test("una cuota llena no interrumpe el timer", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Cuota agotada", "QuotaExceededError");
    };
  });
  await page.reload();

  const pomodoro = pomodoroSection(page);
  await pomodoro.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.fastForward(1_000);
  await expect(pomodoro.getByRole("timer")).toHaveText("24:59");
  await expect(
    pomodoro.getByTestId("pomodoro-storage-warning"),
  ).toContainText("almacenamiento del Pomodoro está lleno");
  expect(errors).toEqual([]);
});

test("anuncia cambios solo en fronteras de minuto y fase", async ({ page }) => {
  const pomodoro = pomodoroSection(page);
  const announcement = pomodoro.getByTestId("pomodoro-announcement");

  await pomodoro.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(announcement).toHaveText("Enfoque: 25 minutos restantes");

  await page.clock.fastForward(1_000);
  await expect(announcement).toHaveText("Enfoque: 25 minutos restantes");

  await page.clock.fastForward(59_000);
  await expect(announcement).toHaveText("Enfoque: 24 minutos restantes");

  await page.clock.fastForward("25:00");
  await expect(announcement).toHaveText("Descanso: 5 minutos restantes");
});

test("permite operar con teclado y muestra un foco visible", async ({ page }) => {
  const pomodoro = pomodoroSection(page);
  const startButton = pomodoro.getByRole("button", { name: "Iniciar", exact: true });

  await startButton.focus();
  await expect(startButton).toBeFocused();
  const outline = await startButton.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      style: styles.outlineStyle,
      width: Number.parseFloat(styles.outlineWidth),
    };
  });
  expect(outline.style).toBe("solid");
  expect(outline.width).toBeGreaterThanOrEqual(2);

  await page.keyboard.press("Enter");
  await expect(pomodoro.getByRole("button", { name: "Pausar" })).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(pomodoro.getByRole("button", { name: "Reiniciar" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(pomodoro.getByRole("timer")).toHaveText("25:00");
});

test("mantiene la regresión de prioridad y persistencia de tareas", async ({ page }) => {
  await addTask(page, "Tarea P4", "baja", "baja");
  await addTask(page, "Tarea P3", "media", "media");
  await addTask(page, "Tarea P2", "alta", "media");
  await addTask(page, "Tarea P1", "alta", "alta");

  const pending = page.locator('ul[aria-label="Tareas pendientes por prioridad"]');
  const badges = pending.locator("li > span[title^='Prioridad']");
  await expect(badges).toHaveText([
    "P1 · Alta",
    "P2 · Alta",
    "P3 · Media",
    "P4 · Baja",
  ]);
  expect(
    await badges.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("title")),
    ),
  ).toEqual([
    "Prioridad P1 (Alta) — urgencia alta, importancia alta",
    "Prioridad P2 (Alta) — urgencia alta, importancia media",
    "Prioridad P3 (Media) — urgencia media, importancia media",
    "Prioridad P4 (Baja) — urgencia baja, importancia baja",
  ]);

  await page.reload();
  await expect(pending.getByText("Tarea P1", { exact: true })).toBeVisible();
});
