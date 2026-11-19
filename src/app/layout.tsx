import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans, Instrument_Serif, Space_Grotesk } from "next/font/google";
import { FLOWCAPY_META, getSiteUrl } from "@/lib/seo";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-code",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  themeColor: "#06070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: FLOWCAPY_META.title,
    template: "%s · FlowCapy",
  },
  description: FLOWCAPY_META.description,
  applicationName: FLOWCAPY_META.name,
  keywords: [...FLOWCAPY_META.keywords],
  category: "productivity",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: FLOWCAPY_META.locale,
    url: "/",
    siteName: FLOWCAPY_META.name,
    title: FLOWCAPY_META.title,
    description: FLOWCAPY_META.description,
  },
  twitter: {
    card: "summary_large_image",
    title: FLOWCAPY_META.title,
    description: FLOWCAPY_META.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${instrumentSerif.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a href="#contenido-principal" className="skip-link">
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
