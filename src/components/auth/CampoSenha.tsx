"use client";

import { useEffect, useRef, useState } from "react";

// Campo de senha com o "olhinho" para mostrar o que foi digitado.
//
// É seguro: a senha só aparece na tela de quem está digitando, nada muda no
// envio. Começa sempre escondida e volta a esconder ao enviar o formulário,
// para não ficar à mostra se a pessoa sair de perto. É o padrão de bancos e
// do próprio Google, e evita o "errei a senha ou errei a digitação?".
export function CampoSenha({
  name,
  placeholder,
  autoComplete,
  minLength,
  className,
}: {
  name: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  className: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  // Volta a esconder a cada envio do formulário, qualquer que seja o jeito
  // de enviar (botão, Enter, preenchimento automático).
  useEffect(() => {
    const form = campo.current?.form;
    if (!form) return;
    const esconder = () => setVisivel(false);
    form.addEventListener("submit", esconder);
    return () => form.removeEventListener("submit", esconder);
  }, []);

  return (
    <div className="relative">
      <input
        ref={campo}
        name={name}
        type={visivel ? "text" : "password"}
        placeholder={placeholder}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${className} w-full pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visivel}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-content/45 hover:text-content"
      >
        {visivel ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c5 0 8.7 3.6 10 8a11.6 11.6 0 0 1-2.4 4.1M6.6 6.6A11.4 11.4 0 0 0 2 12c1.3 4.4 5 8 10 8a10 10 0 0 0 5.4-1.6" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12c1.3-4.4 5-8 10-8s8.7 3.6 10 8c-1.3 4.4-5 8-10 8s-8.7-3.6-10-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
