import { useState, useEffect, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3, ClipboardList, FlaskConical, Package, Menu, X,
  LogOut, Layers, ScrollText, Sun, Moon,
} from 'lucide-react'
import { getPerfil, can } from '../lib/permissions'

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

  // isDark = true por padrão (dark-theme aplicado via classe no body)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('scq_theme') !== 'light')

  const navigate  = useNavigate()
  const location  = useLocation()
  const perfil    = getPerfil()
  const user      = JSON.parse(localStorage.getItem('scq_user') ?? '{}') as { email?: string; perfil?: string }

  // Aplica/remove a classe .dark-theme no body
  useEffect(() => {
    document.body.classList.toggle('dark-theme', isDark)
  }, [isDark])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('scq_theme', next ? 'dark' : 'light')
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
    /* Wrapper — fundo via CSS var */
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* ── Topbar ── */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-2.5 backdrop-blur-md"
        style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-color)' }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
        >
          <Menu size={20} />
        </button>

        <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-9 w-auto object-contain" />

        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-xs font-bold tracking-wide text-zinc-300">SCQ</span>
          <span className="text-[10px] text-zinc-500">Sistema de Controle de Qualidade</span>
        </div>

        <div className="mx-3 hidden sm:block h-6 w-px bg-zinc-700" />

        <span className="text-sm font-semibold text-zinc-300 hidden sm:block truncate max-w-[200px]">
          {pageTitle}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Toggle tema */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs font-medium text-zinc-200">{user.email}</span>
            <span className="text-[10px] text-zinc-500">{user.perfil}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-600/10 hover:text-rose-300 transition"
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
        className={`fixed left-0 top-0 z-50 flex h-full w-68 flex-col border-r shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}
      >
        {/* Cabeçalho da sidebar */}
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-9 w-auto object-contain" />
          <div className="min-w-0">
            <p className="font-serif text-sm font-bold text-zinc-100 truncate">Verdelândia</p>
            <p className="text-[9px] text-zinc-500 leading-tight">Sistema de Controle de Qualidade</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-1 text-zinc-500 hover:text-zinc-300 transition"
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
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-600/40'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-transparent'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Rodapé da sidebar */}
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <p className="text-[10px] text-zinc-500 mb-0.5 font-medium uppercase tracking-wide">
            Conectado como
          </p>
          <p className="text-sm font-semibold text-zinc-200 truncate">{user.email}</p>
          <p className="text-xs text-emerald-500 font-medium mb-2">{user.perfil}</p>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-600/10 hover:border-rose-600/30 transition"
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
