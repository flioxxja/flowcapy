"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ reset }: ErrorProps) {
  return (
    <main id="contenido-principal" className="min-h-dvh flex items-center justify-center bg-[#06070a] px-6 py-16 text-[#f5f3ef]">
      <section role="alert" className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-[#0b0d12] p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-rose-300">Interrupción local</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-white">Algo falló al renderizar</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Tus tareas, sesiones Pomodoro y rachas siguen guardadas en el navegador. Puedes reintentar ahora.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#e8a94e] px-5 py-2.5 text-sm font-semibold text-[#06070a] transition hover:opacity-90"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
