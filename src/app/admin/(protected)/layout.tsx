import { requireAdmin } from "@/lib/auth/dal";
import { contarErrosGraves } from "@/lib/erros";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { countRecoveryQueue } from "@/lib/recovery";
import { contarNaoLidos } from "@/lib/emails";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { AdminNav } from "./AdminNav";
import { NovaVersaoAviso } from "./NovaVersaoAviso";
import { TourPainel } from "./TourPainel";
import { AvisosPainel } from "./AvisosPainel";
import { ErrosNavegador } from "./ErrosNavegador";
import { pendentesDe, socioPorEmail } from "@/lib/aprovacao";
import { pushDisponivel } from "@/lib/push";
import { contasAPagar } from "@/lib/financeiro";
import { isoDay } from "@/lib/format";
import { demoAtivo } from "@/lib/demo";
import Link from "next/link";

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
  const eu = await socioPorEmail(user.email).catch(() => null);
  const hoje = isoDay(new Date());
  const [recuperacao, emailsNaoLidos, aprovar, minhasContas, demo] = await Promise.all([
    countRecoveryQueue().catch(() => ({ total: 0, valorCents: 0, ultimo: null as string | null })),
    contarNaoLidos().catch(() => 0),
    eu ? pendentesDe(eu.id).then((l) => l.length).catch(() => 0) : 0,
    // Partes DESTE sócio que vencem hoje ou já venceram e não foram pagas.
    eu
      ? contasAPagar()
          .then((cs) => cs.filter((c) => c.socioId === eu.id && c.vencimento <= hoje))
          .catch(() => [])
      : [],
    demoAtivo(),
  ]);
  const errosGraves = await contarErrosGraves();
  // Avaliações esperando aprovação: número no menu até alguém aprovar ou rejeitar.
  const [avaliacoes] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.status, "pending"))
    .catch(() => [{ n: 0 }]);

  return (
    <div className="painel min-h-screen bg-surface text-content md:flex">
      <AdminNav
        email={user.email}
        alertas={recuperacao.total}
        recuperacaoUltimo={recuperacao.ultimo}
        emails={emailsNaoLidos}
        aprovar={aprovar}
        avaliacoes={avaliacoes?.n ?? 0}
        errosGraves={errosGraves}
      />
      <NovaVersaoAviso />
      <ErrosNavegador />
      <TourPainel />
      <div className="flex min-h-screen flex-1 flex-col">
        {demo && (
          // Impossível não ver: dado de exemplo nunca pode ser confundido com venda real.
          <Link
            href="/admin/demonstracao"
            className="block bg-content px-4 py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-surface"
          >
            Dados de exemplo no painel: nada disso é real · Apagar exemplo
          </Link>
        )}
        <AvisosPainel
          pendentes={aprovar}
          pushPronto={pushDisponivel()}
          contas={{ n: minhasContas.length, totalCents: minhasContas.reduce((n, c) => n + c.valorCents, 0) }}
        />
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
