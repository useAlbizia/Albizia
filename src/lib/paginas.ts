import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { paginasEspeciais } from "@/lib/db/schema";
import { isoDay } from "@/lib/format";

export type PaginaEspecial = typeof paginasEspeciais.$inferSelect;

/**
 * No ar = olho ligado E dentro do período, se houver período. Assim dá para
 * deixar o Dia das Mães pronto desde já, com "de 01/05 a 10/05": ele aparece
 * e some sozinho, sem ninguém lembrar de ligar e desligar.
 */
export function estaNoAr(p: Pick<PaginaEspecial, "ativo" | "inicio" | "fim">, hoje = isoDay(new Date())): boolean {
  if (!p.ativo) return false;
  if (p.inicio && hoje < p.inicio) return false;
  if (p.fim && hoje > p.fim) return false;
  return true;
}

export async function listarPaginas(): Promise<PaginaEspecial[]> {
  try {
    return await db.select().from(paginasEspeciais).orderBy(asc(paginasEspeciais.titulo));
  } catch {
    return [];
  }
}

export async function paginaPorSlug(slug: string): Promise<PaginaEspecial | null> {
  try {
    const [p] = await db.select().from(paginasEspeciais).where(eq(paginasEspeciais.slug, slug)).limit(1);
    return p ?? null;
  } catch {
    return null;
  }
}

/** "Dia das Mães 2027" → "dia-das-maes-2027". */
export function slugDe(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
