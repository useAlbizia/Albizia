// Tradução de um pagamento do Mercado Pago para os números do caixa.
//
// Função pura, sem rede, testada em scripts/test-financeiro.ts. Os nomes dos
// campos vêm dos tipos do SDK oficial (mercadopago/dist/clients/payment/
// commonTypes.d.ts), não de exemplo de blog.

export type PagamentoMp = {
  status?: string;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  money_release_date?: string | null;
  fee_details?: { type?: string; amount?: number; fee_payer?: string }[];
  transaction_details?: { net_received_amount?: number };
};

export type ValoresMp = {
  brutoCents: number;
  /** Taxa paga pela LOJA. Juros pagos pelo cliente não entram aqui. */
  taxaCents: number;
  /** null enquanto o pagamento não foi aprovado: o MP devolve 0 nesse caso. */
  liquidoCents: number | null;
  estornadoCents: number;
  liberacao: string | null;
  status: string;
};

const cents = (v: number | undefined | null) => Math.round((v ?? 0) * 100);

export function extrairValoresMp(p: PagamentoMp): ValoresMp {
  const brutoCents = cents(p.transaction_amount);
  const liquidoBruto = p.transaction_details?.net_received_amount;
  // Pagamento pendente (Pix gerado, boleto em aberto) vem com líquido 0.
  // Zero ali não é "a loja recebeu zero", é "ainda não sabemos".
  const liquidoCents = liquidoBruto && liquidoBruto > 0 ? cents(liquidoBruto) : null;

  // Só a taxa que é da loja. Quando o cliente parcela com juros, quem paga o
  // juro é ele (fee_payer "payer"), e isso não é custo nosso.
  const taxaDaLoja = (p.fee_details ?? [])
    .filter((f) => f.fee_payer === "collector")
    .reduce((n, f) => n + cents(f.amount), 0);
  // Sem detalhe de taxa mas com líquido conhecido, a diferença é a taxa.
  const taxaCents = taxaDaLoja > 0 ? taxaDaLoja : liquidoCents !== null ? Math.max(0, brutoCents - liquidoCents) : 0;

  return {
    brutoCents,
    taxaCents,
    liquidoCents,
    estornadoCents: cents(p.transaction_amount_refunded),
    liberacao: p.money_release_date ?? null,
    status: p.status ?? "",
  };
}

/** Estorno total e contestação perdida: a venda deixa de existir no caixa. */
export function vendaDesfeita(status: string | null | undefined): boolean {
  return status === "refunded" || status === "charged_back";
}
