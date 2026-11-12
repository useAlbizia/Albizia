import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { socios } from "@/lib/db/schema";

/**
 * Quem recebe os avisos da loja (novo pedido, estoque baixo): a lista da
 * variável ORDER_NOTIFICATION_EMAIL da Vercel MAIS todos os sócios ativos do
 * cadastro. Antes era só a variável, e o aviso de venda chegava para dois dos
 * três sócios (o Devid ficava de fora). Sócio novo entra sozinho.
 */
export async function emailsDaEquipe(): Promise<string[]> {
  const daVariavel = (process.env.ORDER_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.includes("@"));
  let doCadastro: string[] = [];
  try {
    doCadastro = (await db.select({ email: socios.email }).from(socios).where(eq(socios.ativo, true)))
      .map((s) => s.email.trim())
      .filter((e) => e.includes("@"));
  } catch {
    // Banco fora: segue com a variável, que é o que existia antes.
  }
  const vistos = new Set<string>();
  return [...daVariavel, ...doCadastro].filter((e) => {
    const k = e.toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}
