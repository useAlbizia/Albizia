import Link from "next/link";
import { demoAtivo } from "@/lib/demo";
import { BotoesDemo } from "./BotoesDemo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demonstração · Painel ALBIZIA" };

export default async function DemonstracaoPage() {
  const ativo = await demoAtivo();
  const link = "underline underline-offset-4";
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Demonstração</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-content/75">
          Coloca no painel 40 dias de vendas e alguns gastos <strong>de mentira</strong>, para vocês verem como cada tela
          fica com movimento: faturamento, lucro, fechamento do mês, gráficos, pedidos, equilíbrio entre sócios. Depois é
          só apagar.
        </p>
      </div>

      <BotoesDemo ativo={ativo} />

      {ativo && (
        <div className="border border-content/20 px-5 py-4 text-[14px] leading-relaxed">
          <p className="font-medium">O que olhar com o exemplo ligado:</p>
          <ul className="mt-2 list-disc pl-5 text-content/75">
            <li>
              <Link href="/admin" className={link}>Início</Link>: vendas, ticket médio e gráfico.
            </li>
            <li>
              <Link href="/admin/fechamento" className={link}>Fechamento do mês</Link>: lucro ou prejuízo, já descontando
              peças, taxas, frete e DAS. Use as setas para ver o mês anterior.
            </li>
            <li>
              <Link href="/admin/pedidos" className={link}>Pedidos</Link>: pagos, enviados, cancelados e reembolsados (os
              de exemplo começam no #90001).
            </li>
            <li>
              <Link href="/admin/socios" className={link}>Sócios e caixa</Link>: o equalizador com os gastos de exemplo.
            </li>
            <li>
              <Link href="/admin/financeiro" className={link}>Relatório de vendas</Link> e{" "}
              <Link href="/admin/analytics" className={link}>Analytics</Link>.
            </li>
          </ul>
        </div>
      )}

      <div className="text-[12px] leading-relaxed text-content/55">
        <p className="font-medium text-content/70">Segurança do exemplo</p>
        <ul className="mt-1 list-disc pl-5">
          <li>Nenhum e-mail sai para ninguém: os clientes de exemplo usam um endereço que não existe.</li>
          <li>O estoque não muda e o Mercado Pago não é consultado.</li>
          <li>Os pedidos de exemplo ficam na faixa #90001+, então a numeração das vendas reais não pula.</li>
          <li>Enquanto o exemplo existir, uma faixa em todas as telas avisa que há dados de exemplo.</li>
          <li>Apagar remove só o exemplo. O que é real nunca é tocado.</li>
        </ul>
      </div>
    </div>
  );
}
