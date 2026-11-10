"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Tour guiado do painel: um cartão com "Voltar / Próximo" que leva a pessoa
// pelas telas principais e destaca a parte que importa em cada uma.
//
// Atravessa telas: cada passo diz em que rota ele mora, e o "Próximo" navega
// até lá. O progresso fica no navegador, então recarregar a página não perde
// o lugar. Na primeira visita a um navegador ele começa sozinho; depois só
// pelo Manual.
//
// Quando a parte destacada não existe ou não está visível (no celular o menu
// fica escondido atrás do botão), o passo aparece como cartão no centro em vez
// de apontar para o vazio.

type Passo = { rota: string; alvos: string[]; titulo: string; texto: string };

const PASSOS: Passo[] = [
  {
    rota: "/admin",
    alvos: [],
    titulo: "Bem-vindo ao painel da ALBIZIA",
    texto:
      "Daqui vocês cuidam da loja inteira: pedidos, produtos, estoque, frete, o dinheiro da empresa e o de cada sócio. Este tour leva uns dois minutos. Dá para sair a qualquer momento e repetir depois pelo Manual.",
  },
  {
    rota: "/admin",
    alvos: ["menu", "menu-celular"],
    titulo: "O menu",
    texto:
      "Tudo fica agrupado: Dia a dia para pedidos e lançamentos, Dinheiro para sócios e fechamento, Clientes, Loja para produtos e vitrine, Ajustes para o resto. Um número ao lado do item mostra o que espera por você. No celular, o menu abre pelo botão de três linhas.",
  },
  {
    rota: "/admin/pedidos",
    alvos: ["pedidos-busca"],
    titulo: "Pedidos",
    texto:
      "Cada venda do site aparece aqui. A busca acha o pedido pelo número, nome, e-mail, telefone ou CPF. A coluna Etiqueta mostra \"emitir\" nos pagos que ainda precisam sair: é a fila de trabalho do dia.",
  },
  {
    rota: "/admin/lancamentos",
    alvos: ["lancar"],
    titulo: "Lançar um gasto ou uma entrada",
    texto:
      "Toque em Novo lançamento e responda três perguntas: o que aconteceu, quanto e quem pagou. No fim aparece uma frase com tudo para conferir. O lançamento de um sócio entra nas contas quando mais um sócio aprova; os outros recebem aviso, e qualquer um pode contestar. Vendas do site, taxas e etiquetas entram sozinhas.",
  },
  {
    rota: "/admin/socios",
    alvos: ["socios-tabela"],
    titulo: "Sócios e caixa",
    texto:
      "Quanto cada um colocou, a parte justa de cada um (o total dividido pela participação de cada sócio) e quem tem a receber. Logo abaixo o painel diz o acerto exato para equilibrar os três. Nada aqui é digitado: tudo vem dos lançamentos.",
  },
  {
    rota: "/admin/fechamento",
    alvos: ["resultado"],
    titulo: "Fechamento do mês",
    texto:
      "Se o mês deu lucro ou prejuízo, já descontando custo das peças, taxas, etiquetas e o DAS. Também mostra a meta, o caixa do começo ao fim do mês e quanto é preciso vender para não ter prejuízo. As setas no topo trocam o mês.",
  },
  {
    rota: "/admin/insumos",
    alvos: ["insumo-novo"],
    titulo: "Insumos",
    texto:
      "Peça lisa, DTF, autorrelevo, etiqueta, tag, embalagem. Digite o que pagou pelo lote e quantos vieram: o custo de cada unidade aparece na hora, sem arredondar.",
  },
  {
    rota: "/admin/produtos",
    alvos: ["produtos-lista"],
    titulo: "Produtos e ficha técnica",
    texto:
      "Abra um produto para editar preço, fotos, estoque por tamanho e a ficha técnica: quanto de cada insumo vai em uma peça. Com a ficha, o custo da peça é calculado sozinho e o lucro de cada venda fica exato.",
  },
  {
    rota: "/admin/manual",
    alvos: [],
    titulo: "Pronto",
    texto:
      "Este é o Manual: tem o passo a passo de cada tarefa, como instalar o painel como aplicativo no celular e como entrar. O tour pode ser repetido daqui sempre que quiser.",
  },
];

const CHAVE_ESTADO = "albizia-tour";
const CHAVE_VISTO = "albizia-tour-visto";
const EVENTO = "albizia-tour-iniciar";

type Estado = { ativo: boolean; passo: number };

function ler(): Estado {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_ESTADO) ?? "null");
    if (v && typeof v.passo === "number") return { ativo: !!v.ativo, passo: Math.min(Math.max(0, v.passo), PASSOS.length - 1) };
  } catch {
    // Armazenamento bloqueado ou valor estragado: começa do zero.
  }
  return { ativo: false, passo: 0 };
}
function gravar(e: Estado) {
  try {
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(e));
  } catch {}
}

/** Para o botão do Manual: recomeça o tour do primeiro passo. */
export function iniciarTour() {
  gravar({ ativo: true, passo: 0 });
  window.dispatchEvent(new Event(EVENTO));
}

function visivel(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
}

export function TourPainel() {
  const pathname = usePathname();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ ativo: false, passo: 0 });
  const [caixa, setCaixa] = useState<DOMRect | null>(null);
  const cartao = useRef<HTMLDivElement>(null);

  // Primeira visita a este navegador: começa sozinho, uma vez.
  useEffect(() => {
    let e = ler();
    try {
      if (!localStorage.getItem(CHAVE_VISTO)) {
        localStorage.setItem(CHAVE_VISTO, "1");
        e = { ativo: true, passo: 0 };
        gravar(e);
      }
    } catch {}
    setEstado(e);
    const reiniciar = () => setEstado(ler());
    window.addEventListener(EVENTO, reiniciar);
    return () => window.removeEventListener(EVENTO, reiniciar);
  }, []);

  const passo = PASSOS[estado.passo];
  const naRota = !!passo && pathname === passo.rota;

  // Encontra a parte da tela a destacar, e acompanha rolagem e redimensionamento.
  useLayoutEffect(() => {
    if (!estado.ativo || !naRota) {
      setCaixa(null);
      return;
    }
    let el: HTMLElement | null = null;
    const achar = () => {
      el = null;
      for (const a of passo.alvos) {
        const c = document.querySelector(`[data-tour="${a}"]`);
        if (visivel(c)) {
          el = c;
          break;
        }
      }
      setCaixa(el ? el.getBoundingClientRect() : null);
    };
    achar();
    // A página pode ainda estar montando os dados; tenta de novo um instante depois.
    const t = setTimeout(() => {
      achar();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(achar, 400);
    }, 150);
    window.addEventListener("resize", achar);
    window.addEventListener("scroll", achar, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", achar);
      window.removeEventListener("scroll", achar, true);
    };
  }, [estado.ativo, naRota, passo]);

  const ir = useCallback(
    (n: number) => {
      if (n >= PASSOS.length) {
        const fim = { ativo: false, passo: 0 };
        gravar(fim);
        setEstado(fim);
        return;
      }
      const novo = { ativo: true, passo: Math.max(0, n) };
      gravar(novo);
      setEstado(novo);
      if (PASSOS[novo.passo].rota !== pathname) router.push(PASSOS[novo.passo].rota);
    },
    [pathname, router],
  );

  const fechar = useCallback(() => {
    const fim = { ativo: false, passo: 0 };
    gravar(fim);
    setEstado(fim);
  }, []);

  // Esc fecha; setas andam. Foco vai para o cartão, para teclado e leitor de tela.
  useEffect(() => {
    if (!estado.ativo) return;
    cartao.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") ir(estado.passo + 1);
      if (e.key === "ArrowLeft" && estado.passo > 0) ir(estado.passo - 1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [estado, ir, fechar]);

  if (!estado.ativo || !passo) return null;

  const ultimo = estado.passo === PASSOS.length - 1;
  const folga = 8;
  // Cartão perto da parte destacada no computador; no celular, sempre
  // embaixo da tela, onde o polegar alcança e nada fica coberto.
  const estiloCartao: React.CSSProperties = {};
  const largo = typeof window !== "undefined" && window.innerWidth >= 640;
  if (caixa && largo) {
    const abaixo = caixa.bottom + 260 < window.innerHeight;
    estiloCartao.left = Math.min(Math.max(16, caixa.left), window.innerWidth - 400);
    if (abaixo) estiloCartao.top = caixa.bottom + folga + 6;
    else estiloCartao.bottom = window.innerHeight - caixa.top + folga + 6;
  }

  return (
    <div className="fixed inset-0 z-[90]" aria-live="polite">
      {caixa ? (
        // O "buraco" de luz: uma moldura com uma sombra enorme escurece tudo
        // em volta e deixa só a parte certa clara.
        <div
          className="pointer-events-none absolute rounded-sm transition-all duration-300"
          style={{
            left: caixa.left - folga,
            top: caixa.top - folga,
            width: caixa.width + folga * 2,
            height: caixa.height + folga * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      <div
        ref={cartao}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={passo.titulo}
        style={estiloCartao}
        className={`absolute w-[calc(100%-2rem)] max-w-sm border border-content/15 bg-surface p-5 text-content shadow-2xl outline-none ${
          caixa && largo
            ? ""
            : caixa
              ? "inset-x-4 bottom-4 mx-auto"
              : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-content/45">
          Passo {estado.passo + 1} de {PASSOS.length}
        </p>
        <h2 className="mt-1 text-base">{passo.titulo}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">{passo.texto}</p>

        {!naRota && (
          <button
            type="button"
            onClick={() => router.push(passo.rota)}
            className="mt-3 text-[12px] underline underline-offset-4 text-content/70 hover:text-content"
          >
            Ir para esta tela
          </button>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={fechar} className="text-[11px] uppercase tracking-[0.12em] text-content/45 hover:text-content">
            Sair do tour
          </button>
          <div className="flex gap-2">
            {estado.passo > 0 && (
              <button
                type="button"
                onClick={() => ir(estado.passo - 1)}
                className="border border-content/30 px-3 py-2 text-[11px] uppercase tracking-[0.12em] hover:border-content"
              >
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={() => ir(estado.passo + 1)}
              className="border border-content bg-content px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-surface"
            >
              {ultimo ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
