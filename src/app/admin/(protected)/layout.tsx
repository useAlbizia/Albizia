import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Início" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/carrinhos", label: "Carrinhos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/conteudo", label: "Conteúdo" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/auditoria", label: "Auditoria" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  if (user.user_metadata?.must_change_password) {
    return (
      <div className="min-h-screen bg-surface text-content">
        <ChangePasswordForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-content">
      <header className="flex flex-col gap-3 border-b border-content/10 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] uppercase tracking-[0.15em] text-content/70 hover:text-content"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-[12px] text-content/50">{user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-[12px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
