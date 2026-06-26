import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://buscarayudavenezuela.com"),
  title: {
    default: "Buscar Ayuda Venezuela",
    template: "%s | Buscar Ayuda Venezuela",
  },
  description:
    "Mapa colaborativo para encontrar centros de acopio y puntos de entrega de ayuda en Venezuela.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Buscar Ayuda Venezuela",
    description:
      "Encuentra y comparte centros de acopio y puntos de entrega de ayuda en Venezuela.",
    url: "https://buscarayudavenezuela.com",
    siteName: "Buscar Ayuda Venezuela",
    locale: "es_VE",
    type: "website",
    images: [
      {
        url: "/social-preview.png",
        width: 1730,
        height: 909,
        alt: "Mapa de Venezuela con puntos de ayuda y centros de acopio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buscar Ayuda Venezuela",
    description:
      "Mapa colaborativo para encontrar centros de acopio y puntos de entrega de ayuda en Venezuela.",
    images: ["/social-preview.png"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
