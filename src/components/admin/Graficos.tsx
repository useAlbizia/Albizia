// Gráficos do painel, em SVG puro, nas cores do tema (claro e escuro sem
// trocar nada: tudo usa a cor do texto, currentColor).
//
// Regras seguidas: uma medida por gráfico (nunca dois eixos), barras finas
// com a base no zero, grade discreta, o valor de cada barra ao passar o dedo
// ou o mouse, e uma tabela com os números logo abaixo, para quem prefere ler
// a ver. Valor negativo nunca é indicado só pela cor: ganha sinal e textura.

type Ponto = { rotulo: string; valor: number; dica?: string };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
// O equalizador dos sócios: uma barra por sócio com o que ele colocou, o
// traço de onde ele deveria estar (a parte justa) e, em tom mais claro, o
// que ele lançou e ainda espera aprovação. Ao lado, em palavras, se tem a
// receber ou está abaixo. Quando as barras batem no traço, está equilibrado.
export function CapitalSocios({
  linhas,
}: {
  linhas: { nome: string; capital: number; parteJusta: number; pendente?: number }[];
}) {
  const max = Math.max(...linhas.map((l) => Math.max(l.parteJusta, l.capital + (l.pendente ?? 0))), 1);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const algumPendente = linhas.some((l) => (l.pendente ?? 0) > 0);
  return (
    <figure className="border border-content/20 px-4 py-5 sm:px-6">
      <figcaption className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-content">
        Equilíbrio entre os sócios
      </figcaption>
      <div className="flex flex-col gap-5">
        {linhas.map((l) => {
          const dif = l.capital - l.parteJusta;
          return (
            <div key={l.nome}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium">{l.nome}</span>
                <span className="text-[15px]">{brl(l.capital)}</span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-content/10">
                <div className="absolute inset-y-0 left-0 rounded-full bg-content" style={{ width: pct(l.capital) }} />
                {(l.pendente ?? 0) > 0 && (
                  <div
                    className="absolute inset-y-0 rounded-r-full bg-content/30"
                    style={{ left: pct(l.capital), width: pct(l.pendente ?? 0) }}
                  />
                )}
                <div className="absolute -top-1.5 h-6 w-[3px] rounded-full bg-content" style={{ left: `calc(${pct(l.parteJusta)} - 1px)` }} aria-hidden="true" />
              </div>
              <p className="mt-1.5 text-[12px] text-content/65">
                {l.capital === 0 && l.parteJusta === 0
                  ? "Nada aprovado ainda"
                  : dif === 0
                    ? "Equilibrado"
                    : dif > 0
                      ? `Colocou ${brl(dif)} a mais: tem a receber`
                      : `Está ${brl(-dif)} abaixo da parte dele`}
                {(l.pendente ?? 0) > 0 && ` · ${brl(l.pendente ?? 0)} esperando aprovação`}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-content/50">
        O traço é a parte justa de cada um. Barra passando do traço: colocou a mais. Barra antes do traço: falta
        colocar.{algumPendente ? " A parte clara é o que foi lançado e ainda espera aprovação." : ""}
      </p>
    </figure>
  );
}
