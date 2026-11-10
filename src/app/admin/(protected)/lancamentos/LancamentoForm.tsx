"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { criarLancamento, type FinState } from "../socios/_actions";
import { parseReais } from "@/lib/financeiro-calc";

// Novo lançamento em passos, pensado para o celular.
//
// Cada passo faz uma pergunta só, com botões grandes, na língua de quem usa
// ("Comprei ou paguei algo", não "despesa"). O último passo mostra uma frase
// com tudo que vai ser lançado, para conferir antes de gravar: é ali que se
// pega o valor digitado errado.

type Tipo = "despesa" | "aporte" | "receita" | "devolucao_aporte" | "distribuicao_lucro";

const TIPOS: { v: Tipo; titulo: string; dica: string; principal: boolean }[] = [
  { v: "despesa", titulo: "Comprei ou paguei algo", dica: "Peças, insumos, prensa, anúncio, DAS, frete...", principal: true },
  { v: "aporte", titulo: "Coloquei dinheiro na empresa", dica: "Pix ou depósito na conta da ALBIZIA", principal: true },
  { v: "receita", titulo: "Entrou dinheiro fora do site", dica: "Venda em mãos, por exemplo", principal: true },
  { v: "devolucao_aporte", titulo: "A empresa devolveu a um sócio", dica: "Quem colocou a mais recebendo de volta", principal: false },
  { v: "distribuicao_lucro", titulo: "Dividir lucro", dica: "A parte do lucro paga a um sócio", principal: false },
];

const vazio: FinState = {};
const campo =
  "w-full border border-content/30 bg-transparent px-4 py-3.5 text-base outline-none focus:border-content";

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-full border px-4 py-2.5 text-[14px] transition-colors ${
        ativo ? "border-content bg-content text-surface" : "border-content/25 text-content/80 hover:border-content/60"
      }`}
    >
      {children}
    </button>
  );
}

function ontem(hoje: string) {
  const d = new Date(`${hoje}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function LancamentoForm({
  socios,
  categorias,
  formas,
  hoje,
  onFechar,
}: {
  socios: { id: string; nome: string }[];
  categorias: readonly string[];
  formas: readonly string[];
  hoje: string;
  onFechar: () => void;
}) {
  const [state, action, pending] = useActionState(criarLancamento, vazio);
  const [passo, setPasso] = useState(1);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hoje);
  const [quem, setQuem] = useState(""); // empresa | dividir | alguns | id do sócio
  const [marcados, setMarcados] = useState<string[]>([]); // quando quem = "alguns"
  const [socioId, setSocioId] = useState("");
  const [categoria, setCategoria] = useState("");
  const [forma, setForma] = useState("Pix");
  const [parcelas, setParcelas] = useState(1);
  const [fixa, setFixa] = useState(false); // conta fixa: repete todo mês
  const [meses, setMeses] = useState(12);
  const [fornecedor, setFornecedor] = useState("");
  const [mostrarOutros, setMostrarOutros] = useState(false);

  const despesa = tipo === "despesa";
  const deSocio = tipo === "aporte" || tipo === "devolucao_aporte" || tipo === "distribuicao_lucro";
  const centavos = parseReais(valor);
  const nomeSocio = (id: string) => socios.find((s) => s.id === id)?.nome.split(" ")[0] ?? "";
  const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  useEffect(() => {
    if (state.ok) setPasso(4);
  }, [state]);

  const podeAvancar2 = centavos !== null && centavos > 0 && descricao.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(data);
  const podeAvancar3 = despesa
    ? !!quem && !!categoria && (quem !== "alguns" || marcados.length >= 2)
    : deSocio
      ? !!socioId
      : true;
  // Nomes em ordem natural: "Nilson e Jair", "Nilson, Jair e Devid".
  const juntar = (nomes: string[]) =>
    nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  // Quanto cada marcado paga por parcela (ou no total, se for à vista).
  const parteDeCada =
    quem === "alguns" && marcados.length >= 2 && centavos
      ? Math.floor(Math.round(centavos / Math.max(1, parcelas)) / marcados.length)
      : null;

  // A frase de conferência: lê como alguém contaria o que aconteceu.
  const frase = useMemo(() => {
    if (!tipo || centavos === null) return "";
    const v = brl(centavos);
    const quando = data.split("-").reverse().join("/");
    const parc = despesa && fixa
      ? ` todo mês, por ${meses} meses`
      : despesa && parcelas > 1
        ? ` em ${parcelas}x de ${brl(Math.round(centavos / parcelas))}`
        : "";
    if (despesa) {
      const pagou =
        quem === "empresa"
          ? "A empresa pagou"
          : quem === "dividir"
            ? "Todos os sócios dividiram"
            : quem === "alguns"
              ? `${juntar(marcados.map(nomeSocio))} dividiram em partes iguais`
              : `${nomeSocio(quem)} pagou`;
      return `${pagou} ${v}${parc} em ${descricao.trim()} (${categoria}), no ${forma.toLowerCase()}, em ${quando}.`;
    }
    if (tipo === "aporte") return `${nomeSocio(socioId)} colocou ${v} na empresa (${descricao.trim()}), no ${forma.toLowerCase()}, em ${quando}.`;
    if (tipo === "receita") return `Entraram ${v} na empresa: ${descricao.trim()}, no ${forma.toLowerCase()}, em ${quando}.`;
    if (tipo === "devolucao_aporte") return `A empresa devolveu ${v} a ${nomeSocio(socioId)} (${descricao.trim()}), em ${quando}.`;
    return `${nomeSocio(socioId)} recebeu ${v} de lucro (${descricao.trim()}), em ${quando}.`;
  }, [tipo, centavos, data, despesa, parcelas, fixa, meses, quem, marcados, descricao, categoria, forma, socioId]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-content/55">
          {passo < 4 ? `Novo lançamento · passo ${passo} de 3` : "Pronto"}
        </p>
        <button type="button" onClick={onFechar} className="px-2 py-1 text-[12px] text-content/50 hover:text-content">
          Fechar
        </button>
      </div>

      {passo === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-lg">O que aconteceu?</p>
          {TIPOS.filter((t) => t.principal || mostrarOutros).map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => {
                setTipo(t.v);
                if (t.v !== "despesa") setParcelas(1);
                setPasso(2);
              }}
              className="border border-content/20 px-5 py-4 text-left transition-colors hover:border-content"
            >
              <span className="block text-base">{t.titulo}</span>
              <span className="mt-0.5 block text-[13px] text-content/50">{t.dica}</span>
            </button>
          ))}
          {!mostrarOutros && (
            <button type="button" onClick={() => setMostrarOutros(true)} className="py-2 text-[13px] text-content/55 underline underline-offset-4">
              Devolver a um sócio ou dividir lucro
            </button>
          )}
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-lg">{TIPOS.find((t) => t.v === tipo)?.titulo}</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-content/60">{despesa && parcelas > 1 ? "Valor total da compra" : "Valor"}</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" autoFocus className={`${campo} text-2xl`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-content/60">{despesa ? "O que foi comprado ou pago" : "Descrição"}</span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={despesa ? "Ex.: 50 peruanas lisas pretas" : "Ex.: Pix para repor estoque"}
              className={campo}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-content/60">Quando</span>
            <div className="flex flex-wrap gap-2">
              <Chip ativo={data === hoje} onClick={() => setData(hoje)}>Hoje</Chip>
              <Chip ativo={data === ontem(hoje)} onClick={() => setData(ontem(hoje))}>Ontem</Chip>
              <input type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} className="rounded-full border border-content/25 bg-transparent px-4 py-2 text-[14px]" />
            </div>
          </div>
          {valor && centavos === null && <p className="text-[13px] text-content/80">Valor não entendido. Digite como 1.234,56 ou 89,90.</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setPasso(1)} className="border border-content/25 px-5 py-3 text-[13px]">Voltar</button>
            <button type="button" disabled={!podeAvancar2} onClick={() => setPasso(3)} className="flex-1 bg-content py-3 text-[13px] uppercase tracking-[0.15em] text-surface disabled:opacity-30">
              Continuar
            </button>
          </div>
        </div>
      )}

      {passo === 3 && (
        <form action={action} className="flex flex-col gap-5">
          {/* Tudo que foi escolhido nos passos vai junto no envio. */}
          <input type="hidden" name="tipo" value={tipo ?? ""} />
          <input type="hidden" name="valor" value={valor} />
          <input type="hidden" name="descricao" value={descricao} />
          <input type="hidden" name="data" value={data} />
          <input type="hidden" name="quemPagou" value={quem === "alguns" ? `alguns:${marcados.join(",")}` : quem} />
          <input type="hidden" name="socioId" value={socioId} />
          <input type="hidden" name="categoria" value={categoria} />
          <input type="hidden" name="formaPagamento" value={forma} />
          <input type="hidden" name="parcelas" value={fixa ? 1 : parcelas} />
          {fixa && <input type="hidden" name="fixa" value="on" />}
          <input type="hidden" name="meses" value={meses} />
          <input type="hidden" name="fornecedor" value={fornecedor} />

          {despesa && (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-base">Quem pagou?</p>
                <div className="flex flex-wrap gap-2">
                  <Chip ativo={quem === "empresa"} onClick={() => setQuem("empresa")}>A empresa</Chip>
                  {socios.map((s) => (
                    <Chip key={s.id} ativo={quem === s.id} onClick={() => setQuem(s.id)}>{s.nome.split(" ")[0]}</Chip>
                  ))}
                  <Chip ativo={quem === "dividir"} onClick={() => setQuem("dividir")}>Todos os sócios</Chip>
                  <Chip ativo={quem === "alguns"} onClick={() => setQuem("alguns")}>Só alguns sócios</Chip>
                </div>
                {quem === "alguns" && (
                  <div className="mt-1 flex flex-col gap-2 border border-content/15 px-4 py-3">
                    <p className="text-[13px] text-content/60">Marque quem pagou. O valor é dividido em partes iguais só entre eles.</p>
                    <div className="flex flex-wrap gap-2">
                      {socios.map((s) => (
                        <Chip
                          key={s.id}
                          ativo={marcados.includes(s.id)}
                          onClick={() =>
                            setMarcados((m) => (m.includes(s.id) ? m.filter((x) => x !== s.id) : [...m, s.id]))
                          }
                        >
                          {marcados.includes(s.id) ? "✓ " : ""}
                          {s.nome.split(" ")[0]}
                        </Chip>
                      ))}
                    </div>
                    {parteDeCada !== null && (
                      <p className="text-[13px] text-content/75">
                        Cada um paga {brl(parteDeCada)}
                        {parcelas > 1 ? " por parcela" : ""}.
                      </p>
                    )}
                    {marcados.length === 1 && (
                      <p className="text-[13px] text-content/75">Marque pelo menos dois, ou escolha o nome dele lá em cima.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-base">Em quê?</p>
                <div className="flex flex-wrap gap-2">
                  {categorias.map((c) => (
                    <Chip key={c} ativo={categoria === c} onClick={() => setCategoria(c)}>{c}</Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {deSocio && (
            <div className="flex flex-col gap-2">
              <p className="text-base">{tipo === "aporte" ? "Quem colocou?" : "Para qual sócio?"}</p>
              <div className="flex flex-wrap gap-2">
                {socios.map((s) => (
                  <Chip key={s.id} ativo={socioId === s.id} onClick={() => setSocioId(s.id)}>{s.nome.split(" ")[0]}</Chip>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-base">Como foi pago?</p>
            <div className="flex flex-wrap gap-2">
              {formas.map((f) => (
                <Chip
                  key={f}
                  ativo={forma === f}
                  onClick={() => {
                    setForma(f);
                    // Só cartão de crédito parcela: trocar de forma volta para à vista.
                    if (f !== "Cartão de crédito") setParcelas(1);
                  }}
                >
                  {f}
                </Chip>
              ))}
            </div>
          </div>

          {despesa && (
            <div className="flex flex-col gap-2">
              <p className="text-base">Conta fixa?</p>
              <div className="flex flex-wrap gap-2">
                <Chip ativo={!fixa} onClick={() => setFixa(false)}>Não, só esta vez</Chip>
                <Chip
                  ativo={fixa}
                  onClick={() => {
                    setFixa(true);
                    setParcelas(1);
                  }}
                >
                  Sim, repete todo mês
                </Chip>
              </div>
              {fixa && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setMeses((m) => Math.max(2, m - 1))} className="h-11 w-11 border border-content/30 text-lg" aria-label="Menos meses">−</button>
                    <span className="min-w-[110px] text-center text-base">{meses} meses</span>
                    <button type="button" onClick={() => setMeses((m) => Math.min(24, m + 1))} className="h-11 w-11 border border-content/30 text-lg" aria-label="Mais meses">+</button>
                  </div>
                  <p className="text-[12px] leading-relaxed text-content/50">
                    O mesmo valor todo mês, no mesmo dia da data escolhida (DAS, domínio, internet). Cada mês aparece em
                    Contas a pagar e gera lembrete no dia.
                  </p>
                </div>
              )}
            </div>
          )}

          {despesa && !fixa && forma === "Cartão de crédito" && (
            <div className="flex flex-col gap-2">
              <p className="text-base">Parcelado?</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setParcelas((p) => Math.max(1, p - 1))} className="h-11 w-11 border border-content/30 text-lg" aria-label="Menos parcelas">−</button>
                <span className="min-w-[90px] text-center text-base">{parcelas === 1 ? "À vista" : `${parcelas}x`}</span>
                <button type="button" onClick={() => setParcelas((p) => Math.min(48, p + 1))} className="h-11 w-11 border border-content/30 text-lg" aria-label="Mais parcelas">+</button>
              </div>
              {parcelas > 1 && (
                <p className="text-[12px] leading-relaxed text-content/50">
                  Vira uma parcela por mês a partir da data escolhida. As já vencidas entram como pagas; as futuras aparecem
                  em Contas a pagar, e cada um toca em Pagar quando pagar a sua parte.
                </p>
              )}
            </div>
          )}

          {despesa && (
            <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Onde comprou (opcional)" className={campo} />
          )}

          {podeAvancar3 && frase && (
            <div className="border border-content/25 bg-content/[0.03] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-content/50">Confira</p>
              <p className="mt-1.5 text-[15px] leading-relaxed">{frase}</p>
            </div>
          )}

          {state.error && <p className="text-[14px] text-content/85">{state.error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setPasso(2)} className="border border-content/25 px-5 py-3 text-[13px]">Voltar</button>
            <button type="submit" disabled={!podeAvancar3 || pending} className="flex-1 bg-content py-3 text-[13px] uppercase tracking-[0.15em] text-surface disabled:opacity-30">
              {pending ? "Lançando..." : "Lançar"}
            </button>
          </div>
        </form>
      )}

      {passo === 4 && (
        <div className="flex flex-col gap-4">
          <p className="text-lg">Lançado</p>
          <p className="text-[14px] leading-relaxed text-content/70">{state.mensagem}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPasso(1);
                setTipo(null);
                setValor("");
                setDescricao("");
                setQuem("");
                setSocioId("");
                setCategoria("");
                setParcelas(1);
                setFornecedor("");
              }}
              className="flex-1 border border-content py-3 text-[13px] uppercase tracking-[0.15em]"
            >
              Lançar outro
            </button>
            <button type="button" onClick={onFechar} className="flex-1 bg-content py-3 text-[13px] uppercase tracking-[0.15em] text-surface">
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
