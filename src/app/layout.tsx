import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { CookieConsent } from "@/components/CookieConsent";
import { CartProvider } from "@/lib/cart-context";
import { ThemeProvider } from "@/lib/theme";
import { getSiteSettings } from "@/lib/settings";
import { Tracker } from "@/components/Tracker";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ALBIZIA",
    template: "%s",
  },
  description:
    "ALBIZIA — moda premium. Camisetas e moda praia de alto padrão. Silence becomes style.",
  keywords: ["ALBIZIA", "moda premium", "camisetas", "moda praia", "luxo silencioso"],
  openGraph: {
    type: "website",
    siteName: "ALBIZIA",
    title: "ALBIZIA",
    description: "Moda premium. Silence becomes style.",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ALBIZIA",
    description: "Moda premium. Silence becomes style.",
  },
};

// Runs before paint, straight from each visitor's own local clock — no
// timezone lookups needed, the browser already knows. Sets the theme
// attribute early so the page never flashes the wrong one.
const THEME_INIT_SCRIPT = `(function(){try{var h=new Date().getHours();var t=(h>=18||h<6)?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-surface text-content">
        <ThemeProvider>
          <CartProvider>
            <Tracker />
            {settings.announcementActive && (
              <AnnouncementBar text={settings.announcementText} />
            )}
            <Header />
            <main className="flex-1">{children}</main>
            <Footer settings={settings} />
            <CartDrawer />
            <CookieConsent />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
