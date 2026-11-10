// Regras das mensagens de motivação (src/lib/motivacao-conteudo.ts).
// Rodar: npx tsx scripts/test-motivacao.ts
import { MOTIVACOES } from "../src/lib/motivacao-conteudo";

let falhas = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    falhas++;
    console.error("FALHOU:", msg);
  }
}

// Livros que só a Bíblia católica tem: fora, para servir a católicos e
// evangélicos ao mesmo tempo.
const SO_CATOLICOS = /\b(Eclesiástico|Sirácida|Sabedoria|Tobias|Judite|Baruque|Macabeus)\b/i;
const TRAVESSAO = /[—–]/;

ok(MOTIVACOES.length >= 30, "pelo menos 30 mensagens");
const assuntos = new Set<string>();

MOTIVACOES.forEach((m, i) => {
  const n = `mensagem ${i + 1}`;
  const campos = [m.assunto, m.titulo, m.abertura, m.historia.quem, m.historia.texto, m.licao, m.versiculo.texto, m.versiculo.ref, m.chamada];
  ok(campos.every((c) => c.trim().length > 0), `${n}: nenhum campo vazio`);
  const corpo = [m.titulo, m.abertura, m.historia.texto, m.licao, m.chamada].join(" ");
  const tudo = campos.join(" ");
  ok(!/\berrad[oa]s?\b/i.test(tudo), `${n}: não usa a palavra errado`);
  ok(!/albizia/i.test(corpo), `${n}: a marca não vai digitada no corpo (só no logo)`);
  ok(!SO_CATOLICOS.test(m.versiculo.ref), `${n}: versículo de livro comum a católicos e evangélicos`);
  ok(/\d+:\d+/.test(m.versiculo.ref), `${n}: referência com capítulo e versículo`);
  ok(!TRAVESSAO.test(tudo), `${n}: sem travessão`);
  ok(m.assunto.length <= 60, `${n}: assunto curto para caber na notificação`);
  ok(!assuntos.has(m.assunto), `${n}: assunto repetido`);
  assuntos.add(m.assunto);
});

if (falhas) {
  console.error(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log(`TODOS PASSARAM (${MOTIVACOES.length} mensagens)`);
