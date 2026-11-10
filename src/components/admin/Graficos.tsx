// Gráficos do painel, em SVG puro, nas cores do tema (claro e escuro sem
// trocar nada: tudo usa a cor do texto, currentColor).
//
// Regras seguidas: uma medida por gráfico (nunca dois eixos), barras finas
// com a base no zero, grade discreta, o valor de cada barra ao passar o dedo
// ou o mouse, e uma tabela com os números logo abaixo, para quem prefere ler
// a ver. Valor negativo nunca é indicado só pela cor: ganha sinal e textura.

type Ponto = { rotulo: string; valor: number; dica?: string };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const curto = (c: number) => {
  const r = Math.abs(c) / 100;
  const s = r >= 1000 ? `${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : r.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return `${c < 0 ? "−" : ""}R$ ${s}`;
};

/** Barras verticais por período. Aceita valores negativos (prejuízo). */
export function BarrasMensais({ titulo, pontos, id }: { titulo: string; pontos: Ponto[]; id: string }) {
  const L = 320;
  const A = 150;
  const topo = 14;
  const base = 22;
  const max = Math.max(0, ...pontos.map((p) => p.valor));
  const min = Math.min(0, ...pontos.map((p) => p.valor));
  const faixa = max - min || 1;
  const altUtil = A - topo - base;
  const y = (v: number) => topo + ((max - v) / faixa) * altUtil;
  const zero = y(0);
  const passo = L / pontos.length;
  const largura = Math.min(28, passo * 0.5);
  const ultimo = pontos[pontos.length - 1];

  return (
    <figure className="border border-content/15 px-4 pb-3 pt-4">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-content/60">{titulo}</span>
        {ultimo && <span className="text-[13px]">{brl(ultimo.valor)} <span className="text-content/45">este mês</span></span>}
      </figcaption>
      <svg viewBox={`0 0 ${L} ${A}`} className="mt-2 block h-auto w-full text-content" role="img" aria-label={`${titulo}: ${pontos.map((p) => `${p.rotulo} ${brl(p.valor)}`).join(", ")}`}>
        <defs>
          {/* Textura do valor negativo: o prejuízo não depende de cor para ser visto. */}
          <pattern id={`hachura-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="currentColor" opacity="0.12" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
          </pattern>
        </defs>
        {/* Linha do zero, discreta. */}
        <line x1="0" x2={L} y1={zero} y2={zero} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
        {pontos.map((p, i) => {
          const cx = passo * i + passo / 2;
          const yTopo = p.valor >= 0 ? y(p.valor) : zero;
          const h = Math.max(p.valor === 0 ? 0 : 1.5, Math.abs(y(p.valor) - zero));
          const atual = i === pontos.length - 1;
          return (
            <g key={p.rotulo}>
              <title>{`${p.rotulo}: ${brl(p.valor)}${p.dica ? ` · ${p.dica}` : ""}`}</title>
              {/* Área de toque maior que a barra, para o celular. */}
              <rect x={cx - passo / 2} y={0} width={passo} height={A - base} fill="transparent" />
              <rect
                x={cx - largura / 2}
                y={yTopo}
                width={largura}
                height={h}
                rx="3"
                fill={p.valor < 0 ? `url(#hachura-${id})` : "currentColor"}
                opacity={p.valor < 0 ? 1 : atual ? 0.9 : 0.45}
              />
              <text x={cx} y={A - 6} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.55">
                {p.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="mt-1">
        <summary className="cursor-pointer text-[11px] text-content/45">ver os números</summary>
        <table className="mt-2 w-full text-[12px]">
          <tbody className="divide-y divide-content/10">
            {pontos.map((p) => (
              <tr key={p.rotulo}>
                <td className="py-1 text-content/60">{p.rotulo}</td>
                <td className="py-1 text-right">{brl(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Capital de cada sócio em barras, com a linha da parte justa. */
// Cada linha traz a própria parte justa: com participações diferentes (50%,
// 25%, 25%), o traço de cada sócio fica num lugar diferente.
export function CapitalSocios({ linhas }: { linhas: { nome: string; capital: number; parteJusta: number }[] }) {
  const max = Math.max(...linhas.map((l) => Math.max(l.parteJusta, l.capital)), 1);
  const iguais = linhas.every((l) => l.parteJusta === linhas[0]?.parteJusta);
  const pct = (v: number) => `${Math.max(0, (v / max) * 100)}%`;
  return (
    <figure className="border border-content/15 px-4 py-4">
      <figcaption className="mb-3 text-[11px] uppercase tracking-[0.18em] text-content/60">Quanto cada um colocou</figcaption>
      <div className="relative flex flex-col gap-3">
        {linhas.map((l) => (
          <div key={l.nome} title={`${l.nome}: ${brl(l.capital)}`}>
            <div className="mb-1 flex items-baseline justify-between text-[13px]">
              <span>{l.nome}</span>
              <span className="text-content/70">{curto(l.capital)}</span>
            </div>
            <div className="relative h-2.5 w-full rounded-full bg-content/10">
              <div className="h-2.5 rounded-full bg-content/80" style={{ width: pct(l.capital) }} />
              {/* Onde este sócio deveria estar, pela participação dele. */}
              <div className="absolute -top-1 w-0.5 bg-content" style={{ left: pct(l.parteJusta), height: "18px" }} aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-content/50">
        {iguais
          ? `O traço vertical é a parte justa (${curto(linhas[0]?.parteJusta ?? 0)} para cada um).`
          : "O traço vertical é a parte justa de cada um, pela participação na sociedade."}{" "}
        Quem passa dele colocou a mais.
      </p>
    </figure>
  );
}
