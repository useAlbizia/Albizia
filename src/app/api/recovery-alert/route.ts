import { NextResponse, type NextRequest } from "next/server";
import { sendHighValueAlerts } from "@/lib/recovery";

export const dynamic = "force-dynamic";

// Cron da Vercel (ver vercel.json). De hora em hora, avisa a equipe sobre
// venda de alto valor que empacou, para alguém ligar enquanto ainda dá tempo.
// Protegido por CRON_SECRET quando definido (a Vercel manda como Bearer),
// senão qualquer um poderia disparar e-mail à vontade.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendHighValueAlerts();
  return NextResponse.json({ ok: true, ...result });
}
