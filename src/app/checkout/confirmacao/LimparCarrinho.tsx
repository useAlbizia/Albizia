"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

// O carrinho só pode ser esvaziado no navegador, mas a página em volta virou
// componente de servidor para poder buscar o número do pedido. Então sobra
// esta peça, que não desenha nada e só faz a limpeza.
export function LimparCarrinho() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
