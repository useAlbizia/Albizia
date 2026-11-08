import type { Metadata } from "next";

// O painel como aplicativo instalável, sem loja: no iPhone pelo "Adicionar à
// Tela de Início" do Safari, no Android pelo "Instalar app" do Chrome, no
// computador pelo ícone na barra de endereço. Vale para o login também,
// porque é ali que a pessoa costuma estar quando instala.
//
// O manifesto só existe dentro de /admin: a loja continua sendo um site
// normal para o cliente, e o atalho instalado abre direto no painel.
export const metadata: Metadata = {
  manifest: "/painel.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ALBIZIA",
    statusBarStyle: "black",
  },
  // Painel nunca aparece no Google.
  robots: { index: false, follow: false },
};

export default function AdminRaizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
