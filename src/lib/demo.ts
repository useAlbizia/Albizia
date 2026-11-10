import "server-only";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { lancamentoPagadores, lancamentos, orders, products, productVariants, socios } from "@/lib/db/schema";
import { isoDay } from "@/lib/format";
import { dividirIgual } from "@/lib/financeiro-calc";

// MODO DEMONSTRAÇÃO: 40 dias de vendas e gastos de mentira, para os sócios
// verem o painel "funcionando" antes das vendas de verdade, e um botão que
// apaga tudo.
//
// Como o exemplo nunca se mistura com o real:
// - Pedido de exemplo tem e-mail no domínio DEMO (que não existe, então
//   nenhum e-mail chega a ninguém) e número na faixa 90001+, fora da
//   sequência dos pedidos reais: a primeira venda real continua com o número
//   que teria.
// - Lançamento de exemplo tem origem "demo".
// - Estoque não muda, Mercado Pago não é consultado (o pedido nasce já
//   "sincronizado"), nenhum aviso é enviado.
// - Só pedidos pagos, enviados, cancelados e reembolsados: nada "aguardando
//   pagamento", que entraria na fila de recuperação de carrinho.

export const DOMINIO_DEMO = "exemplo.albizia.invalid";
const NUMERO_INICIAL = 90001;

const NOMES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Elisa Prado", "Felipe Nunes", "Gabriela Reis",
  "Henrique Alves", "Isabela Costa", "João Pedro Silva", "Karina Duarte", "Lucas Martins", "Mariana Lopes",
  "Nicolas Freitas", "Olívia Barros", "Paulo Henrique", "Rafaela Moura", "Samuel Teixeira", "Tatiane Gomes",
  "Vinícius Ramos",
];
const CIDADES = [
  { city: "São Paulo", state: "SP" }, { city: "Rio de Janeiro", state: "RJ" }, { city: "Belo Horizonte", state: "MG" },
  { city: "Curitiba", state: "PR" }, { city: "Porto Alegre", state: "RS" }, { city: "Salvador", state: "BA" },
  { city: "Goiânia", state: "GO" }, { city: "Recife", state: "PE" },
];

// Gerador com semente fixa: o mesmo exemplo toda vez, fácil de comparar.
function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export async function demoAtivo(): Promise<boolean> {
  try {
    const [o] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(like(orders.customerEmail, `%@${DOMINIO_DEMO}`));
    const [l] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(lancamentos)
      .where(eq(lancamentos.origem, "demo"));
    return (o?.n ?? 0) + (l?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function apagarDemo(): Promise<{ pedidos: number; lancamentos: number }> {
  return db.transaction(async (tx) => {
    // Itens saem junto (on delete cascade); pagadores também.
    const p = await tx
      .delete(orders)
      .where(like(orders.customerEmail, `%@${DOMINIO_DEMO}`))
      .returning({ id: orders.id });
    const l = await tx.delete(lancamentos).where(eq(lancamentos.origem, "demo")).returning({ id: lancamentos.id });
    return { pedidos: p.length, lancamentos: l.length };
  });
}

export async function gerarDemo(dias = 40): Promise<{ pedidos: number; lancamentos: number }> {
  if (await demoAtivo()) await apagarDemo();
  const r = aleatorio(20261110);
  const escolha = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];

  const catalogo = await db
    .select({
      productId: products.id,
      nome: products.name,
      preco: products.priceCents,
      custo: products.custoCents,
      variantId: productVariants.id,
      tamanho: productVariants.size,
    })
    .from(products)
    .innerJoin(productVariants, eq(productVariants.productId, products.id))
    .where(eq(products.active, true));
  if (catalogo.length === 0) throw new Error("Nenhum produto ativo para montar o exemplo.");

  const ativos = await db.select().from(socios).where(eq(socios.ativo, true));
  const hoje = new Date();
  let numero = NUMERO_INICIAL;
  let nPedidos = 0;

  await db.transaction(async (tx) => {
    for (let d = dias; d >= 1; d--) {
      // Começo devagar, melhorando com o tempo: 0 a 2 vendas por dia no
      // início, até 1 a 5 no fim, como uma loja que pegou embalo.
      const ritmo = 1 + (dias - d) / dias;
      const vendasDoDia = Math.floor(r() * 2.5 * ritmo);
      for (let v = 0; v < vendasDoDia; v++) {
        const quando = new Date(hoje.getTime() - d * 86_400_000 + Math.floor(r() * 12 + 9) * 3_600_000);
        const nome = escolha(NOMES);
        const local = escolha(CIDADES);
        const itens = Array.from({ length: r() < 0.75 ? 1 : 2 }, () => ({ ...escolha(catalogo), qtd: r() < 0.9 ? 1 : 2 }));
        const subtotal = itens.reduce((n, i) => n + i.preco * i.qtd, 0);
        const frete = 1590 + Math.floor(r() * 1800);
        const desconto = r() < 0.15 ? Math.round(subtotal * 0.1) : 0;
        const total = subtotal + frete - desconto;
        const sorte = r();
        const status = sorte < 0.06 ? "cancelled" : sorte < 0.1 ? "refunded" : d > 7 ? "shipped" : r() < 0.5 ? "paid" : "shipped";
        const pago = status !== "cancelled";
        const pix = r() < 0.55;
        const taxa = pago ? Math.round(total * (pix ? 0.0099 : 0.0498)) : null;
        const etiqueta = status === "shipped" || status === "refunded" ? frete - 300 + Math.floor(r() * 400) : null;
        const email = `${nome.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(/ /g, ".")}.${numero}@${DOMINIO_DEMO}`;

        const [pedido] = await tx.execute<{ id: string }>(sql`
          insert into orders (
            order_number, status, customer_name, customer_email, customer_phone, customer_document,
            shipping_address, subtotal_cents, shipping_cents, discount_cents, total_cents,
            me_service_name, me_company, me_status, me_label_cost_cents, tracking_code,
            mp_payment_id, mp_status, payment_method, mp_fee_cents, mp_net_cents, mp_refunded_cents,
            mp_release_date, mp_synced_at, embalagem_cents, paid_at, created_at, updated_at
          ) overriding system value values (
            ${numero}, ${status}, ${nome}, ${email}, '(11) 90000-0000', '',
            ${JSON.stringify({ street: "Rua de Exemplo", number: "100", district: "Centro", city: local.city, state: local.state, cep: "00000-000" })}::jsonb,
            ${subtotal}, ${frete}, ${desconto}, ${total},
            ${etiqueta ? "PAC" : null}, ${etiqueta ? "Correios" : null}, ${etiqueta ? "generated" : null}, ${etiqueta}, ${etiqueta ? `EX${numero}BR` : null},
            ${pago ? `demo-${numero}` : null}, ${status === "refunded" ? "refunded" : pago ? "approved" : "cancelled"},
            ${pago ? (pix ? "pix" : "credit_card") : null}, ${taxa}, ${taxa !== null ? total - taxa : null},
            ${status === "refunded" ? total : 0},
            ${pago ? new Date(quando.getTime() + (pix ? 0 : 14 * 86_400_000)).toISOString() : null}, ${quando.toISOString()},
            ${pago ? 250 : 0}, ${pago ? quando.toISOString() : null}, ${quando.toISOString()}, ${quando.toISOString()}
          ) returning id`);
        for (const i of itens) {
          await tx.execute(sql`
            insert into order_items (order_id, product_id, product_variant_id, product_name, size, unit_price_cents, quantity, unit_cost_cents)
            values (${pedido.id}, ${i.productId}, ${i.variantId}, ${i.nome}, ${i.tamanho}, ${i.preco}, ${i.qtd}, ${i.custo || null})`);
        }
        numero++;
        nPedidos++;
      }
    }
  });

  // Gastos de exemplo, já aprovados e pagos, para o caixa, o fechamento e o
  // equilíbrio entre sócios terem o que mostrar.
  const dataHa = (d: number) => isoDay(new Date(hoje.getTime() - d * 86_400_000));
  const gastos: { d: number; descricao: string; categoria: string; valor: number; quem: "empresa" | "todos" | number }[] = [
    { d: 38, descricao: "Lote de peças lisas (exemplo)", categoria: "Estoque e insumos", valor: 180000, quem: "todos" },
    { d: 36, descricao: "Estampas DTF (exemplo)", categoria: "Estoque e insumos", valor: 42000, quem: 0 },
    { d: 30, descricao: "Anúncio no Instagram (exemplo)", categoria: "Marketing e anúncios", valor: 15000, quem: "empresa" },
    { d: 20, descricao: "DAS do MEI (exemplo)", categoria: "Impostos (DAS do MEI)", valor: 7660, quem: "empresa" },
    { d: 12, descricao: "Embalagens (exemplo)", categoria: "Estoque e insumos", valor: 9800, quem: 1 },
    { d: 5, descricao: "Anúncio no Instagram (exemplo)", categoria: "Marketing e anúncios", valor: 20000, quem: "empresa" },
  ];
  let nLanc = 0;
  for (const g of gastos) {
    const data = dataHa(g.d);
    const [l] = await db
      .insert(lancamentos)
      .values({
        data,
        tipo: "despesa",
        descricao: g.descricao,
        categoria: g.categoria,
        formaPagamento: "Pix",
        valorCents: g.valor,
        status: "pago",
        aprovacao: "aprovado",
        origem: "demo",
        criadoPor: "exemplo",
      })
      .returning({ id: lancamentos.id });
    const pag =
      g.quem === "empresa" || ativos.length === 0
        ? [{ socioId: null as string | null, valorCents: g.valor }]
        : g.quem === "todos"
          ? dividirIgual(g.valor, ativos.length).map((v, i) => ({ socioId: ativos[i].id as string | null, valorCents: v }))
          : [{ socioId: ativos[g.quem % ativos.length].id as string | null, valorCents: g.valor }];
    await db
      .insert(lancamentoPagadores)
      .values(pag.map((p) => ({ lancamentoId: l.id, ...p, pagoEm: data, pagoMarcadoPor: "exemplo" })));
    nLanc++;
  }
  return { pedidos: nPedidos, lancamentos: nLanc };
}
