"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

// Porteiro da tela de nova senha.
//
// Existem DOIS formatos de link de recuperação e a página precisa aceitar os
// dois:
//
//  1. `?code=...` na query. É o fluxo PKCE, usado quando o próprio navegador
//     pediu a recuperação. O servidor troca o código por sessão antes de
//     renderizar, e aí `servidorOk` já chega true.
//
//  2. `#access_token=...&refresh_token=...` na tralha. É o que a API admin
//     devolve (generate_link). O que vem depois do `#` NUNCA é enviado ao
//     servidor, então só dá para ler aqui no navegador. Era exatamente por
//     isso que a tela dizia "link inválido" com um link recém-chegado.
//
// Depois de criar a sessão, a tralha é apagada da URL: o token dá poder de
// trocar a senha e não deve ficar no histórico nem em print de tela.

type Estado = "verificando" | "liberado" | "invalido";

export function RecoveryGate({
  servidorOk,
  children,
  linkAjuda,
}: {
  servidorOk: boolean;
  children: React.ReactNode;
  linkAjuda: { href: string; texto: string };
}) {
  const [estado, setEstado] = useState<Estado>(servidorOk ? "liberado" : "verificando");

  useEffect(() => {
    if (servidorOk) return;

    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setEstado("invalido");
      return;
    }

    let ativo = true;
    createBrowserSupabase()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (!ativo) return;
        if (error) {
          setEstado("invalido");
          return;
        }
        // Tira o token da barra de endereço sem recarregar a página.
        window.history.replaceState(null, "", window.location.pathname);
        setEstado("liberado");
      })
      .catch(() => {
        if (ativo) setEstado("invalido");
      });

    return () => {
      ativo = false;
    };
  }, [servidorOk]);

  if (estado === "verificando") {
    return (
      <p className="text-center text-sm text-content/50" role="status">
        Verificando o link...
      </p>
    );
  }

  if (estado === "invalido") {
    return (
      <p className="text-center text-sm leading-relaxed text-content/60">
        Este link é inválido ou expirou. Solicite um novo em{" "}
        <a href={linkAjuda.href} className="underline underline-offset-2 hover:text-content">
          {linkAjuda.texto}
        </a>
        .
      </p>
    );
  }

  return <>{children}</>;
}
