"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

// Fluxo nativo do Google (Google Identity Services + signInWithIdToken).
// O token é emitido direto no nosso domínio, sem redirecionar por
// <ref>.supabase.co. A tela do Google mostra o nome do app (ALBIZIA, definido
// na tela de consentimento do Google Cloud) e o domínio usealbizia.com.br.
//
// Requer NEXT_PUBLIC_GOOGLE_CLIENT_ID (o Client ID do OAuth "Web application"
// do Google Cloud). Sem essa variável, o botão simplesmente não aparece e o
// login por e-mail continua funcionando normalmente.

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type CredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

// Gera um nonce aleatório. O Google recebe o hash SHA-256 (entra no token);
// o Supabase recebe o valor cru e refaz o hash para conferir. Isso impede
// que um token roubado seja reaproveitado.
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

export function GoogleSignInButton({ next = "/conta" }: { next?: string }) {
  const router = useRouter();
  const holder = useRef<HTMLDivElement>(null);
  const rawNonce = useRef<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleCredential = useCallback(
    async (response: CredentialResponse) => {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: rawNonce.current,
      });
      if (error) {
        setError("Não foi possível entrar com o Google. Tente novamente.");
        return;
      }
      router.refresh();
      router.push(next);
    },
    [router, next],
  );

  const init = useCallback(async () => {
    if (!CLIENT_ID || !window.google || !holder.current) return;
    const { raw, hashed } = await makeNonce();
    rawNonce.current = raw;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      nonce: hashed,
      ux_mode: "popup",
      use_fedcm_for_prompt: true,
    });

    holder.current.innerHTML = "";
    window.google.accounts.id.renderButton(holder.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "left",
      locale: "pt-BR",
      width: 320,
    });
  }, [handleCredential]);

  // Em navegação client-side o script já está carregado, então inicializa
  // no mount. Em carga inicial, o onReady do <Script> dispara o init.
  useEffect(() => {
    if (window.google) void init();
  }, [init]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => void init()}
      />
      <div ref={holder} className="flex min-h-[44px] justify-center" />
      {error && <p className="mt-3 text-center text-[13px] text-content/70">{error}</p>}
    </>
  );
}
