"use client";

import { useState, useTransition } from "react";
import { addProductImage, removeProductImage } from "../_actions";
import { enviarFotoProduto } from "./_foto";
import { reduzirImagem } from "@/lib/reduzir-imagem";

type ImageRow = { id: string; url: string; role: string | null };

// O que é cada foto (dúvida do Jair: "o que seria lifestyle e detalhe?").
const ROLES: { key: string; label: string; dica: string }[] = [
  { key: "studio", label: "Capa (estúdio)", dica: "A foto principal: peça inteira, fundo liso. É a que aparece na vitrine." },
  { key: "lifestyle", label: "Vestida (lifestyle)", dica: "A peça no corpo, num ambiente. Mostra caimento e estilo." },
  { key: "detail", label: "Detalhe", dica: "De perto: estampa, autorrelevo, tecido, etiqueta." },
];

export function ImageUploader({
  productId,
  slug,
  images,
}: {
  productId: string;
  slug: string;
  images: ImageRow[];
}) {
  const [current, setCurrent] = useState(images);
  const [pending, startTransition] = useTransition();
  const [uploadingRole, setUploadingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(role: string, file: File) {
    setError(null);
    setUploadingRole(role);
    try {
      // Reduz no aparelho (foto de celular passa do limite de envio) e
      // grava pelo servidor (o envio direto era barrado pela segurança do
      // armazenamento para quem não fosse o Nilson).
      const menor = await reduzirImagem(file);
      const fd = new FormData();
      fd.append("foto", menor);
      fd.append("slug", slug);
      fd.append("papel", role);
      const r = await enviarFotoProduto(fd);
      if (!r.url) throw new Error(r.erro ?? "Falha no envio.");
      const publicUrl = r.url;

      const existing = current.find((img) => img.role === role);

      startTransition(async () => {
        if (existing) {
          await removeProductImage(existing.id, productId);
        }
        await addProductImage(productId, publicUrl, role);
        setCurrent((prev) => [
          ...prev.filter((img) => img.role !== role),
          { id: publicUrl, url: publicUrl, role },
        ]);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploadingRole(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {ROLES.map(({ key, label }) => {
        const image = current.find((img) => img.role === key);
        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="relative aspect-square overflow-hidden border border-content/10 bg-surface-soft">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={label} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-content/30">
                  Sem foto
                </div>
              )}
            </div>
            <p className="text-[11px] leading-snug text-content/65">{ROLES.find((r) => r.key === key)?.dica}</p>
            <label className="btn-sec cursor-pointer text-center">
              {uploadingRole === key || pending ? "Enviando..." : label}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(key, file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        );
      })}
      {error && <p className="col-span-3 text-[13px] font-semibold">{error}</p>}
    </div>
  );
}
