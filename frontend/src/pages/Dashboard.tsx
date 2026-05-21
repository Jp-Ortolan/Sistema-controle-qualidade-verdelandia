import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, Legend,
} from 'recharts'
import { FlaskConical, Package, ClipboardList, Layers, TrendingDown, AlertCircle, Loader2 } from 'lucide-react'
import { api, type DashboardData } from '../services/api'
import { getPerfil, can } from '../lib/permissions'

const NAV_CARDS = [
  { to: '/analises', resource: 'analises' as const, icon: FlaskConical, title: 'Análises', desc: 'Registrar análises de palito', color: 'from-emerald-600 to-emerald-800' },
  { to: '/fichas', resource: 'fichas' as const, icon: Package, title: 'Fichas FORQSE001', desc: 'Fichas de liberação de embalagens', color: 'from-emerald-700 to-emerald-900' },
  { to: '/coletas', resource: 'coletas' as const, icon: ClipboardList, title: 'Coletas', desc: 'Registro de coletas de amostra', color: 'from-teal-600 to-teal-800' },
  { to: '/lotes', resource: 'lotes' as const, icon: Layers, title: 'Lotes', desc: 'Controle de lotes de produção', color: 'from-teal-700 to-teal-900' },
]

const PIE_COLORS = ['#16a34a', '#dc2626']

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon size={16} className={color} />
      </div>
      <p className="mt-2 text-3xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-600">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const perfil = getPerfil()
  const user = JSON.parse(localStorage.getItem('scq_user') ?? '{}') as { email?: string; perfil?: string }

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard.get()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const navCards = NAV_CARDS.filter((c) => can.view(c.resource, perfil))

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  const pieData = data
    ? [
        { name: 'Conformes', value: data.fichasConformes },
        { name: 'Não Conformes', value: data.fichasNaoConformes },
      ]
    : []

  const barDayData = (data?.analisesPorDia ?? []).map((d) => ({
    dia: d.dia.slice(8, 10) + '/' + d.dia.slice(5, 7),
    total: d.total,
  }))

  const descontoData = (data?.descontoPorProdutor ?? []).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-100">Bem-vindo ao SCQ</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Perfil: <span className="font-medium text-emerald-400">{user.perfil}</span>
          {' · '}
          {user.email}
        </p>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={FlaskConical} label="Total análises" value={data.totalAnalises} color="text-emerald-400" />
          <StatCard icon={TrendingDown} label="Análises hoje" value={data.analisesHoje} color="text-teal-400" />
          <StatCard icon={AlertCircle} label="Média desconto" value={`${data.mediaDesconto.toFixed(1)}%`} color="text-amber-400" />
          <StatCard icon={AlertCircle} label="Média palito" value={`${data.mediaTeorPalito.toFixed(1)}%`} color="text-amber-400" />
          <StatCard icon={Layers} label="Lotes semana" value={data.lotesEstaSemana} color="text-blue-400" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Fichas</p>
            <p className="mt-2 text-lg font-bold text-emerald-400">{data.fichasConformes} <span className="text-xs font-normal text-zinc-500">conf.</span></p>
            <p className="text-lg font-bold text-red-400">{data.fichasNaoConformes} <span className="text-xs font-normal text-zinc-500">não conf.</span></p>
          </div>
        </div>
      )}

      {/* Charts row */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Bar: analyses per day */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Análises por dia (7 dias)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barDayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="dia" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie: ficha status */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status das fichas</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={64} innerRadius={32}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: 11 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Horizontal bar: desconto por produtor */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Top 5 desconto médio</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={descontoData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  itemStyle={{ color: '#0d9488' }}
                  formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Desconto médio']}
                />
                <Bar dataKey="mediaDesconto" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Last analyses table */}
      {data && data.ultimasAnalises.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Últimas análises</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr>
                  {['#', 'Produtor', 'Palito %', 'Desconto', 'Data'].map((h) => (
                    <th key={h} className="bg-emerald-900/90 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.ultimasAnalises.map((a) => (
                  <tr key={a.id} className="even:bg-zinc-900/40 hover:bg-zinc-800/40 transition">
                    <td className="border-t border-zinc-800 px-4 py-2 text-center text-xs text-zinc-500">{a.id}</td>
                    <td className="border-t border-zinc-800 px-4 py-2 text-center text-sm font-medium text-zinc-200">{a.produtor.nome}</td>
                    <td className="border-t border-zinc-800 px-4 py-2 text-center text-sm text-zinc-300">{a.percentualPalito}%</td>
                    <td className="border-t border-zinc-800 px-4 py-2 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.desconto === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                        {a.desconto}%
                      </span>
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2 text-center text-xs text-zinc-500">
                      {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation cards */}
      {navCards.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Módulos</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {navCards.map(({ to, icon: Icon, title, desc, color }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition hover:border-emerald-700/50 hover:bg-zinc-900"
              >
                <div className={`mb-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${color} p-3 shadow-lg`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h2 className="text-base font-bold text-zinc-100 transition group-hover:text-emerald-400">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">{desc}</p>
                <div className={`absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r ${color} transition-all duration-300 group-hover:w-full`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
