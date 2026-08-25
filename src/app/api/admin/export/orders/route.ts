import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getAdminUser } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

export const dynamic = "force-dynamic";

// pt-BR Excel opens ';'-delimited files with comma decimals natively; the BOM
// keeps accents intact. reais() emits "219,00" (no thousands separator) so
// spreadsheets read each cell as a number.
function reais(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

type Addr = { city?: string; state?: string; zip?: string };

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  const rows = await db.query.orders.findMany({ orderBy: [desc(orders.createdAt)] });

  const header = [
    "Numero", "Data", "Status", "Cliente", "Email", "Telefone",
    "Cidade", "UF", "CEP", "Subtotal", "Frete", "Desconto", "Cupom",
    "Total", "Pagamento", "MP_Payment_ID", "Codigo_Rastreio",
  ];

  const lines = [header.join(";")];
  for (const o of rows) {
    const a = (o.shippingAddress ?? {}) as Addr;
    lines.push(
      [
        cell(o.orderNumber),
        cell(new Date(o.createdAt).toLocaleString("pt-BR")),
        cell(ORDER_STATUS_LABEL[o.status] ?? o.status),
        cell(o.customerName),
        cell(o.customerEmail),
        cell(o.customerPhone),
        cell(a.city ?? ""),
        cell(a.state ?? ""),
        cell(a.zip ?? ""),
        cell(reais(o.subtotalCents)),
        cell(reais(o.shippingCents)),
        cell(reais(o.discountCents)),
        cell(o.couponCode ?? ""),
        cell(reais(o.totalCents)),
        cell(o.paymentMethod ?? ""),
        cell(o.mpPaymentId ?? ""),
        cell(o.trackingCode ?? ""),
      ].join(";")
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const filename = `albizia-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
