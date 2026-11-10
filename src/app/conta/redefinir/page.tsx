import { RecoveryGate } from "@/components/auth/RecoveryGate";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata = { title: "Nova senha · ALBIZIA" };

// Mesmo motivo da tela do painel: o link é trocado por sessão no navegador
// (RecoveryGate), nunca aqui no servidor, onde a sessão se perdia e salvar a
// senha dava "link expirado".
export default function RedefinirContaPage() {
  return (
    <section className="mx-auto max-w-sm px-6 py-20">
      <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Nova senha
      </h1>

      <RecoveryGate servidorOk={false} linkAjuda={{ href: "/conta", texto: "minha conta" }}>
        <SetPasswordForm />
      </RecoveryGate>
    </section>
  );
}
