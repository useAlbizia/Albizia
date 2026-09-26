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

      {/* Onde achar as credenciais. Sem isto a tela pede duas chaves sem
          dizer de onde saem, e a conta "de desenvolvedor" parece ser outra
          conta (não é: é a mesma que recebe o dinheiro). */}
      <details className="mb-6 border border-content/20">
        <summary className="cursor-pointer px-4 py-3 text-[12px] uppercase tracking-[0.15em] text-content/70">
          Onde encontrar essas credenciais
        </summary>
        <div className="border-t border-content/10 px-4 py-4 text-[12px] leading-relaxed text-content/55">
          <p className="mb-3">
            É a <strong className="font-medium">mesma conta</strong> do Mercado Pago que recebe o
            dinheiro. Não existe conta de desenvolvedor separada: o painel de desenvolvedores é
            uma área dentro da sua conta normal.
          </p>
          <ol className="flex list-decimal flex-col gap-1.5 pl-4">
            <li>
              Abra{" "}
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-content"
              >
                mercadopago.com.br/developers/panel/app
              </a>{" "}
              e entre com a conta que recebe as vendas.
            </li>
            <li>Clique na sua aplicação. Se não houver nenhuma, crie uma (qualquer nome serve).</li>
            <li>
              No menu lateral, abra <strong className="font-medium">Credenciais de produção</strong>.
            </li>
            <li>Copie a Public Key e o Access Token para os campos abaixo e salve.</li>
            <li>
              Clique em <strong className="font-medium">Testar conexão</strong>: ele confirma de
              qual conta é a credencial e se é produção ou teste.
            </li>
          </ol>
          <p className="mt-3">
            Credencial de <strong className="font-medium">teste</strong> não recebe dinheiro de
            verdade, só simula com cartões fictícios. Para vender mesmo, use as de produção.
          </p>
        </div>
      </details>

      <form action={action} className="flex flex-col gap-4">
        <span className={label}>Credenciais do Mercado Pago</span>

        <div className="flex flex-col gap-1">
          <input
            name="publicKey"
            defaultValue={settings.publicKey}
            placeholder="Public Key (ex: APP_USR-xxxx)"
            className={input}
            // O navegador via um campo de senha logo abaixo e enchia estes
            // dois com o e-mail e a senha salvos do dono. Estes atributos
            // desligam isso no Chrome, no 1Password e no LastPass.
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
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
            // "new-password" é o que o Chrome respeita. Com "off" ele ignora
            // e oferece a senha salva do próprio painel, que foi o que
            // aconteceu: o navegador enchia estes campos com e-mail e senha.
            autoComplete="new-password"
            data-1p-ignore="true"
            data-lpignore="true"
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
