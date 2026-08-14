import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, Legend,
} from 'recharts'
import { FlaskConical, Package, ClipboardList } from 'lucide-react'
import { api, type DashboardData } from '../services/api'
import { Card, MetricCard, LoadingState, EmptyState, Badge, Table, Thead, Tr, Td } from '../components/ui'

const PIE_COLORS = ['#1f7a4d', '#b91c1c']

const chartTooltipStyle = {
  contentStyle: { backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--color-muted-foreground)' },
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

  if (loading) return <LoadingState className="py-24" size={32} />

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
        <h1 className="font-serif text-3xl font-semibold text-foreground">Bem-vindo ao SCQ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil: <span className="font-medium text-primary">{user.perfil}</span>
          {' · '}
          {user.email}
        </p>
      </div>

      {/* 4 cards de resumo */}
      {data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard icon={FlaskConical} label="Total de Análises" value={data.totalAnalises} tone="primary" />
          <MetricCard icon={FlaskConical} label="Análises esta semana" value={data.analisesEstaSemana} tone="accent" />
          <Card>
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fichas</p>
              <Package size={16} className="text-info" />
            </div>
            <p className="mt-2 text-lg font-bold text-success">
              {data.fichasConformes} <span className="text-xs font-normal text-muted-foreground">conf.</span>
            </p>
            <p className="text-lg font-bold text-danger">
              {data.fichasNaoConformes} <span className="text-xs font-normal text-muted-foreground">não conf.</span>
            </p>
          </Card>
          <MetricCard icon={ClipboardList} label="Total de Coletas" value={data.totalColetas} tone="warning" />
        </div>
      )}

      {/* Gráficos */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Barra: análises por dia */}
          <Card>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Análises por dia (7 dias)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barDayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="dia" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...chartTooltipStyle} itemStyle={{ color: 'var(--color-primary)' }} />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pizza: status fichas */}
          <Card>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status das fichas</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={64} innerRadius={32}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(value) => <span style={{ color: 'var(--color-muted-foreground)', fontSize: 11 }}>{value}</span>} />
                <Tooltip {...chartTooltipStyle} itemStyle={{ color: 'var(--color-foreground)' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Barra horizontal: top 5 produtores por análises */}
          <Card>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top 5 produtores</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={top5Data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...chartTooltipStyle} itemStyle={{ color: 'var(--color-accent)' }} formatter={(v) => [v, 'Análises']} />
                <Bar dataKey="total" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Tabela últimas análises */}
      {data && data.ultimasAnalises.length > 0 && (
        <Card>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Últimas análises</h3>
          <Table minWidth="min-w-[480px]">
            <Thead headers={['Ticket', 'Produtor', 'Palito %', 'Desconto', 'Data']} />
            <tbody>
              {data.ultimasAnalises.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-mono text-xs text-primary">{a.ticket ?? '—'}</Td>
                  <Td className="font-medium">{a.nomeProdutor}</Td>
                  <Td>{a.percentualPalito}%</Td>
                  <Td>
                    <Badge tone={a.desconto === 0 ? 'success' : 'warning'}>{a.desconto}%</Badge>
                  </Td>
                  <Td className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {!data && <EmptyState message="Nenhum dado disponível ainda." />}
    </div>
  )
}
