"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { pedidosACaminho, type PedidoACaminho as Pedido } from "@/app/_a-caminho";

// Aviso pequeno no canto da loja: "Seu pedido #123 está a caminho", com o
// botão de rastrear (sugestão do Jair). Aparece para quem tem pedido enviado
// nos últimos 20 dias. Fechado, não volta para aquele pedido neste aparelho.

export const CHAVE_PEDIDOS = "albizia-meus-pedidos";
const fechado = (n: number) => `albizia-aviso-caminho-${n}`;

export function lembrarPedido(numero: number, email: string) {
  try {
    const atuais = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) ?? "[]") as { numero: number; email: string }[];
    const novos = [{ numero, email }, ...atuais.filter((p) => p.numero !== numero)].slice(0, 5);
    localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify(novos));
  } catch {}
}

export function PedidoACaminho() {
  const pathname = usePathname();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const fora = pathname.startsWith("/admin") || pathname.startsWith("/checkout");

  useEffect(() => {
    if (fora) return;
    let lembrados: { numero: number; email: string }[] = [];
    try {
      lembrados = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) ?? "[]");
    } catch {}
    let vivo = true;
    pedidosACaminho(lembrados)
      .then((lista) => {
        if (!vivo) return;
        const aberto = lista.find((p) => {
          try {
            return !localStorage.getItem(fechado(p.numero));
          } catch {
            return true;
          }
        });
        setPedido(aberto ?? null);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
    // Só na primeira página da visita: não precisa consultar a cada clique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fora || !pedido) return null;

  function fechar() {
    try {
      localStorage.setItem(fechado(pedido!.numero), "1");
    } catch {}
    setPedido(null);
  }

  return (
    <div
      role="status"
      className="fixed bottom-24 left-4 z-40 flex max-w-[calc(100%-2rem)] items-center gap-3 border border-content/20 bg-surface px-4 py-3 shadow-xl sm:bottom-6 sm:max-w-sm"
    >
      <span aria-hidden="true" className="text-xl">📦</span>
      <a
        href={pedido.href}
        target={pedido.codigo ? "_blank" : undefined}
        rel={pedido.codigo ? "noopener noreferrer" : undefined}
        className="min-w-0 flex-1"
      >
        <span className="block text-[13px] font-medium">Seu pedido #{pedido.numero} está a caminho</span>
        <span className="block text-[12px] underline underline-offset-2 text-content/70">Rastrear entrega</span>
      </a>
      <button type="button" onClick={fechar} aria-label="Fechar aviso" className="px-1 text-lg leading-none text-content/60">
        ×
      </button>
    </div>
  );
}
