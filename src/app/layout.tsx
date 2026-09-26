import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatWidget } from "@/components/ChatWidget";
import { CartProvider } from "@/lib/cart-context";
import { ThemeProvider } from "@/lib/theme";
import { getSiteSettings } from "@/lib/settings";
import { getMenu } from "@/lib/menu";
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
    "ALBIZIA, moda premium. Camisetas e moda praia de alto padrão. Silence becomes style.",
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

// Roda antes da primeira pintura, direto do relógio local de quem acessa (a
// loja fica clara de dia e escura à noite, sem consultar fuso: o navegador já
// sabe). Dentro do /admin, respeita a preferência salva pelo seletor do
// painel. Sem este script, escolher "escuro" ainda daria um flash de tela
// branca a cada carregamento, que é justamente o que incomoda.
const THEME_INIT_SCRIPT = `(function(){try{var p=location.pathname,f=null;try{f=localStorage.getItem('albizia-admin-theme')}catch(e){}var t;if((p==='/admin'||p.indexOf('/admin/')===0)&&(f==='dark'||f==='light')){t=f}else{var h=new Date().getHours();t=(h>=18||h<6)?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [settings, menu] = await Promise.all([getSiteSettings(), getMenu()]);
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
            <Header menu={menu} />
            <main className="flex-1">{children}</main>
            <Footer settings={settings} />
            <CartDrawer />
            <CookieConsent />
            <ChatWidget />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
