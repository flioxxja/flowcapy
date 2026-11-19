import type { MetadataRoute } from "next";
import { FLOWCAPY_META } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: FLOWCAPY_META.title,
    short_name: FLOWCAPY_META.name,
    description: FLOWCAPY_META.description,
    start_url: "/",
    display: "standalone",
    background_color: "#06070a",
    theme_color: "#06070a",
    lang: "es",
  };
}
