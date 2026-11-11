import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "./db/client";
import { orders } from "./db/schema";
import { getPaymentSettings } from "./payments";
import { extrairValoresMp, type PagamentoMp } from "./mp-valores";

// Mantém em cada pedido o que o Mercado Pago diz sobre o dinheiro dele:
// taxa, líquido, estorno e data de liberação. É o que deixa o caixa da
// empresa certo sem ninguém lançar venda à mão.
//
// Dois caminhos alimentam isto: o webhook, na hora em que o pagamento muda,
// e a sincronização, que pega o que o webhook perdeu e acompanha estornos
// que chegam semanas depois da venda.

/** Grava no pedido os valores de um pagamento já buscado na API. */
export async function aplicarValoresMp(orderId: string, pagamento: PagamentoMp): Promise<void> {
  const v = extrairValoresMp(pagamento);
  await db
    .update(orders)
    .set({
      mpFeeCents: v.liquidoCents === null ? null : v.taxaCents,
      mpNetCents: v.liquidoCents,
      mpRefundedCents: v.estornadoCents,
      mpReleaseDate: v.liberacao ? new Date(v.liberacao) : null,
      mpStatus: v.status || null,
      mpSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

export type ResultadoSync = { conferidos: number; atualizados: number; erros: number; semToken?: boolean };

/**
 * Busca no Mercado Pago os pedidos que ainda não têm os valores, ou que
 * podem ter mudado.
 *
 * Um pedido é reconsultado se nunca foi lido, ou se foi lido há mais de
 * 12 horas e foi pago nos últimos 120 dias: é a janela em que estorno e
 * contestação de cartão costumam aparecer. O limite por chamada mantém a
 * tela rápida; o botão de sincronizar usa um limite maior.
 */
export async function sincronizarPendentes(limite = 15): Promise<ResultadoSync> {
  const { accessToken } = await getPaymentSettings();
  if (!accessToken) return { conferidos: 0, atualizados: 0, erros: 0, semToken: true };

  const alvo = await db
    .select({ id: orders.id, mpPaymentId: orders.mpPaymentId })
    .from(orders)
    .where(
      and(
        isNotNull(orders.mpPaymentId),
        // Pedido de exemplo (modo demonstração) não existe no Mercado Pago:
        // consultar cada um falhava devagar e deixava a tela de Sócios com 11 s.
        sql`${orders.mpPaymentId} not like 'demo-%'`,
        inArray(orders.status, ["paid", "shipped", "refunded"]),
        or(
          isNull(orders.mpSyncedAt),
          and(
            lt(orders.mpSyncedAt, sql`now() - interval '12 hours'`),
            sql`coalesce(${orders.paidAt}, ${orders.createdAt}) > now() - interval '120 days'`,
          ),
        ),
      ),
    )
    .limit(limite);

  const client = new Payment(new MercadoPagoConfig({ accessToken }));
  let atualizados = 0;
  let erros = 0;
  for (const o of alvo) {
    try {
      const p = await client.get({ id: o.mpPaymentId! });
      await aplicarValoresMp(o.id, p as PagamentoMp);
      atualizados++;
    } catch (err) {
      // Um pagamento que não abre não pode travar os outros nem a tela.
      console.error("Sincronização do Mercado Pago falhou", o.mpPaymentId, err);
      erros++;
    }
  }
  return { conferidos: alvo.length, atualizados, erros };
}
