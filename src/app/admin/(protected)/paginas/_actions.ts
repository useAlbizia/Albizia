"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { paginasEspeciais } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { slugDe } from "@/lib/paginas";

export type PaginaState = { ok?: string; erro?: string; id?: string };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

async function subirImagem(arquivo: File): Promise<string> {
  const jpeg = await sharp(Buffer.from(await arquivo.arrayBuffer()))
    .rotate()
    .resize(1920, 1080, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82 })
    .toBuffer();
  const caminho = `paginas/${randomUUID()}.jpg`;
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${SUPA}/storage/v1/object/product-images/${caminho}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: new Uint8Array(jpeg),
  });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  return `${SUPA}/storage/v1/object/public/product-images/${caminho}`;
}

export async function salvarPagina(id: string | null, _prev: PaginaState, fd: FormData): Promise<PaginaState> {
  await requireAdmin();
  const titulo = String(fd.get("titulo") ?? "").trim().slice(0, 120);
  if (!titulo) return { erro: "Dê um título (ex.: Dia das Mães)." };
  const slug = slugDe(String(fd.get("slug") ?? "") || titulo);
  if (!slug) return { erro: "Endereço inválido." };
  const [repetida] = await db
    .select({ id: paginasEspeciais.id })
    .from(paginasEspeciais)
    .where(id ? and(eq(paginasEspeciais.slug, slug), ne(paginasEspeciais.id, id)) : eq(paginasEspeciais.slug, slug));
  if (repetida) return { erro: `Já existe uma página com o endereço /especial/${slug}. Mude o endereço.` };

  const inicio = String(fd.get("inicio") ?? "");
  const fim = String(fd.get("fim") ?? "");
  if (inicio && !DATA.test(inicio)) return { erro: "Data de início inválida." };
  if (fim && !DATA.test(fim)) return { erro: "Data de fim inválida." };
  if (inicio && fim && inicio > fim) return { erro: "O início precisa ser antes do fim." };

  const dados = {
    titulo,
    slug,
    subtitulo: String(fd.get("subtitulo") ?? "").trim().slice(0, 160),
    texto: String(fd.get("texto") ?? "").trim().slice(0, 2000),
    produtos: fd.getAll("produtos").map(String).filter(Boolean).slice(0, 24),
    inicio: inicio || null,
    fim: fim || null,
    updatedAt: new Date(),
  };

  const arquivo = fd.get("imagem");
  let imagemUrl: string | undefined;
  if (arquivo instanceof File && arquivo.size > 0) {
    try {
      imagemUrl = await subirImagem(arquivo);
    } catch {
      return { erro: "Não consegui enviar a imagem. Tente outra." };
    }
  }

  if (id) {
    await db.update(paginasEspeciais).set({ ...dados, ...(imagemUrl ? { imagemUrl } : {}) }).where(eq(paginasEspeciais.id, id));
  } else {
    const [p] = await db.insert(paginasEspeciais).values({ ...dados, imagemUrl: imagemUrl ?? "" }).returning({ id: paginasEspeciais.id });
    id = p.id;
  }
  await logAudit({ action: "pagina.salvar", entity: "pagina", entityId: id, detail: { slug } });
  revalidatePath("/admin/paginas");
  revalidatePath(`/especial/${slug}`);
  return { ok: "Salvo.", id };
}

/** O "olho": liga ou desliga a página no site. */
export async function alternarPagina(id: string, ativo: boolean): Promise<void> {
  await requireAdmin();
  const [p] = await db.update(paginasEspeciais).set({ ativo, updatedAt: new Date() }).where(eq(paginasEspeciais.id, id)).returning({ slug: paginasEspeciais.slug });
  await logAudit({ action: "pagina.ativo", entity: "pagina", entityId: id, detail: { ativo } });
  revalidatePath("/admin/paginas");
  if (p) revalidatePath(`/especial/${p.slug}`);
}

export async function excluirPagina(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(paginasEspeciais).where(eq(paginasEspeciais.id, id));
  await logAudit({ action: "pagina.excluir", entity: "pagina", entityId: id });
  revalidatePath("/admin/paginas");
}
