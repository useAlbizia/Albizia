"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { sendEmail, emailShell } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { activeMeToken, faltaParaEtiqueta, getShippingSettings } from "@/lib/shipping";
import {
  meCancelar,
  meComprar,
  meDeclaracao,
  meGerar,
  meImprimir,
  meInserirNoCarrinho,
  type MeParty,
} from "@/lib/melhor-envio";
import { brl } from "@/lib/format";

// ── Etiqueta do Melhor Envio, em dois passos ─────────────────────────────
//
// PREPARAR insere o envio no carrinho do Melhor Envio. Isso é de graça e não
// cria nada que precise ser desfeito: é onde todo erro aparece (endereço
// incompleto, CNPJ errado, medida fora do limite da transportadora). Devolve
// o preço real.
//
// COMPRAR debita da Melhor Carteira, gera a etiqueta e traz o PDF. Separar os
// dois é o que permite ver quanto vai custar ANTES de gastar, em vez de
// descobrir no extrato.

export type EtiquetaState = {
  ok?: boolean;
  error?: string;
  mensagem?: string;
};

type ShippingAddress = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
};

async function carregar(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { with: { product: { columns: { weightGrams: true, lengthCm: true, widthCm: true, heightCm: true } } } } },
  });
  const settings = await getShippingSettings();
  return { order, settings, token: activeMeToken(settings) };
}

function revalidar(orderId: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}

export async function prepararEtiqueta(
  orderId: string,
  _prev: EtiquetaState,
  _formData: FormData,
): Promise<EtiquetaState> {
  await requireAdmin();

  const { order, settings, token } = await carregar(orderId);
  if (!order) return { error: "Pedido não encontrado." };
  if (!token) return { error: "Nenhum token do Melhor Envio configurado." };

  const falta = faltaParaEtiqueta(settings);
  if (falta.length > 0) {
    return { error: `Falta configurar em Entrega e frete: ${falta.join(", ")}.` };
  }
  if (!order.meServiceId) {
    return {
      error:
        "Este pedido não tem serviço de entrega escolhido. Pedidos feitos antes da cotação por transportadora precisam de etiqueta manual.",
    };
  }
  if (order.meOrderId) return { error: "Este pedido já tem envio no Melhor Envio." };

  const addr = order.shippingAddress as ShippingAddress;
  if (!order.customerDocument) {
    return { error: "O pedido não tem CPF do cliente, e o Melhor Envio exige o documento do destinatário." };
  }

  const destinatario: MeParty = {
    name: order.customerName,
    phone: order.customerPhone,
    email: order.customerEmail,
    document: order.customerDocument,
    address: addr.street,
    number: addr.number,
    complement: addr.complement ?? "",
    district: addr.neighborhood,
    city: addr.city,
    stateAbbr: addr.state,
    postalCode: addr.zip,
  };

  // O pacote é montado pela MESMA conta da cotação (packageFor), senão a
  // etiqueta custaria diferente do que o cliente pagou.
  let weightGrams = 0;
  let heightCm = 0;
  let lengthCm = 0;
  let widthCm = 0;
  for (const i of order.items) {
    const q = Math.max(1, i.quantity);
    weightGrams += (i.product?.weightGrams || settings.meWeightGrams) * q;
    heightCm += (i.product?.heightCm || settings.meHeightCm) * q;
    lengthCm = Math.max(lengthCm, i.product?.lengthCm || settings.meLengthCm);
    widthCm = Math.max(widthCm, i.product?.widthCm || settings.meWidthCm);
  }

  const r = await meInserirNoCarrinho(token, settings.meEnvironment, {
    serviceId: order.meServiceId,
    from: settings.meFrom,
    to: destinatario,
    products: order.items.map((i) => ({
      name: `${i.productName} (${i.size})`,
      quantity: i.quantity,
      unitaryValueCents: i.unitPriceCents,
    })),
    volume: {
      weightGrams: Math.max(50, weightGrams),
      lengthCm: Math.max(1, lengthCm),
      widthCm: Math.max(1, widthCm),
      heightCm: Math.max(1, heightCm),
    },
    insuranceValueCents: order.subtotalCents,
    // Sem nota fiscal o envio vai como não comercial e o Melhor Envio emite a
    // declaração de conteúdo. Ver lib/fiscal.ts e a memória sobre MEI.
  });

  if (!r.ok) return { error: r.message };

  const custoCents = r.data.price ? Math.round(parseFloat(r.data.price) * 100) : null;
  await db
    .update(orders)
    .set({
      meOrderId: r.data.id,
      meStatus: "cart",
      meLabelCostCents: custoCents,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await logAudit({ action: "order.etiqueta.preparar", entity: "order", entityId: orderId, detail: { meOrderId: r.data.id } });
  revalidar(orderId);

  return {
    ok: true,
    mensagem: custoCents
      ? `Envio aceito pelo Melhor Envio. Vai custar ${brl(custoCents)}. Nada foi cobrado ainda.`
      : "Envio aceito pelo Melhor Envio. Nada foi cobrado ainda.",
  };
}

export async function comprarEtiqueta(
  orderId: string,
  _prev: EtiquetaState,
  _formData: FormData,
): Promise<EtiquetaState> {
  await requireAdmin();

  const { order, settings, token } = await carregar(orderId);
  if (!order) return { error: "Pedido não encontrado." };
  if (!token) return { error: "Nenhum token do Melhor Envio configurado." };
  if (!order.meOrderId) return { error: "Prepare o envio antes de comprar." };
  if (order.meStatus === "generated") return { error: "A etiqueta deste pedido já foi gerada." };

  const compra = await meComprar(token, settings.meEnvironment, [order.meOrderId]);
  if (!compra.ok) {
    // O erro mais comum aqui é saldo insuficiente, e vale dizer com todas as
    // letras em vez de repassar o texto cru do Melhor Envio.
    const dica = /saldo|balance|insufficient/i.test(compra.message)
      ? " Coloque saldo na Melhor Carteira e tente de novo."
      : "";
    return { error: compra.message + dica };
  }

  const gerou = await meGerar(token, settings.meEnvironment, [order.meOrderId]);
  if (!gerou.ok) {
    // Pago mas não gerado: o dinheiro não sumiu, o envio está na conta do
    // Melhor Envio e dá para gerar por lá. Guardamos o estado para não
    // tentar comprar de novo.
    await db.update(orders).set({ meStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, orderId));
    revalidar(orderId);
    return { error: `Envio comprado, mas a etiqueta não foi gerada: ${gerou.message}` };
  }

  const pdf = await meImprimir(token, settings.meEnvironment, [order.meOrderId]);

  await db
    .update(orders)
    .set({
      meStatus: "generated",
      meLabelCostCents: compra.data.purchaseCents || order.meLabelCostCents,
      meLabelUrl: pdf.ok ? pdf.data : null,
      meLabeledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await logAudit({
    action: "order.etiqueta.comprar",
    entity: "order",
    entityId: orderId,
    detail: { meOrderId: order.meOrderId, custoCents: compra.data.purchaseCents },
  });
  revalidar(orderId);

  return {
    ok: true,
    mensagem: pdf.ok
      ? `Etiqueta gerada por ${brl(compra.data.purchaseCents)}. O PDF está pronto para imprimir.`
      : `Etiqueta comprada por ${brl(compra.data.purchaseCents)}, mas o PDF não veio: ${pdf.message}`,
  };
}

export async function cancelarEtiqueta(
  orderId: string,
  _prev: EtiquetaState,
  _formData: FormData,
): Promise<EtiquetaState> {
  await requireAdmin();

  const { order, settings, token } = await carregar(orderId);
  if (!order?.meOrderId) return { error: "Este pedido não tem envio no Melhor Envio." };
  if (!token) return { error: "Nenhum token do Melhor Envio configurado." };

  const r = await meCancelar(token, settings.meEnvironment, order.meOrderId);
  if (!r.ok) return { error: r.message };

  // Limpa o meOrderId junto: sem isso, "preparar" recusaria para sempre
  // dizendo que já existe envio, e o pedido ficaria travado depois de um
  // cancelamento. O id cancelado fica no log de auditoria.
  await db
    .update(orders)
    .set({
      meOrderId: null,
      meStatus: "canceled",
      meLabelUrl: null,
      meLabelCostCents: null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await logAudit({ action: "order.etiqueta.cancelar", entity: "order", entityId: orderId, detail: { meOrderId: order.meOrderId } });
  revalidar(orderId);

  return {
    ok: true,
    mensagem:
      "Envio cancelado. O valor volta para a Melhor Carteira: na hora se a etiqueta não foi impressa, em até 12 horas se foi.",
  };
}

/** Avisa o cliente com o código de rastreio, reaproveitando o fluxo de envio. */
export async function avisarRastreio(
  orderId: string,
  _prev: EtiquetaState,
  formData: FormData,
): Promise<EtiquetaState> {
  await requireAdmin();

  const codigo = ((formData.get("codigo") as string | null) ?? "").trim();
  if (!codigo) return { error: "Informe o código de rastreio." };

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return { error: "Pedido não encontrado." };

  await db
    .update(orders)
    .set({ trackingCode: codigo, status: "shipped", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  const rastreio = `https://www.melhorrastreio.com.br/app/${encodeURIComponent(codigo)}`;
  await sendEmail({
    to: order.customerEmail,
    subject: `Seu pedido #${order.orderNumber} foi enviado · ALBIZIA`,
    html: emailShell(
      "Pedido enviado",
      `<p style="font-size:14px;line-height:1.6;color:#55534e;">Olá, ${order.customerName}. Seu pedido está a caminho.</p>
       <p style="font-size:20px;letter-spacing:2px;text-align:center;margin:16px 0;padding:14px;border:1px solid #d9d2c6;">${codigo}</p>
       <div style="text-align:center;margin:24px 0;">
         <a href="${rastreio}" style="display:inline-block;background:#121212;color:#f2ede5;text-decoration:none;padding:14px 32px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Rastrear entrega</a>
       </div>`,
    ),
  });

  await logAudit({ action: "order.tracking", entity: "order", entityId: orderId, detail: { orderNumber: order.orderNumber, codigo } });
  revalidar(orderId);
  return { ok: true, mensagem: "Cliente avisado com o link de rastreio." };
}

/** Link do PDF da declaração de conteúdo, o papel que vai junto sem nota. */
export async function linkDeclaracao(orderId: string): Promise<{ url?: string; error?: string }> {
  await requireAdmin();

  const { order, settings, token } = await carregar(orderId);
  if (!order?.meOrderId) return { error: "Este pedido não tem envio no Melhor Envio." };
  if (!token) return { error: "Nenhum token do Melhor Envio configurado." };

  const r = await meDeclaracao(token, settings.meEnvironment, order.meOrderId);
  return r.ok ? { url: r.data } : { error: r.message };
}
