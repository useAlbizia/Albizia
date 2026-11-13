// Classificação dos erros: em que ÁREA aconteceu e qual a GRAVIDADE.
// Funções puras (sem banco) para testar em scripts/test-erros.ts.
//
// Gravidade:
//   critica  venda perdida, pagamento ou segurança em risco  → e-mail na hora
//   alta     algo importante parou, sem perder venda na hora → e-mail na hora
//   media    uma tela falhou                                 → resumo diário
//   baixa    incômodo (lentidão, erro no aparelho do painel) → só no painel

export type Gravidade = "critica" | "alta" | "media" | "baixa";
export type Area =
  | "compra"
  | "pagamento"
  | "cadastro"
  | "estoque"
  | "frete"
  | "email"
  | "seguranca"
  | "painel"
  | "loja"
  | "sistema";

export const ROTULO_GRAVIDADE: Record<Gravidade, string> = {
  critica: "Crítico",
  alta: "Alto",
  media: "Médio",
  baixa: "Baixo",
};

export const ROTULO_AREA: Record<Area, string> = {
  compra: "Compra",
  pagamento: "Pagamento",
  cadastro: "Cadastro e login",
  estoque: "Estoque",
  frete: "Frete e etiqueta",
  email: "E-mail",
  seguranca: "Segurança",
  painel: "Painel",
  loja: "Loja",
  sistema: "Sistema",
};

/** A área pelo endereço onde aconteceu ("POST /checkout", "/admin/pedidos/..."). */
export function areaDoCaminho(caminho: string): Area {
  const c = caminho.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, "").toLowerCase();
  if (c.startsWith("/api/mercadopago")) return "pagamento";
  if (c.startsWith("/checkout") || c.startsWith("/carrinho")) return "compra";
  if (
    c.startsWith("/conta") ||
    c.startsWith("/auth") ||
    c.startsWith("/admin/login") ||
    c.startsWith("/admin/esqueci") ||
    c.startsWith("/admin/redefinir")
  )
    return "cadastro";
  if (c.startsWith("/api/webhooks/resend")) return "email";
  if (c.startsWith("/admin/pedidos")) return "frete";
  if (c.startsWith("/admin")) return "painel";
  if (c.startsWith("/api/low-stock-check") || c.startsWith("/api/keep-alive") || c.startsWith("/api/recovery")) return "sistema";
  return "loja";
}

export function gravidadeDe(e: { origem: string; tipo: string; area: Area }): Gravidade {
  const { origem, tipo, area } = e;
  if (tipo === "seguranca") return "alta";
  if (tipo === "lentidao") return area === "compra" || area === "pagamento" ? "media" : "baixa";
  if (origem === "aparelho") {
    if (area === "compra" || area === "pagamento") return "alta";
    if (area === "painel" || area === "frete") return "baixa";
    return "media";
  }
  // Servidor.
  if (area === "compra" || area === "pagamento") return "critica";
  if (tipo === "banco" && (area === "loja" || area === "cadastro")) return "critica";
  if (area === "loja" || area === "cadastro" || area === "frete" || area === "email" || area === "estoque" || area === "sistema") {
    return "alta";
  }
  return "media";
}

/** Mesmo erro repetido tem a mesma chave: números e ids viram "#". */
export function chaveDoErro(area: string, caminho: string, mensagem: string): string {
  const limpa = (s: string) =>
    s
      .toLowerCase()
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "#")
      .replace(/\d+/g, "#")
      .replace(/\?.*$/, "")
      .slice(0, 160);
  return `${area}|${limpa(caminho)}|${limpa(mensagem)}`;
}

/** Quanto tempo segurar um novo e-mail do MESMO erro, em minutos. */
export function intervaloAvisoMin(g: Gravidade): number | null {
  if (g === "critica") return 15;
  if (g === "alta") return 60;
  return null; // média e baixa não mandam e-mail na hora
}
