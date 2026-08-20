"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { addProductImage, removeProductImage } from "../_actions";

type ImageRow = { id: string; url: string; role: string | null };

const ROLES: { key: string; label: string }[] = [
  { key: "studio", label: "Estúdio (capa)" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "detail", label: "Detalhe" },
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
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      // Runs only inside this event handler (file input onChange), never
      // during render — safe despite the impure-function lint heuristic.
      // eslint-disable-next-line react-hooks/purity
      const path = `${slug}/${role}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);

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
    <div className="grid grid-cols-3 gap-3">
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
            <label className="cursor-pointer border border-content/30 px-2 py-2 text-center text-[11px] uppercase tracking-[0.1em] hover:border-content">
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
      {error && <p className="col-span-3 text-[12px] text-content/70">{error}</p>}
    </div>
  );
}
