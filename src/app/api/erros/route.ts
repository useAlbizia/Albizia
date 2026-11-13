import { NextResponse, type NextRequest } from "next/server";
import { registrarErro } from "@/lib/erros";

export const dynamic = "force-dynamic";

// Erros de JavaScript no aparelho do CLIENTE, em qualquer página da loja
// (o painel tem o seu, com login). Rota pública, então:
// - só aceita chamada do próprio site (Origin);
// - no máximo 10 por minuto por endereço de internet, por servidor;
// - tamanho cortado; nunca devolve detalhe.

const janela = new Map<string, number[]>();

function permitido(ip: string): boolean {
  const agora = Date.now();
  const recentes = (janela.get(ip) ?? []).filter((t) => agora - t < 60_000);
  if (recentes.length >= 10) return false;
  recentes.push(agora);
  janela.set(ip, recentes);
  if (janela.size > 5000) janela.clear(); // não cresce para sempre
  return true;
}

export async function POST(request: NextRequest) {
  const origem = request.headers.get("origin") ?? "";
  const host = request.headers.get("host") ?? "";
  if (!origem || new URL(origem).host !== host) return NextResponse.json({ ok: false }, { status: 403 });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
  if (!permitido(ip)) return NextResponse.json({ ok: true });

  let corpo: { mensagem?: unknown; detalhe?: unknown; caminho?: unknown; tipo?: unknown };
  try {
    const texto = await request.text();
    if (texto.length > 8000) return NextResponse.json({ ok: true });
    corpo = JSON.parse(texto);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const mensagem = String(corpo.mensagem ?? "").slice(0, 500);
  if (!mensagem) return NextResponse.json({ ok: true });

  await registrarErro({
    origem: "aparelho",
    tipo: corpo.tipo === "lentidao" ? "lentidao" : "navegador",
    caminho: String(corpo.caminho ?? "").slice(0, 200),
    mensagem,
    detalhe: String(corpo.detalhe ?? "").slice(0, 2000),
    aparelho: (request.headers.get("user-agent") ?? "").slice(0, 300),
  });
  return NextResponse.json({ ok: true });
}
