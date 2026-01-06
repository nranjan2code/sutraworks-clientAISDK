import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Sutraworks Client AI SDK | BYOK Architecture for Browser AI",
  description:
    "The universal client-side AI SDK with BYOK (Bring Your Own Key) architecture. One SDK, 12+ providers, zero server trust. Your keys stay on your device.",
  keywords: [
    "AI SDK",
    "BYOK",
    "Bring Your Own Key",
    "OpenAI",
    "Anthropic",
    "Claude",
    "Gemini",
    "client-side AI",
    "browser AI",
    "TypeScript",
  ],
  authors: [{ name: "Sutraworks" }],
  openGraph: {
    title: "Sutraworks Client AI SDK",
    description: "One SDK. 12+ Providers. Zero server trust. Your keys stay on your device.",
    url: "https://byok.sutraworks.ai",
    siteName: "Sutraworks BYOK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sutraworks Client AI SDK",
    description: "The universal client-side AI SDK with BYOK architecture",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <div className="animated-bg" />
        {children}
      </body>
    </html>
  );
}
