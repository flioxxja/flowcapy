import { FlowCapyWorkbench } from "@/components/flowcapy-workbench";
import { FLOWCAPY_META, getSiteUrl } from "@/lib/seo";

export default function HomePage() {
  const siteUrl = getSiteUrl().toString();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: FLOWCAPY_META.name,
    url: siteUrl,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    inLanguage: "es",
    description: FLOWCAPY_META.description,
    featureList: [
      "Gestor de tareas local-first con prioridad automática Eisenhower",
      "Matriz Eisenhower 2x2 interactiva",
      "Temporizador Pomodoro 25/5 con Modo Zen pantalla completa",
      "Paisajes sonoros generativos con Web Audio API",
      "Mapa de calor de rachas de 28 días y respaldo JSON/Markdown",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FlowCapyWorkbench />
    </>
  );
}
