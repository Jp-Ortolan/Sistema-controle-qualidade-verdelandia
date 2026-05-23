import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, Legend,
} from 'recharts'
import { FlaskConical, Package, ClipboardList, Loader2 } from 'lucide-react'
import { api, type DashboardData } from '../services/api'

const PIE_COLORS = ['#16a34a', '#dc2626']

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon size={16} className={color} />
      </div>
      <p className="mt-2 text-3xl font-bold text-zinc-100">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('scq_user') ?? '{}') as { email?: string; perfil?: string }

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard.get()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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

  const top5Data = data?.top5Produtores ?? []

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

      {/* 4 cards de resumo */}
      {data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={FlaskConical} label="Total de Análises" value={data.totalAnalises} color="text-emerald-400" />
          <StatCard icon={FlaskConical} label="Análises esta semana" value={data.analisesEstaSemana} color="text-teal-400" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Fichas</p>
              <Package size={16} className="text-blue-400" />
            </div>
            <p className="mt-2 text-lg font-bold text-emerald-400">
              {data.fichasConformes} <span className="text-xs font-normal text-zinc-500">conf.</span>
            </p>
            <p className="text-lg font-bold text-red-400">
              {data.fichasNaoConformes} <span className="text-xs font-normal text-zinc-500">não conf.</span>
            </p>
          </div>
          <StatCard icon={ClipboardList} label="Total de Coletas" value={data.totalColetas} color="text-amber-400" />
        </div>
      )}

      {/* Gráficos */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Barra: análises por dia */}
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

          {/* Pizza: status fichas */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status das fichas</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={64} innerRadius={32}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: 11 }}>{value}</span>} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Barra horizontal: top 5 produtores por análises */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Top 5 produtores</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={top5Data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  itemStyle={{ color: '#0d9488' }}
                  formatter={(v) => [v, 'Análises']}
                />
                <Bar dataKey="total" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela últimas análises */}
      {data && data.ultimasAnalises.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Últimas análises</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr>
                  {['Ticket', 'Produtor', 'Palito %', 'Desconto', 'Data'].map((h) => (
                    <th key={h} className="bg-emerald-900/90 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.ultimasAnalises.map((a) => (
                  <tr key={a.id} className="even:bg-zinc-900/40 hover:bg-zinc-800/40 transition">
                    <td className="border-t border-zinc-800 px-4 py-2 text-center text-xs font-mono text-emerald-400">{a.ticket ?? '—'}</td>
                    <td className="border-t border-zinc-800 px-4 py-2 text-center text-sm font-medium text-zinc-200">{a.nomeProdutor}</td>
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

      {!data && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
          Nenhum dado disponível ainda.
        </div>
      )}
    </div>
  )
}
