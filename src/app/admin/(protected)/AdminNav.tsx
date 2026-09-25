"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "./actions";

type Item = { href: string; label: string };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Visão geral",
    items: [
      { href: "/admin", label: "Início" },
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/financeiro", label: "Financeiro" },
    ],
  },
  {
    title: "Vendas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/carrinhos", label: "Recuperação" },
      { href: "/admin/clientes", label: "Clientes" },
      { href: "/admin/frete", label: "Frete" },
      { href: "/admin/pagamentos", label: "Pagamentos" },
    ],
  },
  {
    title: "Loja",
    items: [
      { href: "/admin/produtos", label: "Produtos" },
      { href: "/admin/avaliacoes", label: "Avaliações" },
      { href: "/admin/banners", label: "Banners" },
      { href: "/admin/cupons", label: "Cupons" },
      { href: "/admin/marketing", label: "Marketing" },
    ],
  },
  {
    title: "Configurações",
    items: [
      { href: "/admin/conteudo", label: "Conteúdo" },
      { href: "/admin/menu", label: "Menu" },
      { href: "/admin/usuarios", label: "Usuários" },
      { href: "/admin/auditoria", label: "Auditoria" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function GroupList({
  pathname,
  onNavigate,
  alertas = 0,
}: {
  pathname: string;
  onNavigate?: () => void;
  alertas?: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-content/40">
            {group.title}
          </p>
          <div className="flex flex-col">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              // Venda parada é dinheiro esperando: o número aparece no menu
              // inteiro do admin, não só para quem lembra de abrir a fila.
              const badge = item.href === "/admin/carrinhos" ? (alertas ?? 0) : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`-mx-2 flex items-center justify-between gap-2 border-l-2 px-3 py-1.5 text-[13px] tracking-[0.08em] transition-colors ${
                    active
                      ? "border-content font-medium text-content"
                      : "border-transparent text-content/60 hover:text-content"
                  }`}
                >
                  <span>{item.label}</span>
                  {badge > 0 && (
                    <span
                      aria-label={`${badge} venda(s) parada(s)`}
                      className="flex h-4 min-w-4 items-center justify-center rounded-full bg-content px-1 text-[10px] font-medium leading-none text-surface"
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminNav({
  email,
  alertas = 0,
}: {
  email: string | undefined;
  alertas?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-content/10 px-6 py-4 md:hidden">
        <span className="text-sm uppercase tracking-[0.3em]">
          ALBIZIA <span className="text-content/40">admin</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
          aria-expanded={open}
          className="flex h-8 w-8 flex-col items-center justify-center gap-1.5"
        >
          <span className="h-px w-5 bg-content" />
          <span className="h-px w-5 bg-content" />
          <span className="h-px w-5 bg-content" />
        </button>
      </div>

      {open && (
        <div className="border-b border-content/10 px-6 py-6 md:hidden">
          <GroupList pathname={pathname} alertas={alertas} onNavigate={() => setOpen(false)} />
          <div className="mt-6 flex items-center justify-between border-t border-content/10 pt-4">
            <span className="truncate text-[12px] text-content/50">{email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-[12px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-content/10 px-5 py-6 md:flex">
        <span className="mb-8 text-sm uppercase tracking-[0.3em]">
          ALBIZIA <span className="text-content/40">admin</span>
        </span>
        <div className="flex-1">
          <GroupList pathname={pathname} alertas={alertas} />
        </div>
        <div className="mt-6 border-t border-content/10 pt-4">
          <p className="truncate text-[12px] text-content/50">{email}</p>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 text-[12px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
