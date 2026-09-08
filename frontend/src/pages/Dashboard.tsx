import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { api, type DashboardData } from '../services/api'
import { Card, LoadingState, EmptyState, Badge, Table, Thead, Tr, Td } from '../components/ui'

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

  const totalFichas = (data?.fichasConformes ?? 0) + (data?.fichasNaoConformes ?? 0)
  const pctConformes = totalFichas > 0 ? Math.round(((data?.fichasConformes ?? 0) / totalFichas) * 100) : 0

  const barDayData = (data?.analisesPorDia ?? []).map((d) => ({
    dia: d.dia.slice(8, 10) + '/' + d.dia.slice(5, 7),
    total: d.total,
  }))

  const top5Data = data?.top5Produtores ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Bem-vindo ao SCQ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil: <span className="font-medium text-primary">{user.perfil}</span>
          {' · '}
          {user.email}
        </p>
      </div>

      {/* Faixa de indicadores — leitura tipo painel, sem cartões-ícone repetidos */}
      {data && (
        <Card className="!p-0">
          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
            {[
              { label: 'Total de análises', value: data.totalAnalises },
              { label: 'Análises esta semana', value: data.analisesEstaSemana },
              { label: 'Fichas conformes', value: data.fichasConformes, tone: 'text-success' },
              { label: 'Total de coletas', value: data.totalColetas },
            ].map((s) => (
              <div key={s.label} className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className={`mt-1.5 font-mono text-2xl font-bold ${s.tone ?? 'text-foreground'}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Análises por dia domina o espaço; fichas e produtores ficam compactos ao lado */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Análises por dia (7 dias)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barDayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="dia" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...chartTooltipStyle} itemStyle={{ color: 'var(--color-primary)' }} />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="flex flex-col gap-4">
            {/* Status das fichas — barra de proporção, não donut decorativo */}
            <Card>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status das fichas</h3>
              <div className="flex items-baseline gap-5">
                <div>
                  <p className="font-mono text-2xl font-bold text-success">{data.fichasConformes}</p>
                  <p className="text-[11px] text-muted-foreground">conformes</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-bold text-danger">{data.fichasNaoConformes}</p>
                  <p className="text-[11px] text-muted-foreground">não conf.</p>
                </div>
              </div>
              {totalFichas > 0 && (
                <>
                  <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-sm bg-danger/25">
                    <div className="h-full bg-success" style={{ width: `${pctConformes}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{pctConformes}% conformes</p>
                </>
              )}
            </Card>

            {/* Top 5 produtores */}
            <Card>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top 5 produtores</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={top5Data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip {...chartTooltipStyle} itemStyle={{ color: 'var(--color-accent)' }} formatter={(v) => [v, 'Análises']} />
                  <Bar dataKey="total" fill="var(--color-accent)" radius={[0, 2, 2, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
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
                  <Td className="font-mono tabular-nums">{a.percentualPalito}%</Td>
                  <Td>
                    <Badge tone={a.desconto === 0 ? 'success' : 'warning'} className="font-mono">{a.desconto}%</Badge>
                  </Td>
                  <Td className="font-mono text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</Td>
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
