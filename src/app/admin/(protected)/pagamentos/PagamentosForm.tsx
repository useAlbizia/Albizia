"use client";

import { useActionState } from "react";
import { longDate } from "@/lib/format";
import { desconectarMp, testarConexao, type TestState } from "./_actions";

const initialTest: TestState = {};

export type PagamentosSettings = {
  appConfigurada: boolean;
  conectada: boolean;
  contaId: string;
  conectadaEm: string | null;
};

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  return longDate(iso);
}

// Tela de pagamentos, para quem OPERA a loja.
//
// Aqui aparece uma coisa só: o botão de conectar a conta que recebe. Nada de
// número de aplicação, client secret ou access token. Essas são credenciais
// de quem desenvolve, vivem em variável de ambiente e não têm por que passar
// na frente de quem só quer vender.
export function PagamentosForm({ settings }: { settings: PagamentosSettings }) {
  const [test, testAction, testing] = useActionState(testarConexao, initialTest);

  if (!settings.appConfigurada) {
    return (
      <div className="max-w-lg border border-content/25 p-5">
        <p className="text-[12px] uppercase tracking-[0.15em] text-content/70">
          Integração ainda não liberada
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-content/50">
          Falta uma configuração técnica que é feita fora daqui, por quem cuida do site. Assim que
          estiver pronta, esta tela vai mostrar o botão para conectar a conta do Mercado Pago.
        </p>
      </div>
    );
  }

  if (settings.conectada) {
    return (
      <div className="max-w-lg">
        <div className="border border-content/25 p-5">
          <p className="text-[12px] uppercase tracking-[0.15em] text-content/50">
            Conta que recebe as vendas
          </p>
          <p className="mt-3 text-base text-content">Mercado Pago conectado ✓</p>
          <p className="mt-1 text-[12px] text-content/45">
            Conta nº {settings.contaId}
            {settings.conectadaEm ? ` · conectada em ${dataCurta(settings.conectadaEm)}` : ""}
          </p>
          <p className="mt-4 text-[12px] leading-relaxed text-content/50">
            O dinheiro das vendas cai nessa conta. A autorização se renova sozinha, você não
            precisa fazer mais nada.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={testAction}>
            <button
              type="submit"
              disabled={testing}
              className="border border-content/30 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-content/60 transition-colors hover:border-content hover:text-content disabled:opacity-50"
            >
              {testing ? "Conferindo..." : "Conferir conexão"}
            </button>
          </form>

          <form action={desconectarMp}>
            <button
              type="submit"
              className="border border-content/20 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-content/40 transition-colors hover:border-content/50 hover:text-content/70"
            >
              Trocar de conta
            </button>
          </form>

          {test.ok && <span className="text-[13px] text-content/60">{test.account} ✓</span>}
          {test.error && <span className="text-[13px] text-content/70">{test.error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg border border-content/25 p-6">
      <p className="text-[12px] uppercase tracking-[0.15em] text-content/50">
        Conta que recebe as vendas
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-content/60">
        Clique abaixo e faça login na conta do Mercado Pago que deve receber o dinheiro das
        vendas. Você autoriza uma vez e pronto.
      </p>

      <a
        href="/api/mercadopago/oauth/start"
        className="mt-5 inline-block border border-content bg-content px-7 py-3.5 text-[13px] uppercase tracking-[0.18em] text-surface transition-opacity hover:opacity-90"
      >
        Conectar conta do Mercado Pago
      </a>

      <p className="mt-4 text-[11px] leading-relaxed text-content/40">
        Você será levado ao site do Mercado Pago para autorizar e volta para cá em seguida. A
        ALBIZIA não vê sua senha nem o saldo da conta.
      </p>
    </div>
  );
}
