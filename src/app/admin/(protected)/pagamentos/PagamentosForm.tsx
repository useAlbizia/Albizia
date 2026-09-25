"use client";

import { useActionState } from "react";
import {
  savePagamentos,
  testarConexao,
  type PagamentosState,
  type TestState,
} from "./_actions";

const initial: PagamentosState = {};
const initialTest: TestState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";
const label = "text-[11px] uppercase tracking-[0.2em] text-content/50";

export type PagamentosSettings = {
  publicKey: string;
  hasToken: boolean;
  isTest: boolean;
};

export function PagamentosForm({ settings }: { settings: PagamentosSettings }) {
  const [state, action, pending] = useActionState(savePagamentos, initial);
  const [test, testAction, testing] = useActionState(testarConexao, initialTest);

  return (
    <div className="max-w-lg">
      {settings.hasToken && settings.isTest && (
        <p className="mb-6 border border-content/30 px-4 py-3 text-[12px] leading-relaxed text-content/70">
          Você está em <strong>modo de teste</strong>. Nenhuma cobrança real acontece. Troque pelas
          credenciais de produção antes de vender de verdade.
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <span className={label}>Credenciais do Mercado Pago</span>

        <div className="flex flex-col gap-1">
          <input
            name="publicKey"
            defaultValue={settings.publicKey}
            placeholder="Public Key (ex: APP_USR-xxxx)"
            className={input}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[11px] text-content/40">
            Pode ser pública. É usada no navegador para proteger os dados do cartão.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <input
            name="accessToken"
            type="password"
            placeholder={
              settings.hasToken
                ? "Access Token salvo (deixe em branco para manter)"
                : "Access Token (ex: APP_USR-xxxx)"
            }
            className={input}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[11px] text-content/40">
            Segredo. Fica guardado no servidor e nunca aparece no site nem volta para esta tela.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
          >
            {pending ? "Salvando..." : "Salvar credenciais"}
          </button>
          {state.ok && !state.warning && <span className="text-[13px] text-content/50">Salvo ✓</span>}
          {state.error && <span className="text-[13px] text-content/70">{state.error}</span>}
        </div>

        {state.warning && (
          <p className="border border-content/30 px-4 py-3 text-[12px] leading-relaxed text-content/70">
            {state.warning}
          </p>
        )}
      </form>

      {settings.hasToken && (
        <form action={testAction} className="mt-8 border-t border-content/10 pt-6">
          <span className={label}>Conferir conexão</span>
          <p className="mb-4 mt-2 text-[12px] text-content/40">
            Confirma com o Mercado Pago que a credencial funciona e mostra de qual conta ela é.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={testing}
              className="border border-content/30 px-5 py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
            >
              {testing ? "Conferindo..." : "Testar conexão"}
            </button>
            {test.ok && (
              <span className="text-[13px] text-content/60">
                Conectado: {test.account}
                {test.isTest ? " (modo teste)" : " (produção)"} ✓
              </span>
            )}
            {test.error && <span className="text-[13px] text-content/70">{test.error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
