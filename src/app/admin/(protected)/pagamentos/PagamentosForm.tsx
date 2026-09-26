"use client";

import { useActionState } from "react";
import {
  savePagamentos,
  saveMpApp,
  desconectarMp,
  testarConexao,
  type PagamentosState,
  type AppState,
  type TestState,
} from "./_actions";

const initial: PagamentosState = {};
const initialApp: AppState = {};
const initialTest: TestState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";
const label = "text-[11px] uppercase tracking-[0.2em] text-content/50";
const semAutoFill = {
  // O navegador via um campo de senha e enchia tudo com o e-mail e a senha
  // salvos do painel. "off" ele ignora em campo de senha; "new-password" não.
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  spellCheck: false as const,
};

export type PagamentosSettings = {
  publicKey: string;
  hasToken: boolean;
  appConfigurada: boolean;
  clientId: string;
  conectada: boolean;
  contaId: string;
  conectadaEm: string | null;
};

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PagamentosForm({ settings }: { settings: PagamentosSettings }) {
  const [state, action, pending] = useActionState(savePagamentos, initial);
  const [app, appAction, appPending] = useActionState(saveMpApp, initialApp);
  const [test, testAction, testing] = useActionState(testarConexao, initialTest);

  return (
    <div className="max-w-lg">
      {/* ── Caminho principal: conectar a conta por autorização ────────── */}
      <div className="border border-content/20 p-5">
        <p className={label}>Conta que recebe as vendas</p>

        {settings.conectada ? (
          <>
            <p className="mt-3 text-sm text-content">Conta conectada ✓</p>
            <p className="mt-1 text-[12px] text-content/45">
              Mercado Pago nº {settings.contaId}
              {settings.conectadaEm ? ` · desde ${dataCurta(settings.conectadaEm)}` : ""}
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-content/50">
              O dinheiro das vendas cai nessa conta. A autorização se renova sozinha, você não
              precisa fazer nada.
            </p>
            <form action={desconectarMp} className="mt-4">
              <button
                type="submit"
                className="border border-content/30 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-content/60 transition-colors hover:border-content hover:text-content"
              >
                Desconectar
              </button>
            </form>
          </>
        ) : settings.appConfigurada ? (
          <>
            <p className="mt-3 text-[12px] leading-relaxed text-content/55">
              Clique abaixo e faça login na conta do Mercado Pago que deve receber as vendas (a
              conta da empresa). Você autoriza uma vez e pronto, sem copiar chave nenhuma.
            </p>
            <a
              href="/api/mercadopago/oauth/start"
              className="mt-4 inline-block border border-content bg-content px-6 py-3 text-[13px] uppercase tracking-[0.15em] text-surface transition-opacity hover:opacity-90"
            >
              Conectar conta do Mercado Pago
            </a>
          </>
        ) : (
          <p className="mt-3 text-[12px] leading-relaxed text-content/55">
            Antes de conectar, é preciso informar a aplicação do Mercado Pago, logo abaixo. É uma
            configuração única de quem desenvolve.
          </p>
        )}
      </div>

      {/* ── Configuração única da aplicação ─────────────────────────────── */}
      <details className="mt-6 border border-content/20" open={!settings.appConfigurada}>
        <summary className="cursor-pointer px-4 py-3 text-[12px] uppercase tracking-[0.15em] text-content/70">
          Aplicação do Mercado Pago {settings.appConfigurada ? "✓" : "(configurar)"}
        </summary>
        <div className="border-t border-content/10 px-4 py-4">
          <p className="mb-4 text-[12px] leading-relaxed text-content/50">
            A aplicação vive na conta de quem desenvolve e serve só para identificar a loja perante
            o Mercado Pago. Ela não recebe dinheiro. Pegue os dois valores em{" "}
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-content"
            >
              developers/panel/app
            </a>
            , abrindo a aplicação e depois Credenciais.
          </p>

          <form action={appAction} className="flex flex-col gap-3">
            <input
              name="clientId"
              defaultValue={settings.clientId}
              inputMode="numeric"
              placeholder="Número da aplicação (só dígitos)"
              className={input}
              autoComplete="off"
              {...semAutoFill}
            />
            <input
              name="clientSecret"
              type="password"
              placeholder={
                settings.appConfigurada
                  ? "Client Secret salvo (deixe em branco para manter)"
                  : "Client Secret"
              }
              className={input}
              autoComplete="new-password"
              {...semAutoFill}
            />
            <p className="text-[11px] text-content/40">
              Em <strong className="font-medium">Redirect URI</strong>, na aplicação, cadastre
              exatamente: <br />
              <code className="text-content/60">
                https://www.usealbizia.com.br/api/mercadopago/oauth/callback
              </code>
            </p>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={appPending}
                className="border border-content px-5 py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
              >
                {appPending ? "Salvando..." : "Salvar aplicação"}
              </button>
              {app.ok && <span className="text-[13px] text-content/50">Salvo ✓</span>}
              {app.error && <span className="text-[13px] text-content/70">{app.error}</span>}
            </div>
          </form>
        </div>
      </details>

      {/* ── Caminho alternativo: colar credencial à mão ─────────────────── */}
      <details className="mt-6 border border-content/20">
        <summary className="cursor-pointer px-4 py-3 text-[12px] uppercase tracking-[0.15em] text-content/70">
          Alternativa: colar credenciais à mão
        </summary>
        <div className="border-t border-content/10 px-4 py-4">
          <p className="mb-4 text-[12px] leading-relaxed text-content/50">
            Só é necessário se a loja receber na mesma conta onde a aplicação vive. Conectar pelo
            botão acima é melhor: a autorização se renova sozinha e o Mercado Pago informa se é
            produção ou teste, coisa que a chave sozinha não diz.
          </p>

          <form action={action} className="flex flex-col gap-3">
            <input
              name="publicKey"
              defaultValue={settings.publicKey}
              placeholder="Public Key"
              className={input}
              autoComplete="off"
              {...semAutoFill}
            />
            <input
              name="accessToken"
              type="password"
              placeholder={
                settings.hasToken
                  ? "Access Token salvo (deixe em branco para manter)"
                  : "Access Token"
              }
              className={input}
              autoComplete="new-password"
              {...semAutoFill}
            />
            <p className="text-[11px] leading-relaxed text-content/40">
              No painel do Mercado Pago há um seletor{" "}
              <strong className="font-medium">Teste / Produtivas</strong> acima das chaves. As duas
              começam com APP_USR-, então não existe como diferenciar olhando a chave, nem aqui nem
              em lugar nenhum. Confira que está em Produtivas antes de copiar.
            </p>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={pending}
                className="border border-content px-5 py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
              >
                {pending ? "Salvando..." : "Salvar credenciais"}
              </button>
              {state.ok && !state.warning && (
                <span className="text-[13px] text-content/50">Salvo ✓</span>
              )}
              {state.error && <span className="text-[13px] text-content/70">{state.error}</span>}
            </div>
            {state.warning && (
              <p className="border border-content/30 px-4 py-3 text-[12px] leading-relaxed text-content/70">
                {state.warning}
              </p>
            )}
          </form>

          {settings.hasToken && (
            <form action={testAction} className="mt-6 border-t border-content/10 pt-5">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={testing}
                  className="border border-content/30 px-5 py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
                >
                  {testing ? "Conferindo..." : "Testar conexão"}
                </button>
                {test.ok && (
                  <span className="text-[13px] text-content/60">Conectado: {test.account} ✓</span>
                )}
                {test.error && <span className="text-[13px] text-content/70">{test.error}</span>}
              </div>
            </form>
          )}
        </div>
      </details>
    </div>
  );
}
