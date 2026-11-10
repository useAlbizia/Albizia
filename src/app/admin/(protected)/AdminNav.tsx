"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "./actions";
import { ThemeToggle } from "./ThemeToggle";
import { InstalarApp } from "./InstalarApp";

type Item = { href: string; label: string };
type Group = { title: string; items: Item[] };

// Organizado pelo que se faz, do mais usado ao menos usado. "Dia a dia" é o
// que se abre toda vez; "Ajustes" é o que se mexe uma vez e esquece.
const GROUPS: Group[] = [
  {
    title: "Dia a dia",
    items: [
      { href: "/admin", label: "Início" },
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/lancamentos", label: "Lançamentos" },
    ],
  },
  {
    // A empresa por dentro: dinheiro dos sócios e resultado do mês.
    title: "Dinheiro",
    items: [
      { href: "/admin/socios", label: "Sócios e caixa" },
      { href: "/admin/fechamento", label: "Fechamento do mês" },
      { href: "/admin/financeiro", label: "Relatório de vendas" },
    ],
  },
  {
    title: "Clientes",
    items: [
      { href: "/admin/clientes", label: "Clientes" },
      { href: "/admin/carrinhos", label: "Recuperação" },
      { href: "/admin/emails", label: "E-mails" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    title: "Loja",
    items: [
      { href: "/admin/produtos", label: "Produtos" },
      { href: "/admin/insumos", label: "Insumos" },
      { href: "/admin/cupons", label: "Cupons" },
      { href: "/admin/avaliacoes", label: "Avaliações" },
      { href: "/admin/banners", label: "Banners" },
      { href: "/admin/marketing", label: "Marketing" },
    ],
  },
  {
    title: "Ajustes",
    items: [
      { href: "/admin/pagamentos", label: "Meio de pagamento" },
      { href: "/admin/frete", label: "Entrega e frete" },
      { href: "/admin/conteudo", label: "Conteúdo" },
      { href: "/admin/menu", label: "Menu do site" },
      { href: "/admin/usuarios", label: "Usuários" },
      { href: "/admin/auditoria", label: "Auditoria" },
    ],
  },
  {
    title: "Ajuda",
    items: [{ href: "/admin/manual", label: "Manual e tour" }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Contadores = { alertas: number; emails: number; aprovar: number };

/** O número que aparece ao lado de cada item, e o que ele quer dizer. */
function contadorDe(href: string, c: Contadores): { n: number; rotulo: string } {
  if (href === "/admin/lancamentos") return { n: c.aprovar, rotulo: "para você aprovar" };
  // Venda parada é dinheiro esperando: o número aparece no menu inteiro do
  // admin, não só para quem lembra de abrir a fila.
  if (href === "/admin/carrinhos") return { n: c.alertas, rotulo: "venda(s) parada(s)" };
  if (href === "/admin/emails") return { n: c.emails, rotulo: "e-mail(s) não lido(s)" };
  return { n: 0, rotulo: "" };
}

function Contador({ n, rotulo }: { n: number; rotulo: string }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} ${rotulo}`}
      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-content px-1.5 text-[11px] font-medium leading-none text-surface"
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Menu do computador: lista lateral discreta. */
function GroupList({ pathname, contadores }: { pathname: string; contadores: Contadores }) {
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-content/40">{group.title}</p>
          <div className="flex flex-col">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const c = contadorDe(item.href, contadores);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`-mx-2 flex items-center justify-between gap-2 border-l-2 px-3 py-1.5 text-[13px] tracking-[0.08em] transition-colors ${
                    active ? "border-content font-medium text-content" : "border-transparent text-content/60 hover:text-content"
                  }`}
                >
                  <span>{item.label}</span>
                  <Contador {...c} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Menu do celular: blocos grandes, dois por linha, fáceis de acertar com o
 * polegar, separados por grupo. O que tem pendência aparece com o número.
 */
function MenuCelular({
  pathname,
  contadores,
  onNavigate,
}: {
  pathname: string;
  contadores: Contadores;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-content/45">{group.title}</p>
          <div className="grid grid-cols-2 gap-2">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const c = contadorDe(item.href, contadores);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[52px] items-center justify-between gap-2 border px-3.5 py-3 text-[14px] leading-tight transition-colors ${
                    active
                      ? "border-content bg-content text-surface"
                      : c.n > 0
                        ? "border-content text-content"
                        : "border-content/15 text-content/80"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? null : <Contador {...c} />}
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
  emails = 0,
  aprovar = 0,
}: {
  email: string | undefined;
  alertas?: number;
  /** E-mails não lidos na caixa de entrada. */
  emails?: number;
  /** Lançamentos esperando a aprovação de quem está logado. */
  aprovar?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const contadores: Contadores = { alertas, emails, aprovar };
  const algoPendente = aprovar > 0 || alertas > 0 || emails > 0;

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-content/10 px-4 py-3 md:hidden">
        <span className="text-sm uppercase tracking-[0.3em]">ALBIZIA</span>
        <div className="flex items-center gap-1">
          <InstalarApp />
          <ThemeToggle />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
          data-tour="menu-celular"
          aria-expanded={open}
          className="relative flex h-10 w-10 flex-col items-center justify-center gap-1.5"
        >
          <span className="h-px w-5 bg-content" />
          <span className="h-px w-5 bg-content" />
          <span className="h-px w-5 bg-content" />
          {/* Ponto de aviso: tem algo esperando dentro do menu. */}
          {algoPendente && !open && (
            <span aria-hidden="true" className="absolute right-1 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-content" />
          )}
        </button>
        </div>
      </div>

      {open && (
        <div className="border-b border-content/10 px-4 py-5 md:hidden">
          <MenuCelular pathname={pathname} contadores={contadores} onNavigate={() => setOpen(false)} />
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
      <aside data-tour="menu" className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-content/10 px-5 py-6 md:flex">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm uppercase tracking-[0.3em]">
            ALBIZIA <span className="text-content/40">admin</span>
          </span>
          <ThemeToggle />
        </div>
        <div className="mb-8">
          <InstalarApp />
        </div>
        <div className="flex-1">
          <GroupList pathname={pathname} contadores={contadores} />
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
