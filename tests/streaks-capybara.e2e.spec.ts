import { expect, test, type Page } from "@playwright/test";

const STREAK_KEY = "flowcapy.streak.days.v1";

function streaksSection(page: Page) {
  return page.locator('section[aria-labelledby="streaks-title"]');
}

async function openFreshApp(page: Page) {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rachas" })).toBeVisible();
}

/** Siembra días relativos a hoy (0 = hoy, -1 = ayer), con las fechas de la
 * página (el contexto Playwright usa UTC) para no mezclar zonas horarias. */
async function seedDays(page: Page, offsets: number[]) {
  await page.evaluate(
    ({ key, offs }) => {
      const keys: string[] = offs.map((off) => {
        const d = new Date();
        d.setDate(d.getDate() + off);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      });
      window.localStorage.setItem(key, JSON.stringify(keys));
    },
    { key: STREAK_KEY, offs: offsets },
  );
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page);
});

test("muestra la racha sembrada (ayer + hoy = 2)", async ({ page }) => {
  await seedDays(page, [-1, 0]);
  await expect(streaksSection(page)).toContainText("Racha actual: 2 días");
});

test("completar una tarea registra hoy y persiste tras recargar", async ({
  page,
}) => {
  const section = streaksSection(page);
  await expect(section).toContainText("Racha actual: 0 días");

  await page.locator("#new-task-title").fill("Tarea de racha");
  await page.getByRole("button", { name: "Añadir tarea" }).click();
  await page
    .getByRole("checkbox", { name: /Marcar como completada: Tarea de racha/ })
    .click();

  await expect(section).toContainText("Racha actual: 1 día");

  await page.reload();
  await expect(section).toContainText("Racha actual: 1 día");

  // Descompletar la única tarea del día NO borra el día ya registrado.
  await page
    .getByRole("checkbox", { name: /Marcar como pendiente: Tarea de racha/ })
    .click();
  await expect(section).toContainText("Racha actual: 1 día");
});

test("3 clics en el logo revelan el capibara; recargar lo esconde", async ({
  page,
}) => {
  const logo = page.getByRole("button", { name: "FlowCapy — inicio" });
  const capybara = page.getByRole("img", { name: "Capibara" });

  await expect(capybara).toHaveCount(0);
  await logo.click();
  await logo.click();
  await expect(capybara).toHaveCount(0);
  await logo.click();
  await expect(capybara).toBeVisible();

  await page.reload();
  await expect(capybara).toHaveCount(0);
});

test("el logo se activa por teclado (Enter, 3 veces)", async ({ page }) => {
  const logo = page.getByRole("button", { name: "FlowCapy — inicio" });
  await logo.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("img", { name: "Capibara" })).toBeVisible();
});

test("el Pomodoro y el gestor de tareas siguen funcionando", async ({ page }) => {
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await page.locator("#new-task-title").fill("Tarea de control");
  await page.getByRole("button", { name: "Añadir tarea" }).click();
  await expect(page.getByText("Tarea de control", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
});
