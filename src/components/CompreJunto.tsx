"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { getCrossSell } from "@/lib/cross-sell";
import type { Product } from "@/lib/products";

// Sugestão de peça complementar, dentro do carrinho.
//
// O tamanho é escolhido aqui mesmo, em vez de mandar a pessoa para a página
// do produto: sair do carrinho no meio da compra é onde se perde venda. Um
// clique no tamanho já adiciona.

function money(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// O banco devolve as variações na ordem em que foram cadastradas, que sai
// como "P, G, GG, M". Ordem de vestuário é a que a pessoa espera ler.
const ORDEM_TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG"];

function porTamanho(a: { size: string }, b: { size: string }): number {
  const ia = ORDEM_TAMANHOS.indexOf(a.size.toUpperCase());
  const ib = ORDEM_TAMANHOS.indexOf(b.size.toUpperCase());
  // Tamanho fora da tabela (numérico, por exemplo) vai para o fim, em ordem
  // natural, em vez de sumir ou embaralhar os conhecidos.
  if (ia === -1 && ib === -1) return a.size.localeCompare(b.size, "pt-BR", { numeric: true });
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

export function CompreJunto() {
  const { items, addItem } = useCart();
  const [sugestao, setSugestao] = useState<Product | null>(null);

  // Recalcula quando o conteúdo do carrinho muda, para nunca sugerir algo
  // que a pessoa acabou de adicionar.
  const chave = items.map((i) => i.slug).sort().join(",");

  useEffect(() => {
    let ativo = true;
    if (!chave) {
      setSugestao(null);
      return;
    }
    getCrossSell(chave.split(","))
      .then((p) => {
        if (ativo) setSugestao(p);
      })
      .catch(() => {
        // Sugestão é um extra: se falhar, o carrinho segue funcionando.
        if (ativo) setSugestao(null);
      });
    return () => {
      ativo = false;
    };
  }, [chave]);

  if (!sugestao) return null;

  const foto = sugestao.images[0]?.url;
  const disponiveis = sugestao.variants.filter((v) => v.stock > 0).sort(porTamanho);
  if (disponiveis.length === 0) return null;

  return (
    <div className="border-t border-content/10 px-6 py-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-content/40">Compre junto</p>

      <div className="flex gap-4">
        {foto ? (
          <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-content/5">
            <Image src={foto} alt={sugestao.name} fill sizes="64px" className="object-cover" />
          </div>
        ) : (
          <div className="h-20 w-16 shrink-0 bg-content/5" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-content/80">{sugestao.name}</p>
          <p className="mt-0.5 text-[13px] text-content/60">{money(sugestao.price)}</p>

          {/* Sem mensagem de "adicionado": ao clicar, a peça aparece na lista
              do carrinho logo acima e a sugestão troca por outra. Isso já é o
              retorno visual, e mais claro do que um aviso que some. */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.12em] text-content/35">Tamanho</span>
            {disponiveis.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() =>
                  addItem({
                    slug: sugestao.slug,
                    name: sugestao.name,
                    price: sugestao.price,
                    size: v.size,
                    variantId: v.id,
                    quantity: 1,
                    image: foto,
                  })
                }
                className="border border-content/25 px-2 py-1 text-[11px] uppercase tracking-[0.05em] transition-colors hover:border-content hover:bg-content hover:text-surface"
              >
                {v.size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
