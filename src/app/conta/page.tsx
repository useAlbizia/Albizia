import Link from "next/link";
import { getSessionUser } from "@/lib/auth/dal";
import { isAdminUser } from "@/lib/auth/admins";
import { getCustomerOrders } from "@/lib/orders";
import { customerSignOut } from "@/lib/customer/actions";
import { brl, shortDate } from "@/lib/format";
import { CustomerAuth } from "./CustomerAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta · ALBIZIA" };

// Avisos de links que voltaram para cá sem dar certo.
const AVISOS: Record<string, string> = {
  confirmacao:
    "Este link de confirmação expirou ou já foi usado. Se você já confirmou, é só entrar. Se não, use Esqueci minha senha para receber um link novo.",
  auth: "Não foi possível concluir a entrada. Tente de novo.",
};

export default async function ContaPage(props: PageProps<"/conta">) {
  const sp = await props.searchParams;
  const erro = typeof sp.erro === "string" ? AVISOS[sp.erro] : undefined;
  const user = await getSessionUser();

  if (!user) {
    return (
      <section className="mx-auto max-w-xl px-6 py-20">
        <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
          Minha conta
        </h1>
        {erro && (
          <p className="mb-6 border border-content/25 px-4 py-3 text-[13px] leading-relaxed text-content/75" role="alert">
            {erro}
          </p>
        )}
        <CustomerAuth />
      </section>
    );
  }

  const meta = user.user_metadata ?? {};
  const name = (meta.full_name as string) || (meta.name as string) || user.email || "Cliente";
  const orders = await getCustomerOrders(user.email ?? "");

  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Minha conta</h1>
          <p className="mt-3 text-xl">{name}</p>
          <p className="text-sm text-content/60">{user.email}</p>
        </div>
        <form action={customerSignOut}>
          <button
            type="submit"
            className="border border-content px-4 py-2 text-[12px] uppercase tracking-[0.15em] hover:bg-content hover:text-surface"
          >
            Sair
          </button>
        </form>
      </div>

      {isAdminUser(user) && (
        <Link
          href="/admin"
          className="mt-6 inline-block border border-content/30 px-4 py-2 text-[12px] uppercase tracking-[0.15em] hover:border-content"
        >
          Ir para o painel admin
        </Link>
      )}

      <h2 className="mb-4 mt-12 text-[11px] uppercase tracking-[0.2em] text-content/50">
        Meus pedidos
      </h2>

      {orders.length === 0 ? (
        <p className="text-sm text-content/50">
          Você ainda não fez pedidos.{" "}
          <Link href="/produtos" className="underline underline-offset-2 hover:text-content">
            Ver a loja
          </Link>
          .
        </p>
      ) : (
        <div className="divide-y divide-content/10 border-y border-content/10">
          {orders.map((o) => (
            // Cada pedido abre o acompanhamento já preenchido, e quem tem
            // rastreio ganha o botão de rastrear (sugestão do Jair).
            <div key={o.id} className="flex flex-col gap-2 py-4 text-sm">
              <Link
                href={`/acompanhar?numero=${o.orderNumber}&email=${encodeURIComponent(user.email ?? "")}`}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  <span className="block font-medium">Pedido #{o.orderNumber}</span>
                  <span className="block text-[12px] text-content/60">
                    {shortDate(o.createdAt)} · {o.statusLabel}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-content/80">
                  {brl(o.totalCents)} <span aria-hidden="true" className="text-lg">›</span>
                </span>
              </Link>
              {o.trackingCode && (
                <a
                  href={`https://www.melhorrastreio.com.br/app/${encodeURIComponent(o.trackingCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start border border-content px-3 py-1.5 text-[11px] uppercase tracking-[0.12em]"
                >
                  Rastrear entrega · {o.trackingCode}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
