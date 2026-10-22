import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Cinzel,
  Cormorant_Garamond,
  Inter,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
  Public_Sans,
} from "next/font/google";
import "./globals.css";

import { SiteLoader } from "@/components/loader/site-loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { churchIdentity } from "@/lib/church";

// Each face has one job:
//   Plus Jakarta Sans  headings — modern, compact, holds tight tracking well
//   Inter              everything you read and click
//   Cinzel             the KMMI wordmark only; it is a display face of
//                      inscriptional capitals and turns to noise at body sizes
//   Cormorant Garamond scripture, in italic — the one place the page speaks
//                      in a voice other than its own
//   JetBrains Mono     code-like strings only; figures are tabular in the text face
//
// The member portal has its own pair, scoped to its shell (`.app-ui`):
//   Bricolage Grotesque page titles and headline figures — warm, a little
//                       unexpected, and with optical sizes that keep big
//                       numbers tight
//   Public Sans         everything else: plain, very legible at 13–14 px, and
//                       with true tabular figures so money lines up in columns
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

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
    default: `${churchIdentity.shortName} — ${churchIdentity.name}`,
    template: `%s — ${churchIdentity.name}`,
  },
  description: churchIdentity.description,
  // The installable app (src/app/manifest.ts), and its icon on iPhones, which
  // read the touch icon rather than the manifest.
  appleWebApp: { capable: true, title: "KMMI", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

/** The browser chrome in the church's blue on phones that tint it. */
export const viewport: Viewport = { themeColor: "#1a3fcc" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} ${cinzel.variable} ${cormorant.variable} ${jetBrainsMono.variable} ${bricolage.variable} ${publicSans.variable} h-full antialiased`}
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
