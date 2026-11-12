import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

loadEnvConfig(process.cwd());

// Conexão com o banco. Histórico, para ninguém repetir:
//
// - 10/11/2026: com a biblioteca postgres.js no pooler do Supabase em modo
//   TRANSAÇÃO (porta 6543), a conexão travava para sempre quando várias
//   consultas esperavam na fila (o Fechamento dispara ~11 de uma vez) e o
//   painel inteiro parava para todo mundo.
// - Paliativo: modo SESSÃO (5432). Resolveu o travamento, mas esse modo só
//   aceita 15 conexões no total, somando todos os servidores: o build passou
//   a falhar (EMAXCONNSESSION) e um dia de movimento derrubaria a loja.
// - Solução: node-postgres (pg), que é o driver indicado para o pooler em
//   modo transação. Ele não empilha consultas na mesma conexão, então a fila
//   funciona, e o modo transação aceita centenas de clientes. Testado com o
//   mesmo estresse que travava antes.
const url = process.env.DATABASE_URL!.replace(/(\.pooler\.supabase\.com):5432\//, "$1:6543/");

const pool = new Pool({
  connectionString: url,
  // SSL: igual à conexão anterior (postgres.js também não ligava). Melhoria
  // pendente: ligar SSL VERIFICADO com o certificado do Supabase
  // (Database > SSL Configuration > Download certificate).
  // Conexões por servidor. No modo transação cada uma só ocupa o banco
  // durante a consulta, então dá para ter mais sem lotar o Supabase.
  max: Number(process.env.DB_MAX_TESTE ?? 6),
  // Conexão parada fecha em 10 s.
  idleTimeoutMillis: 10_000,
  // Banco sem responder em 10 s: erro na tela em vez de girar para sempre.
  connectionTimeoutMillis: 10_000,
  // Nenhuma consulta fica presa mais de 30 s segurando a conexão.
  query_timeout: 30_000,
});

export const db = drizzle(pool, { schema });
