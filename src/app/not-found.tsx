import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenido-principal" className="min-h-dvh flex items-center justify-center bg-[#06070a] px-6 py-16 text-[#f5f3ef]">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0d12] p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#e8a94e]">Error 404</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-white">Página no encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Esta ruta no existe en FlowCapy. Regresa a tu centro de enfoque diario.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#06070a] transition hover:bg-[#f7d794]"
        >
          Volver a FlowCapy
        </Link>
      </section>
    </main>
  );
}
