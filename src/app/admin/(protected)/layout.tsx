import { requireAdmin } from "@/lib/auth/dal";
import { countRecoveryQueue } from "@/lib/recovery";
import { contarNaoLidos } from "@/lib/emails";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { AdminNav } from "./AdminNav";
import { NovaVersaoAviso } from "./NovaVersaoAviso";
import { TourPainel } from "./TourPainel";
import { AvisosPainel } from "./AvisosPainel";
import { pendentesDe, socioPorEmail } from "@/lib/aprovacao";
import { pushDisponivel } from "@/lib/push";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  if (user.user_metadata?.must_change_password) {
    return (
      <div className="min-h-screen bg-surface text-content">
        <ChangePasswordForm />
      </div>
    );
  }

  // Contagem de venda parada, para o aviso no menu aparecer em qualquer
  // página do admin e não só quando alguém lembra de abrir a fila.
  // E quantos lançamentos esperam o voto DESTE sócio: vira faixa no topo de
  // todas as telas, número no menu e número no ícone do aplicativo.
  const [recuperacao, emailsNaoLidos, aprovar] = await Promise.all([
    countRecoveryQueue().catch(() => ({ total: 0, valorCents: 0 })),
    contarNaoLidos().catch(() => 0),
    socioPorEmail(user.email)
      .then((s) => (s ? pendentesDe(s.id) : []))
      .then((l) => l.length)
      .catch(() => 0),
  ]);

  return (
    <div className="min-h-screen bg-surface text-content md:flex">
      <AdminNav email={user.email} alertas={recuperacao.total} emails={emailsNaoLidos} aprovar={aprovar} />
      <NovaVersaoAviso />
      <TourPainel />
      <div className="flex min-h-screen flex-1 flex-col">
        <AvisosPainel pendentes={aprovar} pushPronto={pushDisponivel()} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
        <footer className="border-t border-content/10 px-6 py-6">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1 text-[11px] text-content/40 sm:flex-row">
            <span className="uppercase tracking-[0.3em]">ALBIZIA</span>
            <span>Painel administrativo · © {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
