"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";

/**
 * Grava a foto de um produto pelo SERVIDOR, com a chave de serviço.
 *
 * Antes o envio ia direto do navegador para o Supabase com o login de quem
 * estava usando, e a regra de segurança do armazenamento só aceitava alguns
 * usuários: o Jair recebia "new row violates row-level security policy".
 * Agora qualquer administrador envia, a permissão é conferida aqui
 * (requireAdmin), e a chave de serviço nunca sai do servidor.
 */
export async function enviarFotoProduto(fd: FormData): Promise<{ url?: string; erro?: string }> {
  await requireAdmin();
  const arquivo = fd.get("foto");
  const slug = String(fd.get("slug") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 80) || "produto";
  const papel = String(fd.get("papel") ?? "").replace(/[^a-z]/g, "").slice(0, 20) || "foto";
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma foto." };
  if (arquivo.size > 15 * 1024 * 1024) return { erro: "Foto grande demais (máximo 15 MB)." };

  let jpeg: Buffer;
  try {
    // Gira conforme o celular gravou (rotate) e limita a 1600 px: suficiente
    // para o zoom da loja, leve para carregar no celular do cliente.
    jpeg = await sharp(Buffer.from(await arquivo.arrayBuffer()))
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84 })
      .toBuffer();
  } catch {
    return { erro: "Não consegui ler essa imagem. Use JPG, PNG ou WEBP." };
  }

  const caminho = `${slug}/${papel}-${randomUUID()}.jpg`;
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${SUPA}/storage/v1/object/product-images/${caminho}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: new Uint8Array(jpeg),
  });
  if (!res.ok) return { erro: `O armazenamento recusou a foto (erro ${res.status}). Tente de novo.` };
  await logAudit({ action: "produto.foto", entity: "produto", entityId: slug, detail: { papel } });
  return { url: `${SUPA}/storage/v1/object/public/product-images/${caminho}` };
}
