"use client";

import { useState, useTransition } from "react";
import { limparErrosAntigos, marcarResolvido } from "./_actions";

export function CopiarErro({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(texto)
          .then(() => {
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          })
          .catch(() => {});
      }}
      className="btn-sec shrink-0"
    >
      {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

export function ResolverErro({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => marcarResolvido(id))} className="btn-sec">
      {pending ? "..." : "Resolvido"}
    </button>
  );
}

export function LimparErros() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Apagar os erros com mais de 24 horas? Os de hoje ficam.")) start(() => limparErrosAntigos());
      }}
      className="btn-perigo"
    >
      {pending ? "Apagando..." : "Apagar os antigos"}
    </button>
  );
}
