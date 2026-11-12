// Reduz uma foto NO APARELHO antes de enviar.
//
// POR QUE: foto de celular tem 3 a 12 MB. O servidor recebe no máximo 4,5 MB
// por envio (limite da Vercel), e acima de 1 MB a ação do painel quebrava com
// "This page couldn't load" (o caso do 3º banner do Jair). Reduzida para no
// máximo 2000 px de lado em JPEG, a mesma foto fica com 200 a 600 KB, sem
// perda visível na loja.
//
// Se o navegador não conseguir reduzir (formato estranho), devolve o arquivo
// original e o servidor decide.

export async function reduzirImagem(arquivo: File, ladoMax = 2000, qualidade = 0.85): Promise<File> {
  if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif") return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.fillStyle = "#ffffff"; // PNG com transparência vira fundo branco, não preto
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

/** Troca o arquivo escolhido num <input type="file"> pela versão reduzida. */
export async function reduzirNoInput(input: HTMLInputElement): Promise<void> {
  const f = input.files?.[0];
  if (!f) return;
  const menor = await reduzirImagem(f);
  if (menor === f) return;
  const dt = new DataTransfer();
  dt.items.add(menor);
  input.files = dt.files;
}
