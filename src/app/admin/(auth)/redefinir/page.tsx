import { Symbol } from "@/components/logo/Symbol";
import { RecoveryGate } from "@/components/auth/RecoveryGate";
import { SetPasswordForm } from "./SetPasswordForm";

// O link de recuperação chega como `#access_token=...` (e-mail da ALBIZIA)
// ou `?code=...` (formato antigo). Os dois são lidos pelo RecoveryGate, no
// navegador. A troca NÃO pode acontecer aqui no servidor: durante a montagem
// da página o Next não grava cookie, a sessão se perdia e salvar a senha dava
// "link expirado". E se o servidor trocasse o código, ele já estaria gasto
// quando o navegador tentasse.
export default function RedefinirPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-content">
      <Symbol className="h-10 w-10" />
      <h1 className="mt-8 text-sm uppercase tracking-[0.3em] text-content/60">Nova senha</h1>

      <div className="mt-8 w-full max-w-xs">
        <RecoveryGate servidorOk={false} linkAjuda={{ href: "/admin/esqueci", texto: "recuperar acesso" }}>
          <SetPasswordForm />
        </RecoveryGate>
      </div>
    </div>
  );
}
