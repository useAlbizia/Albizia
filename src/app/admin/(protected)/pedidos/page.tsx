import Link from "next/link";
import { desc, ilike, inArray, or, sql, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderItems, orders } from "@/lib/db/schema";
import { brl, shortDate } from "@/lib/format";
import { expirarPedidosAbandonados } from "@/lib/orders";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

/**
 * A busca aceita o que o cliente souber dizer ao telefone.
 *
 * Quem digitou o e-mail errado liga com o número do pedido, ou só com o nome,
 * ou só com o telefone. Antes não havia busca nenhuma e achar um pedido era
 * rolar a lista no olho. Número e documento casam exato; nome e e-mail casam
 * por pedaço; telefone e CPF ignoram pontuação, porque ninguém dita os pontos.
 */
function filtro(q: string): SQL | undefined {
  const termo = q.trim();
  if (!termo) return undefined;

  const digitos = termo.replace(/\D/g, "");
  const conds: SQL[] = [
    ilike(orders.customerName, `%${termo}%`),
    ilike(orders.customerEmail, `%${termo}%`),
  ];

  // "#1042" ou "1042": número do pedido.
  const semCerquilha = termo.replace(/^#/, "");
  if (/^\d{1,9}$/.test(semCerquilha)) {
    conds.push(eq(orders.orderNumber, Number(semCerquilha)));
  }
  // Telefone e CPF: só a partir de 4 dígitos, para "12" não trazer metade
  // da base.
  if (digitos.length >= 4) {
    conds.push(sql`regexp_replace(${orders.customerPhone}, '\\D', '', 'g') like ${`%${digitos}%`}`);
    conds.push(sql`${orders.customerDocument} like ${`%${digitos}%`}`);
  }
  return or(...conds);
}

export default async function AdminPedidosPage(props: PageProps<"/admin/pedidos">) {
  await expirarPedidosAbandonados().catch(() => 0);
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";

  const rows = await db
    .select()
    .from(orders)
    .where(filtro(q))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  // Os itens de cada pedido, numa consulta só, para a lista já mostrar o que
  // foi comprado sem precisar abrir um por um.
  const itens = rows.length
    ? await db
        .select({ orderId: orderItems.orderId, nome: orderItems.productName, tamanho: orderItems.size, qtd: orderItems.quantity })
        .from(orderItems)
        .where(inArray(orderItems.orderId, rows.map((o) => o.id)))
    : [];
  const itensDe = (id: string) =>
    itens
      .filter((i) => i.orderId === id)
      .map((i) => `${i.qtd > 1 ? `${i.qtd}x ` : ""}${i.nome} (${i.tamanho})`)
      .join(", ");

  return (
    <div>
      <h1 className="mb-6 text-sm uppercase tracking-[0.3em] text-content/60">Pedidos</h1>

      <form data-tour="pedidos-busca" className="mb-8 flex max-w-xl gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Número, nome, e-mail, telefone ou CPF"
          autoComplete="off"
          className="flex-1 border border-content/30 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-content"
        />
        <button
          type="submit"
          className="border border-content px-5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface"
        >
          Buscar
        </button>
        {q && (
          <Link
            href="/admin/pedidos"
            className="flex items-center px-2 text-[12px] uppercase tracking-[0.1em] text-content/45 hover:text-content"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Celular: um cartão por pedido, e o cartão INTEIRO abre o pedido.
          Antes só o número "#123" era clicável, um alvo pequeno demais. */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((o) => {
          const pendenteEtiqueta = o.status === "paid" && o.meStatus !== "generated";
          return (
            <Link
              key={o.id}
              href={`/admin/pedidos/${o.id}`}
              className="flex flex-col gap-1.5 border border-content/15 px-4 py-3.5 active:bg-surface-soft"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium">
                  #{o.orderNumber} · {brl(o.totalCents)}
                </span>
                <span className={`text-[12px] ${o.status === "paid" ? "font-medium text-content" : "text-content/55"}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <span className="text-[13px] text-content/75">{o.customerName}</span>
              {itensDe(o.id) && <span className="text-[12px] leading-snug text-content/55">{itensDe(o.id)}</span>}
              <div className="flex items-center justify-between text-[11px] text-content/45">
                <span>{shortDate(o.createdAt)}</span>
                {pendenteEtiqueta ? <span className="font-medium text-content">Emitir etiqueta</span> : <span>Ver pedido ›</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
              <th className="py-3 pr-4 font-normal">Nº</th>
              <th className="py-3 pr-4 font-normal">Cliente</th>
              <th className="py-3 pr-4 font-normal">Total</th>
              <th className="py-3 pr-4 font-normal">Status</th>
              <th className="py-3 pr-4 font-normal">Etiqueta</th>
              <th className="py-3 pr-4 font-normal">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-content/10">
            {rows.map((o) => {
              // Pago e sem etiqueta é a fila de trabalho do dia: é o que
              // precisa sair hoje.
              const pendenteEtiqueta = o.status === "paid" && o.meStatus !== "generated";
              return (
                <tr key={o.id} className="relative cursor-pointer hover:bg-surface-soft">
                  <td className="py-3 pr-4">
                    {/* O link se estica sobre a linha inteira: clicar em
                        qualquer parte abre o pedido. */}
                    <Link href={`/admin/pedidos/${o.id}`} className="after:absolute after:inset-0 hover:underline">
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-content/60">
                    <span className="block">{o.customerName}</span>
                    <span className="block text-[11px] text-content/40">{o.customerEmail}</span>
                    {itensDe(o.id) && <span className="block text-[11px] text-content/50">{itensDe(o.id)}</span>}
                  </td>
                  <td className="py-3 pr-4 text-content/60">{brl(o.totalCents)}</td>
                  <td className="py-3 pr-4 text-content/60">{STATUS_LABEL[o.status] ?? o.status}</td>
                  <td className="py-3 pr-4 text-[12px]">
                    {o.meStatus === "generated" ? (
                      <span className="text-content/50">gerada</span>
                    ) : pendenteEtiqueta ? (
                      <span className="text-content">emitir</span>
                    ) : (
                      <span className="text-content/30">·</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-content/60">{shortDate(o.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

      </div>
      <div>
        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-content/50">
            {q ? `Nenhum pedido encontrado para "${q}".` : "Nenhum pedido ainda."}
          </p>
        )}
      </div>
    </div>
  );
}
