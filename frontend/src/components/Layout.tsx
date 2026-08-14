import { useState, useEffect, type ReactNode, type ElementType } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3, ClipboardList, FlaskConical, Package, Menu, X,
  LogOut, Layers, ScrollText, Sun, Moon, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { getPerfil, can, type Resource } from '../lib/permissions'
import { getInitialTheme, applyTheme, persistTheme } from '../lib/theme'

interface NavItem {
  to: string
  icon: ElementType
  label: string
  resource: Resource | null
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operação',
    items: [
      { to: '/dashboard', icon: BarChart3,    label: 'Dashboard',          resource: null },
      { to: '/lotes',     icon: Layers,       label: 'Lotes',              resource: 'lotes' },
      { to: '/analises',  icon: FlaskConical, label: 'Análises',           resource: 'analises' },
      { to: '/coletas',   icon: ClipboardList,label: 'Coletas de Amostra', resource: 'coletas' },
    ],
  },
  {
    label: 'Qualidade',
    items: [
      { to: '/fichas', icon: Package, label: 'Fichas de Embalagem', resource: 'fichas' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { to: '/logs', icon: ScrollText, label: 'Logs de Auditoria', resource: 'logs' },
    ],
  },
]

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items)

function getInitialCollapsed(): boolean {
  return localStorage.getItem('scq_sidebar_collapsed') === '1'
}

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  // Usa a preferência salva; na 1ª visita, segue o tema do sistema operacional.
  const [isDark, setIsDark] = useState(getInitialTheme)

  const navigate  = useNavigate()
  const location  = useLocation()
  const perfil    = getPerfil()
  const user      = JSON.parse(localStorage.getItem('scq_user') ?? '{}') as { email?: string; perfil?: string }

  // Aplica/remove a classe .dark-theme no body
  useEffect(() => {
    applyTheme(isDark)
  }, [isDark])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    persistTheme(next)
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('scq_sidebar_collapsed', next ? '1' : '0')
      return next
    })
  }

  const navGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((n) => n.resource === null || can.view(n.resource, perfil)) }))
    .filter((g) => g.items.length > 0)
  const pageTitle =
    ALL_NAV.find((n) => location.pathname.startsWith(n.to) && n.to !== '/dashboard')?.label
    ?? (location.pathname === '/dashboard' ? 'Dashboard' : 'SCQ')

  function logout() {
    localStorage.removeItem('scq_token')
    localStorage.removeItem('scq_user')
    navigate('/login')
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* ── Overlay da sidebar (mobile) ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar — overlay no mobile, coluna persistente/colapsável no desktop ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-all duration-200 md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Cabeçalho da sidebar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-9 w-auto shrink-0 object-contain" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-serif text-sm font-bold text-foreground truncate">Verdelândia</p>
              <p className="text-[9px] text-muted-foreground leading-tight">Sistema de Controle de Qualidade</p>
            </div>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:text-foreground transition md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Rodapé da sidebar */}
        <div className="border-t border-border px-4 py-3">
          {!collapsed && (
            <>
              <p className="text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">
                Conectado como
              </p>
              <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
              <p className="text-xs text-primary font-medium mb-2">{user.perfil}</p>
            </>
          )}
          <button
            onClick={logout}
            title={collapsed ? 'Sair do sistema' : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
          >
            <LogOut size={14} />
            {!collapsed && 'Sair do sistema'}
          </button>
          <button
            onClick={toggleCollapsed}
            className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground md:flex"
          >
            {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            {!collapsed && 'Recolher'}
          </button>
        </div>
      </aside>

      {/* ── Coluna principal ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
          >
            <Menu size={20} />
          </button>

          <span className="truncate text-sm font-semibold text-foreground">{pageTitle}</span>

          <div className="ml-auto flex items-center gap-2">
            {/* Toggle tema */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs font-medium text-foreground">{user.email}</span>
              <span className="text-[10px] text-muted-foreground">{user.perfil}</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
