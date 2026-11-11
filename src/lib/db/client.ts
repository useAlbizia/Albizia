import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

loadEnvConfig(process.cwd());

// Conexão com o banco. Lição de 10/11/2026, quando o painel inteiro travou
// para todo mundo ao abrir o Fechamento do mês:
//
// 1. MODO SESSÃO, não transação. O pooler do Supabase na porta 6543 (modo
//    transação) trava a conexão para sempre quando várias consultas esperam
//    na fila ao mesmo tempo (o Fechamento dispara umas 11 de uma vez).
//    Testado: no modo transação, 6 fechamentos simultâneos nunca terminaram,
//    nem com 20 conexões; no modo sessão (porta 5432, mesmo servidor),
//    terminaram em 0,5 s com 2 conexões. Por isso a porta é trocada aqui,
//    qualquer que seja a que estiver na variável da Vercel.
// 2. Poucas conexões por servidor e devolvidas logo: no modo sessão cada
//    conexão ocupa uma vaga fixa no Supabase, então nada de deixar paradas.
const url = process.env.DATABASE_URL!.replace(/(\.pooler\.supabase\.com):6543\//, "$1:5432/");

const client = postgres(url, {
  prepare: false,
  // Poucas por servidor; o resto espera na fila, em ordem (no modo sessão a
  // fila funciona).
  max: Number(process.env.DB_MAX_TESTE ?? 3),
  // Conexão parada volta para o Supabase em 10 s.
  idle_timeout: 10,
  // Nenhuma conexão fica pendurada mais de 5 minutos.
  max_lifetime: 60 * 5,
  // Banco sem responder em 10 s: a tela mostra erro em vez de girar para sempre.
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
