"use client";

import { useActionState } from "react";
import { sendAdminResetLink, resetAdminPassword, type ResetAdminState } from "@/lib/admin/users";

const initial: ResetAdminState = {};

// Recuperar acesso de um admin, direto do painel.
//
// Dois caminhos, nessa ordem de preferência:
//  1. Link por e-mail: a senha nasce e morre com a pessoa, ninguém mais vê.
//  2. Senha temporária: para quando o e-mail não chega (spam, caixa cheia).
//     Aparece uma vez só, aqui na tela, e força a troca no primeiro login.
//
// A senha temporária é mostrada no painel de propósito, e não enviada por
// e-mail nem registrada em log: quem gerou é quem entrega.
export function ResetAccess({ email }: { email: string }) {
  const [link, linkAction, linkPending] = useActionState(sendAdminResetLink, initial);
  const [temp, tempAction, tempPending] = useActionState(resetAdminPassword, initial);

  const estado = link.sentTo ? link : temp;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <form action={linkAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={linkPending}
            className="border border-content/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] text-content/70 transition-colors hover:border-content disabled:opacity-50"
          >
            {linkPending ? "Enviando..." : "Enviar link"}
          </button>
        </form>

        <form action={tempAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={tempPending}
            className="border border-content/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] text-content/70 transition-colors hover:border-content disabled:opacity-50"
          >
            {tempPending ? "Gerando..." : "Senha temporária"}
          </button>
        </form>
      </div>

      {estado.sentTo && (
        <p className="text-[11px] text-content/50">Link enviado para {estado.sentTo}.</p>
      )}

      {temp.tempPassword && (
        <div className="border border-content/30 p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-content/50">
            Senha temporária, anote agora
          </p>
          <p className="mt-1 break-all font-mono text-[13px] text-content">
            {temp.tempPassword.password}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-content/45">
            Aparece só desta vez. Envie por um canal privado. No primeiro login o sistema exige
            trocar por uma senha nova.
          </p>
        </div>
      )}

      {(link.error || temp.error) && (
        <p className="text-[11px] text-content/70">{link.error || temp.error}</p>
      )}
    </div>
  );
}
