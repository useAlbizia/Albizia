import Link from "next/link";
import { getSessionUser } from "@/lib/auth/dal";
import { isAdminEmail } from "@/lib/auth/admins";
import { getCustomerOrders } from "@/lib/orders";
import { customerSignOut } from "@/lib/customer/actions";
import { brl, shortDate } from "@/lib/format";
import { CustomerAuth } from "./CustomerAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta — ALBIZIA" };

export default async function ContaPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <section className="mx-auto max-w-xl px-6 py-20">
        <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
          Minha conta
        </h1>
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
            className="text-[12px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
          >
            Sair
          </button>
        </form>
      </div>

      {isAdminEmail(user.email) && (
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
            <div key={o.id} className="flex items-center justify-between py-4 text-sm">
              <div>
                <p>Pedido #{o.orderNumber}</p>
                <p className="text-[12px] text-content/50">
                  {shortDate(o.createdAt)} · {o.statusLabel}
                  {o.trackingCode ? ` · rastreio ${o.trackingCode}` : ""}
                </p>
              </div>
              <span className="text-content/70">{brl(o.totalCents)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
