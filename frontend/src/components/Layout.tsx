import { useState, useEffect, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3, ClipboardList, FlaskConical, Package, Menu, X,
  LogOut, Layers, ScrollText, Sun, Moon,
} from 'lucide-react'
import { getPerfil, can } from '../lib/permissions'
import { getInitialTheme, applyTheme, persistTheme } from '../lib/theme'

const ALL_NAV = [
  { to: '/dashboard', icon: BarChart3,    label: 'Dashboard',            resource: null },
  { to: '/lotes',     icon: Layers,       label: 'Lotes',                resource: 'lotes'    as const },
  { to: '/analises',  icon: FlaskConical, label: 'Análises de Erva-Mate',resource: 'analises' as const },
  { to: '/fichas',    icon: Package,      label: 'Fichas de Embalagem',  resource: 'fichas'   as const },
  { to: '/coletas',   icon: ClipboardList,label: 'Coletas de Amostra',   resource: 'coletas'  as const },
  { to: '/logs',      icon: ScrollText,   label: 'Logs de Auditoria',    resource: 'logs'     as const },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

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

  const nav = ALL_NAV.filter((n) => n.resource === null || can.view(n.resource, perfil))
  const pageTitle =
    ALL_NAV.find((n) => location.pathname.startsWith(n.to) && n.to !== '/dashboard')?.label
    ?? (location.pathname === '/dashboard' ? 'Dashboard' : 'SCQ')

  function logout() {
    localStorage.removeItem('scq_token')
    localStorage.removeItem('scq_user')
    navigate('/login')
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <Menu size={20} />
        </button>

        <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-9 w-auto object-contain" />

        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-xs font-bold tracking-wide text-foreground">SCQ</span>
          <span className="text-[10px] text-muted-foreground">Sistema de Controle de Qualidade</span>
        </div>

        <div className="mx-3 hidden sm:block h-6 w-px bg-border" />

        <span className="text-sm font-semibold text-foreground hidden sm:block truncate max-w-[200px]">
          {pageTitle}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Toggle tema */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs font-medium text-foreground">{user.email}</span>
            <span className="text-[10px] text-muted-foreground">{user.perfil}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 transition"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {/* ── Overlay da sidebar ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-68 flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho da sidebar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-9 w-auto object-contain" />
          <div className="min-w-0">
            <p className="font-serif text-sm font-bold text-foreground truncate">Verdelândia</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Sistema de Controle de Qualidade</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:text-foreground transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition border ${
                  isActive
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Rodapé da sidebar */}
        <div className="border-t border-border px-4 py-3">
          <p className="text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">
            Conectado como
          </p>
          <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
          <p className="text-xs text-primary font-medium mb-2">{user.perfil}</p>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10 transition"
          >
            <LogOut size={14} /> Sair do sistema
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <main className="flex-1 px-4 py-6 sm:px-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
