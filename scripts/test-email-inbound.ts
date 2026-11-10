/**
 * Testa a porta de entrada da caixa de e-mail: a conferência da assinatura
 * do aviso do Resend, a leitura do remetente e o filtro de spam.
 *
 * Rodar: npx tsx scripts/test-email-inbound.ts
 */
import { createHmac } from "node:crypto";
import { assinaturaValida, ehSpam, lerEndereco } from "../src/lib/email-inbound";

let falhas = 0;
function ok(nome: string, real: unknown, esperado: unknown) {
  const passou = JSON.stringify(real) === JSON.stringify(esperado);
  if (!passou) falhas++;
  console.log(`${passou ? "  ok  " : "FALHOU"}  ${nome}${passou ? "" : `  (esperava ${JSON.stringify(esperado)}, veio ${JSON.stringify(real)})`}`);
}

// Assinatura montada do jeito que o Resend (Svix) monta, com um segredo de teste.
const segredoBruto = Buffer.from("segredo-de-teste-da-albizia-123456");
const segredo = `whsec_${segredoBruto.toString("base64")}`;
const corpo = JSON.stringify({ type: "email.received", data: { email_id: "abc123def" } });
const agora = 1_800_000_000_000;
const ts = String(Math.floor(agora / 1000));
const assinar = (texto: string, id = "msg_1", t = ts) =>
  `v1,${createHmac("sha256", segredoBruto).update(`${id}.${t}.${texto}`).digest("base64")}`;

async function main() {
  console.log("\nAssinatura do aviso:");
  ok("aviso legítimo passa", await assinaturaValida(corpo, { id: "msg_1", timestamp: ts, signature: assinar(corpo) }, segredo, agora), true);
  ok("aceita quando vem junto com outra assinatura", await assinaturaValida(corpo, { id: "msg_1", timestamp: ts, signature: `v1,xxxx ${assinar(corpo)}` }, segredo, agora), true);
  ok("corpo alterado é recusado", await assinaturaValida(corpo.replace("abc123def", "outroid999"), { id: "msg_1", timestamp: ts, signature: assinar(corpo) }, segredo, agora), false);
  ok("segredo errado é recusado", await assinaturaValida(corpo, { id: "msg_1", timestamp: ts, signature: assinar(corpo) }, `whsec_${Buffer.from("outro").toString("base64")}`, agora), false);
  const velho = String(Math.floor(agora / 1000) - 6 * 60);
  ok("aviso de 6 minutos atrás é recusado (reenvio de aviso capturado)", await assinaturaValida(corpo, { id: "msg_1", timestamp: velho, signature: assinar(corpo, "msg_1", velho) }, segredo, agora), false);
  ok("sem cabeçalhos é recusado", await assinaturaValida(corpo, { id: null, timestamp: null, signature: null }, segredo, agora), false);
  ok("sem segredo configurado é recusado", await assinaturaValida(corpo, { id: "msg_1", timestamp: ts, signature: assinar(corpo) }, "", agora), false);
  ok("segredo malformado não derruba, só recusa", await assinaturaValida(corpo, { id: "msg_1", timestamp: ts, signature: assinar(corpo) }, "whsec_%%%", agora), false);

  console.log("\nRemetente:");
  ok("com nome", lerEndereco("Maria Silva <Maria@Exemplo.com>"), { nome: "Maria Silva", email: "maria@exemplo.com" });
  ok("com nome entre aspas", lerEndereco('"Loja X" <contato@lojax.com>'), { nome: "Loja X", email: "contato@lojax.com" });
  ok("só o e-mail", lerEndereco("joao@exemplo.com"), { nome: null, email: "joao@exemplo.com" });
  ok("lista pega o primeiro", lerEndereco(["a@x.com", "b@x.com"]), { nome: null, email: "a@x.com" });

  console.log("\nFiltro de spam e vírus:");
  ok("spam", ehSpam({ "X-SES-Spam-Verdict": "FAIL" }), true);
  ok("vírus", ehSpam({ "x-ses-virus-verdict": "FAIL" }), true);
  ok("limpo", ehSpam({ "x-ses-spam-verdict": "PASS", "x-ses-virus-verdict": "PASS" }), false);
  ok("sem cabeçalho", ehSpam(undefined), false);

  console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main();
