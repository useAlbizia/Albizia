/**
 * Testa a lógica fiscal. CPF inválido aceito no checkout vira nota rejeitada
 * pela SEFAZ depois, então a validação precisa estar certa.
 *
 * Rodar: npx tsx scripts/test-fiscal.ts
 */
import { isValidCpf, isValidCnpj, isValidDocument, cfopFor, ncmFor, reais, toCsv, formatDocument } from "../src/lib/fiscal";

let falhas = 0;
function ok(nome: string, real: unknown, esperado: unknown) {
  const passou = JSON.stringify(real) === JSON.stringify(esperado);
  if (!passou) falhas++;
  console.log(`${passou ? "  ok  " : "FALHOU"}  ${nome}${passou ? "" : `  (esperava ${JSON.stringify(esperado)}, veio ${JSON.stringify(real)})`}`);
}

console.log("\nCPF válido:");
ok("529.982.247-25", isValidCpf("529.982.247-25"), true);
ok("111.444.777-35", isValidCpf("111.444.777-35"), true);
ok("sem máscara", isValidCpf("52998224725"), true);

console.log("\nCPF inválido:");
ok("dígito errado", isValidCpf("529.982.247-26"), false);
ok("todos iguais", isValidCpf("111.111.111-11"), false);
ok("curto demais", isValidCpf("1234567890"), false);
ok("vazio", isValidCpf(""), false);
ok("letras", isValidCpf("abc.def.ghi-jk"), false);

console.log("\nCNPJ:");
ok("11.222.333/0001-81 válido", isValidCnpj("11.222.333/0001-81"), true);
ok("dígito errado", isValidCnpj("11.222.333/0001-82"), false);
ok("todos iguais", isValidCnpj("11111111111111"), false);

console.log("\nDocumento (aceita os dois):");
ok("CPF", isValidDocument("529.982.247-25"), true);
ok("CNPJ", isValidDocument("11.222.333/0001-81"), true);
ok("12 dígitos não é nenhum", isValidDocument("123456789012"), false);

console.log("\nFormatação:");
ok("CPF", formatDocument("52998224725"), "529.982.247-25");
ok("CNPJ", formatDocument("11222333000181"), "11.222.333/0001-81");

console.log("\nCFOP:");
ok("mesmo estado", cfopFor("SP", "SP"), "5102");
ok("estado diferente", cfopFor("SP", "RJ"), "6102");
ok("case insensitive", cfopFor("sp", "Sp"), "5102");
ok("sem UF de origem", cfopFor("", "RJ"), "");

console.log("\nNCM:");
ok("camiseta padrão", ncmFor("camiseta", ""), "61091000");
ok("moda praia padrão", ncmFor("moda-praia", null), "62111100");
ok("NCM próprio vence", ncmFor("camiseta", "6205.20.00"), "62052000");
ok("NCM curto cai no padrão", ncmFor("camiseta", "123"), "61091000");

console.log("\nValores e CSV:");
ok("reais", reais(21900), "219,00");
ok("centavos", reais(5), "0,05");
const csv = toCsv(["A", "B"], [["x;y", 'diz "oi"']]);
ok("escapa ponto e vírgula", csv.includes('"x;y"'), true);
ok("escapa aspas", csv.includes('"diz ""oi"""'), true);
ok("tem BOM", csv.startsWith("﻿"), true);

console.log(falhas === 0 ? "\nTODOS PASSARAM\n" : `\n${falhas} FALHA(S)\n`);
process.exit(falhas === 0 ? 0 : 1);
