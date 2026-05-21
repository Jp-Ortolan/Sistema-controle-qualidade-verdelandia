import { useNavigate } from 'react-router-dom'
import { Users, FlaskConical, Package, ClipboardList } from 'lucide-react'
import { getPerfil, can } from '../lib/permissions'

const ALL_CARDS = [
  { to: '/produtores', resource: 'produtores' as const, icon: Users, title: 'Produtores', desc: 'Cadastro e gerenciamento de fornecedores de erva-mate', color: 'from-teal-600 to-teal-800' },
  { to: '/analises', resource: 'analises' as const, icon: FlaskConical, title: 'Análises de Palito', desc: 'Registro com cálculo automático de desconto por percentual', color: 'from-emerald-600 to-emerald-800' },
  { to: '/fichas', resource: 'fichas' as const, icon: Package, title: 'Fichas de Embalagem', desc: 'Formulário FORQSE001 com geração de PDF', color: 'from-emerald-700 to-emerald-900' },
  { to: '/coletas', resource: 'coletas' as const, icon: ClipboardList, title: 'Coletas de Amostra', desc: 'Registro de coletas com exportação para Excel', color: 'from-teal-700 to-teal-900' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const perfil = getPerfil()
  const user = JSON.parse(localStorage.getItem('scq_user') ?? '{}') as { email?: string; perfil?: string }

  const cards = ALL_CARDS.filter((c) => can.view(c.resource, perfil))

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-zinc-100">Bem-vindo ao SCQ</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Perfil: <span className="text-emerald-400 font-medium">{user.perfil}</span>
          {' · '}
          {user.email}
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
          Nenhum módulo disponível para este perfil.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(({ to, icon: Icon, title, desc, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition hover:border-emerald-700/50 hover:bg-zinc-900"
            >
              <div className={`mb-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${color} p-3 shadow-lg`}>
                <Icon size={22} className="text-white" />
              </div>
              <h2 className="text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition">{title}</h2>
              <p className="mt-1 text-sm text-zinc-500 leading-relaxed">{desc}</p>
              <div className={`absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r ${color} transition-all duration-300 group-hover:w-full`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
