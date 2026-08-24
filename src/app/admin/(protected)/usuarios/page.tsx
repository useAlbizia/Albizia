import { adminListUsers } from "@/lib/supabase/admin";
import { CreateUserForm } from "./CreateUserForm";

export const dynamic = "force-dynamic";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function UsuariosPage() {
  const users = await adminListUsers();

  return (
    <div className="flex flex-col gap-14">
      <div>
        <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">
          Acessos de admin
        </h1>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
                <th className="py-3 pr-4 font-normal">E-mail</th>
                <th className="py-3 pr-4 font-normal">Criado em</th>
                <th className="py-3 pr-4 font-normal">Última sessão</th>
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
