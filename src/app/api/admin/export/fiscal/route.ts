import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { orders, siteSettings } from "@/lib/db/schema";
import { cfopFor, formatDocument, ncmFor, reais, toCsv } from "@/lib/fiscal";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Addr = {
  street?: string;
  number?: string;
  complement?: string | null;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
};

// Planilha pronta para emissão de nota fiscal.
//
// Uma linha por ITEM, não por pedido, porque a NF-e classifica item a item
// (cada um tem NCM, quantidade e valor próprios).
//
// Só entram pedidos PAGOS: não se emite nota de venda que não aconteceu.
//
// Frete, desconto e total do pedido aparecem apenas na PRIMEIRA linha de
// cada pedido, em branco nas demais. Repetir em todas faria qualquer soma
// da planilha contar o mesmo frete várias vezes.
export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  // Recorte opcional por data, para fechar um mês sem trazer o histórico todo.
  const de = request.nextUrl.searchParams.get("de");
  const ate = request.nextUrl.searchParams.get("ate");
  const desde = de ? new Date(`${de}T00:00:00`) : null;
  const limite = ate ? new Date(`${ate}T23:59:59`) : null;

  const [config, rows] = await Promise.all([
    db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) }),
    db.query.orders.findMany({
      where: eq(orders.status, "paid"),
      orderBy: [desc(orders.createdAt)],
      with: { items: { with: { product: { columns: { category: true, ncm: true } } } } },
    }),
  ]);

  const ufLoja = config?.storeUf ?? "";

  const filtrados = rows.filter((o) => {
    const d = new Date(o.paidAt ?? o.createdAt);
    if (desde && d < desde) return false;
    if (limite && d > limite) return false;
    return true;
  });

  const headers = [
    "Pedido", "Data_Pagamento", "Cliente", "CPF_CNPJ", "Email", "Telefone",
    "CEP", "Logradouro", "Numero", "Complemento", "Bairro", "Cidade", "UF",
    "CFOP", "Produto", "Tamanho", "NCM", "Unidade", "Quantidade",
    "Valor_Unitario", "Valor_Total_Item",
    "Pedido_Frete", "Pedido_Desconto", "Pedido_Total",
  ];

  const linhas: (string | number)[][] = [];

  for (const o of filtrados) {
    const a = (o.shippingAddress ?? {}) as Addr;
    const cfop = cfopFor(ufLoja, a.state ?? "");
    const data = shortDate(o.paidAt ?? o.createdAt);

    o.items.forEach((item, i) => {
      const primeira = i === 0;
      linhas.push([
        o.orderNumber,
        data,
        o.customerName,
        o.customerDocument ? formatDocument(o.customerDocument) : "",
        o.customerEmail,
        o.customerPhone,
        a.zip ?? "",
        a.street ?? "",
        a.number ?? "",
        a.complement ?? "",
        a.neighborhood ?? "",
        a.city ?? "",
        a.state ?? "",
        cfop,
        item.productName,
        item.size,
        ncmFor(item.product?.category ?? "", item.product?.ncm),
        "UN",
        item.quantity,
        reais(item.unitPriceCents),
        reais(item.unitPriceCents * item.quantity),
        primeira ? reais(o.shippingCents) : "",
        primeira ? reais(o.discountCents) : "",
        primeira ? reais(o.totalCents) : "",
      ]);
    });
  }

  const csv = toCsv(headers, linhas);
  const sufixo = de || ate ? `-${de ?? "inicio"}_${ate ?? "hoje"}` : "";
  const filename = `albizia-nota-fiscal${sufixo}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
