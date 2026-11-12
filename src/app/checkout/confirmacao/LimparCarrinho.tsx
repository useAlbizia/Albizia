"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { lembrarPedido } from "@/components/PedidoACaminho";

// O carrinho só pode ser esvaziado no navegador, mas a página em volta virou
// componente de servidor para poder buscar o número do pedido. Então sobra
// esta peça, que não desenha nada e só faz a limpeza.
export function LimparCarrinho({ numero, email }: { numero?: number; email?: string }) {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    // Guarda o pedido neste aparelho para a loja avisar quando estiver a caminho.
    if (numero && email) lembrarPedido(numero, email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
