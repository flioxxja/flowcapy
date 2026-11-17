/**
 * FlowCapy — scaffold (prompts 5–8).
 * Estructura de la página única: header + lista de tareas + Pomodoro + rachas.
 * Las secciones son placeholders honestos (estados vacíos, sin datos falsos);
 * la funcionalidad real se conecta en los ciclos de construcción (prompts 9–38).
 */
export default function Home() {
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
          Aún no hay tareas. Aquí aparecerán ordenadas por prioridad
          (Eisenhower: urgencia + importancia).
        </p>
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
