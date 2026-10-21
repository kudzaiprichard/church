import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { SiteLoader } from "@/components/loader/site-loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { church } from "@/lib/church";

// Each face has one job:
//   Plus Jakarta Sans  headings — modern, compact, holds tight tracking well
//   Inter              everything you read and click
//   Cinzel             the KMMI wordmark only; it is a display face of
//                      inscriptional capitals and turns to noise at body sizes
//   Cormorant Garamond scripture, in italic — the one place the page speaks
//                      in a voice other than its own
//   JetBrains Mono     figures (times, dates, giving, attendance)
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${church.shortName} — ${church.name}`,
    template: `%s — ${church.name}`,
  },
  description: church.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} ${cinzel.variable} ${cormorant.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>

        {/* Last in the body, but fixed and above everything, so it covers the
            page without being in its layout flow. Outside ThemeProvider
            because it must not wait on a Client Component to mount. */}
        <SiteLoader />
      </body>
    </html>
  );
}
