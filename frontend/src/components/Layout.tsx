import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { BarChart3, ClipboardList, FlaskConical, Package, Menu, X, LogOut, Layers } from 'lucide-react'
import { getPerfil, can } from '../lib/permissions'

const ALL_NAV = [
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard', resource: null },
  { to: '/lotes', icon: Layers, label: 'Lotes', resource: 'lotes' as const },
  { to: '/analises', icon: FlaskConical, label: 'Análises', resource: 'analises' as const },
  { to: '/fichas', icon: Package, label: 'Fichas de Embalagem', resource: 'fichas' as const },
  { to: '/coletas', icon: ClipboardList, label: 'Coletas de Amostra', resource: 'coletas' as const },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const perfil = getPerfil()
  const user = JSON.parse(localStorage.getItem('scq_user') ?? '{}') as { email?: string; perfil?: string }

  const nav = ALL_NAV.filter((n) => n.resource === null || can.view(n.resource, perfil))
  const pageTitle = ALL_NAV.find((n) => location.pathname.startsWith(n.to) && n.to !== '/dashboard')?.label
    ?? (location.pathname === '/dashboard' ? 'Dashboard' : 'SCQ')

  function logout() {
    localStorage.removeItem('scq_token')
    localStorage.removeItem('scq_user')
    navigate('/login')
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#09090b]">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/90 px-4 py-2.5 backdrop-blur-md">
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition">
          <Menu size={20} />
        </button>
        <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-10 w-auto object-contain" />
        <span className="text-sm font-semibold text-zinc-300 hidden sm:block">{pageTitle}</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs font-medium text-zinc-200">{user.email}</span>
            <span className="text-[10px] text-zinc-500">{user.perfil}</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-600/10 hover:text-rose-300 transition">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      <aside className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-10 w-auto object-contain" />
          <div>
            <p className="font-serif text-base font-semibold text-zinc-100">Verdelândia</p>
            <p className="text-[10px] text-zinc-500">Sistema de Controle de Qualidade</p>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1 text-zinc-500 hover:text-zinc-300 transition">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  isActive ? 'border-emerald-600/50 bg-emerald-500/10 text-emerald-400'
                           : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 px-5 py-4">
          <p className="text-xs text-zinc-600 mb-1">Conectado como</p>
          <p className="text-sm font-medium text-zinc-300">{user.email}</p>
          <p className="text-xs text-emerald-500/80 font-medium">{user.perfil}</p>
          <button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-600/10 hover:border-rose-600/30 transition">
            <LogOut size={15} /> Sair do sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
