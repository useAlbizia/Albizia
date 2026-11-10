import { adminListUsers } from "@/lib/supabase/admin";
import { dateTime } from "@/lib/format";
import { CreateUserForm } from "./CreateUserForm";
import { ResetAccess } from "./ResetAccess";

export const dynamic = "force-dynamic";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return dateTime(iso);
}

export default async function UsuariosPage() {
  // Só quem administra. Sem o filtro, todo cliente que criasse conta na loja
  // apareceria aqui como se fosse administrador.
  const todos = await adminListUsers();
  const users = todos.filter((u) => u.admin);
  const semAcesso = todos.filter((u) => u.semAcesso);

  return (
    <div className="flex flex-col gap-14">
      <div>
        <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">
          Acessos de admin
        </h1>
        {semAcesso.length > 0 && (
          <div className="mb-8 border border-content/30 px-4 py-4 text-[13px] leading-relaxed">
            <p>
              {semAcesso.length === 1 ? "Esta conta foi criada" : "Estas contas foram criadas"} pelo painel mas{" "}
              <strong>ainda não entra{semAcesso.length === 1 ? "" : "m"}</strong>:
            </p>
            <ul className="mt-2 list-disc pl-5">
              {semAcesso.map((u) => (
                <li key={u.id}>{u.email}</li>
              ))}
            </ul>
            <p className="mt-2 text-content/60">
              Para liberar, digite o e-mail em <strong>Criar acesso</strong>, abaixo. A senha que a pessoa já
              recebeu continua valendo.
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
                <th className="py-3 pr-4 font-normal">E-mail</th>
                <th className="py-3 pr-4 font-normal">Criado em</th>
                <th className="py-3 pr-4 font-normal">Última sessão</th>
                <th className="py-3 font-normal">Recuperar acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-content/10">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4 text-content/60">{fmt(u.createdAt)}</td>
                  <td className="py-3 pr-4 text-content/60">
                    {u.lastSignInAt ? fmt(u.lastSignInAt) : "nunca acessou"}
                  </td>
                  <td className="py-3 align-top">
                    <ResetAccess email={u.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="py-8 text-center text-sm text-content/50">Nenhum admin cadastrado.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-6 text-sm uppercase tracking-[0.3em] text-content/60">
          Criar novo acesso
        </h2>
        <CreateUserForm />
      </div>
    </div>
  );
}
