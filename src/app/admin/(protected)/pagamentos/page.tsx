import { getConnection } from "@/lib/mercadopago-oauth";
import { PagamentosForm } from "./PagamentosForm";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  app_nao_configurada: "Informe a aplicação do Mercado Pago antes de conectar.",
  autorizacao_negada: "A autorização foi cancelada no Mercado Pago.",
  resposta_incompleta: "O Mercado Pago devolveu uma resposta incompleta. Tente de novo.",
  state_invalido: "A volta do Mercado Pago não conferiu. Por segurança, comece de novo.",
  troca_falhou: "O Mercado Pago recusou a conexão.",
};

export default async function PagamentosPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const erro = typeof params.erro === "string" ? params.erro : undefined;
  const detalhe = typeof params.detalhe === "string" ? params.detalhe : undefined;
  const conectado = params.conectado === "1";

  const conexao = await getConnection();

  return (
    <div>
      <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Pagamentos</h1>
      <p className="mb-8 max-w-2xl text-[12px] leading-relaxed text-content/40">
        Conecte a conta do Mercado Pago que vai receber as vendas.
      </p>

      {conectado && (
        <p className="mb-6 max-w-lg border border-content/30 px-4 py-3 text-[12px] text-content/70">
          Conta conectada com sucesso.
        </p>
      )}

      {erro && (
        <p className="mb-6 max-w-lg border border-content/30 px-4 py-3 text-[12px] leading-relaxed text-content/70">
          {ERROS[erro] ?? "Não foi possível conectar."}
          {detalhe ? ` (${detalhe})` : ""}
        </p>
      )}

      <PagamentosForm
        settings={{
          // Nenhuma credencial cruza para o navegador: só o estado da
          // conexão e o número público da conta conectada.
          appConfigurada: conexao.configurada,
          conectada: conexao.conectada,
          contaId: conexao.userId,
          conectadaEm: conexao.conectadaEm ? conexao.conectadaEm.toISOString() : null,
        }}
      />
    </div>
  );
}
