"use client";

import { useActionState, useState } from "react";
import {
  saveFrete,
  testarConexaoFrete,
  type FreteState,
  type FreteTestState,
} from "./_actions";

const initial: FreteState = {};
const initialTest: FreteTestState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";
const label = "text-[11px] uppercase tracking-[0.2em] text-content/50";

export type FreteSettings = {
  method: "flat" | "melhor_envio";
  flatReais: string;
  freeThresholdReais: string;
  meFromCep: string;
  hasToken: boolean;
  tokenNoAmbiente: boolean;
  meEnvironment: "production" | "sandbox";
  meWeight: number;
  meLength: number;
  meWidth: number;
  meHeight: number;
  meFromName: string;
  meFromDocument: string;
  meFromPhone: string;
  meFromEmail: string;
  meFromAddress: string;
  meFromNumber: string;
  meFromComplement: string;
  meFromDistrict: string;
  meFromCity: string;
  meFromState: string;
  /** O que ainda impede emitir etiqueta. Vazio = pronto. */
  falta: string[];
};

export function FreteForm({ settings }: { settings: FreteSettings }) {
  const [state, action, pending] = useActionState(saveFrete, initial);
  const [test, testAction, testing] = useActionState(testarConexaoFrete, initialTest);
  const [method, setMethod] = useState(settings.method);

  return (
    <div className="max-w-lg">
    <form action={action} className="flex flex-col gap-4">
      <span className={label}>Método de frete</span>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="method" value="flat" checked={method === "flat"} onChange={() => setMethod("flat")} className="accent-content" />
          Frete fixo (valor único configurado abaixo)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="method" value="melhor_envio" checked={method === "melhor_envio"} onChange={() => setMethod("melhor_envio")} className="accent-content" />
          Melhor Envio (cotação real por CEP: Correios, Jadlog etc.)
        </label>
      </div>

      <span className={`${label} mt-3`}>Valores</span>
      <input name="flat" type="number" step="0.01" min="0" defaultValue={settings.flatReais} placeholder="Frete fixo em R$ (0 = grátis)" className={input} />
      <input name="freeThreshold" type="number" step="0.01" min="0" defaultValue={settings.freeThresholdReais} placeholder="Frete grátis acima de R$ (0 = desativado)" className={input} />
      <p className="-mt-1 text-[11px] text-content/40">
        O frete fixo vale para o método &quot;fixo&quot; e como reserva caso o Melhor Envio esteja
        indisponível. O frete grátis acima do valor vale para os dois métodos.
      </p>

      {method === "melhor_envio" && (
        <>
          <span className={`${label} mt-3`}>Melhor Envio</span>

          {settings.tokenNoAmbiente ? (
            // Token vindo da Vercel: o campo abaixo seria mentira, porque o
            // que vale é a variável de ambiente. Melhor dizer onde ele está.
            <p className="border border-content/20 px-4 py-3 text-[12px] leading-relaxed text-content/55">
              O token está na variável de ambiente <code>TOKEN_MELHOR_ENVIOS</code>, na Vercel. É o
              lugar certo dele: credencial não fica em banco, que aparece em backup. Para trocar,
              troque lá e faça um Redeploy.
            </p>
          ) : (
            <input
              name="meToken"
              type="password"
              placeholder={settings.hasToken ? "Token salvo (deixe em branco para manter)" : "Token de API do Melhor Envio"}
              className={input}
              // O navegador oferecia a senha salva do painel aqui dentro:
              // "off" ele ignora em campo de senha, "new-password" ele respeita.
              autoComplete="new-password"
              data-1p-ignore="true"
              data-lpignore="true"
              spellCheck={false}
            />
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="meEnvironment"
              value="sandbox"
              defaultChecked={settings.meEnvironment === "sandbox"}
              className="accent-content"
            />
            Usar o ambiente de testes (sandbox)
          </label>
          <p className="-mt-1 text-[11px] leading-relaxed text-content/40">
            Sandbox é outra conta do Melhor Envio, com token próprio em{" "}
            <code>TOKEN_MELHOR_ENVIOS_SANDBOX</code>. Só tem Correios e Jadlog, e os preços não são
            reais. Com isto ligado a loja não despacha de verdade.
          </p>

          <input name="meFromCep" defaultValue={settings.meFromCep} placeholder="CEP de origem (de onde você envia)" className={input} />

          <span className={`${label} mt-3`}>Remetente</span>
          <p className="-mt-2 text-[11px] leading-relaxed text-content/40">
            Cotar frete precisa só do CEP acima. <strong>Comprar etiqueta exige tudo isto</strong>,
            e o Melhor Envio recusa o envio se faltar um campo.
          </p>
          {settings.falta.length > 0 && (
            <p className="border border-content/25 px-4 py-3 text-[12px] leading-relaxed text-content/60">
              Faltam {settings.falta.length} dado(s) para emitir etiqueta: {settings.falta.join(", ")}.
            </p>
          )}
          <input name="meFromName" defaultValue={settings.meFromName} placeholder="Nome ou razão social" className={input} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input name="meFromDocument" defaultValue={settings.meFromDocument} placeholder="CNPJ do MEI" inputMode="numeric" className={input} />
            <input name="meFromPhone" defaultValue={settings.meFromPhone} placeholder="Telefone" className={input} />
          </div>
          <input name="meFromEmail" type="email" defaultValue={settings.meFromEmail} placeholder="E-mail" className={input} autoComplete="off" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <input name="meFromAddress" defaultValue={settings.meFromAddress} placeholder="Rua" className={input} />
            <input name="meFromNumber" defaultValue={settings.meFromNumber} placeholder="Número" className={input} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input name="meFromComplement" defaultValue={settings.meFromComplement} placeholder="Complemento (opcional)" className={input} />
            <input name="meFromDistrict" defaultValue={settings.meFromDistrict} placeholder="Bairro" className={input} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_100px]">
            <input name="meFromCity" defaultValue={settings.meFromCity} placeholder="Cidade" className={input} />
            <input name="meFromState" defaultValue={settings.meFromState} placeholder="UF" maxLength={2} className={`${input} uppercase`} />
          </div>

          <span className={`${label} mt-2`}>Pacote padrão</span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input name="meWeight" type="number" min="1" defaultValue={settings.meWeight} placeholder="Peso (g)" className={input} title="Peso por item (g)" />
            <input name="meLength" type="number" min="1" defaultValue={settings.meLength} placeholder="Compr. (cm)" className={input} />
            <input name="meWidth" type="number" min="1" defaultValue={settings.meWidth} placeholder="Largura (cm)" className={input} />
            <input name="meHeight" type="number" min="1" defaultValue={settings.meHeight} placeholder="Altura (cm)" className={input} title="Altura por item (cm)" />
          </div>
          <p className="-mt-1 text-[11px] text-content/40">
            Crie um token em melhorenvio.com.br → Integrações → Tokens (permissões de cotação). O
            peso/altura são multiplicados pela quantidade de itens.
          </p>
        </>
      )}

      <div className="mt-2 flex items-center gap-4">
        <button type="submit" disabled={pending} className="border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar frete"}
        </button>
        {state.ok && <span className="text-[13px] text-content/50">Salvo ✓</span>}
        {state.error && <span className="text-[13px] text-content/70">{state.error}</span>}
      </div>
    </form>

    {/* `hasToken` olha só o banco. Com o token na Vercel ele é falso, e sem
        esta segunda condição o botão de testar sumiria justamente na
        configuração correta. */}
    {method === "melhor_envio" && (settings.hasToken || settings.tokenNoAmbiente) && (
      <form action={testAction} className="mt-8 border-t border-content/10 pt-6">
        <span className={label}>Conferir conexão</span>
        <p className="mb-4 mt-2 text-[12px] text-content/40">
          Confirma com o Melhor Envio que o token funciona e mostra de qual conta ele é. Sem isso,
          um token errado só aparece quando um cliente tenta calcular o frete e não recebe opção
          nenhuma.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={testing}
            className="border border-content/30 px-5 py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
          >
            {testing ? "Conferindo..." : "Testar conexão"}
          </button>
          {test.ok && (
            <span className="text-[13px] text-content/60">
              Conectado: {test.account} · {test.ambiente} ✓
            </span>
          )}
          {test.error && <span className="text-[13px] text-content/70">{test.error}</span>}
        </div>
        {test.ok && test.falta && test.falta.length > 0 && (
          <p className="mt-3 text-[12px] leading-relaxed text-content/55">
            A cotação já funciona. Para <strong>emitir etiqueta</strong> ainda faltam:{" "}
            {test.falta.join(", ")}.
          </p>
        )}
        {test.ok && test.falta && test.falta.length === 0 && (
          <p className="mt-3 text-[12px] text-content/55">
            Cotação e emissão de etiqueta prontas.
          </p>
        )}
      </form>
    )}
    </div>
  );
}
