import { useState, useEffect } from 'react'
import { api, type AuditLog } from '../services/api'
import Pagination from '../components/Pagination'
import Toast from '../components/Toast'
import {
  Button, Select, PageHeader, Badge, type Tone,
  LoadingState, EmptyState, Table, Thead, Tr, Td,
} from '../components/ui'

const ACAO_TONE: Record<string, Tone> = {
  CRIAR: 'success',
  EDITAR: 'info',
  EXCLUIR: 'danger',
}

const ENTIDADE_TONE: Record<string, Tone> = {
  ANALISE: 'accent',
  FICHA: 'primary',
  COLETA: 'warning',
  LOTE: 'info',
}

const DETALHE_LABEL: Record<string, string> = {
  codigo: 'Código',
  fornecedor: 'Fornecedor',
  status: 'Status',
  destino: 'Destino',
  ticket: 'Ticket',
  nomeProdutor: 'Produtor',
}

function formatDetalhes(detalhes: string | null | undefined): string {
  if (!detalhes) return '—'
  try {
    const obj = JSON.parse(detalhes) as Record<string, unknown>
    const pairs = Object.entries(obj).filter(([, v]) => v != null && v !== '')
    if (pairs.length === 0) return '—'
    return pairs
      .map(([k, v]) => `${DETALHE_LABEL[k] ?? k}: ${v}`)
      .join(' · ')
  } catch {
    return detalhes
  }
}

export default function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filters, setFilters] = useState({ entidade: '', acao: '' })

  const limite = 10

  async function load(pg = pagina) {
    setLoading(true)
    try {
      const res = await api.logs.list({
        entidade: filters.entidade || undefined,
        acao: filters.acao || undefined,
        pagina: String(pg),
        limite: String(limite),
      })
      setLogs(res.logs)
      setTotal(res.total)
    } catch {
      setToast({ msg: 'Erro ao carregar logs', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1); setPagina(1) }, [])

  function handleFilter() { setPagina(1); load(1) }

  const totalPages = Math.ceil(total / limite)

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader title="Logs de Auditoria" description="Histórico de todas as operações realizadas no sistema" />

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <Select value={filters.entidade} onChange={(e) => setFilters((f) => ({ ...f, entidade: e.target.value }))} className="w-auto">
          <option value="">Todas as entidades</option>
          <option value="ANALISE">Análise</option>
          <option value="FICHA">Ficha</option>
          <option value="COLETA">Coleta</option>
          <option value="LOTE">Lote</option>
        </Select>
        <Select value={filters.acao} onChange={(e) => setFilters((f) => ({ ...f, acao: e.target.value }))} className="w-auto">
          <option value="">Todas as ações</option>
          <option value="CRIAR">Criar</option>
          <option value="EDITAR">Editar</option>
          <option value="EXCLUIR">Excluir</option>
        </Select>
        <Button variant="secondary" onClick={handleFilter}>Filtrar</Button>
        <span className="ml-auto self-center text-xs text-muted-foreground">{total} registro(s)</span>
      </div>

      {/* Tabela */}
      {loading ? (
        <LoadingState />
      ) : logs.length === 0 ? (
        <EmptyState message="Nenhum log encontrado" />
      ) : (
        <>
          <Table minWidth="min-w-[700px]">
            <Thead headers={['Data', 'Usuário', 'Ação', 'Entidade', 'ID', 'Detalhes']} />
            <tbody>
              {logs.map((l) => (
                <Tr key={l.id}>
                  <Td className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('pt-BR')}
                  </Td>
                  <Td>{l.userEmail}</Td>
                  <Td>
                    <Badge tone={ACAO_TONE[l.acao] ?? 'neutral'}>{l.acao}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={ENTIDADE_TONE[l.entidade] ?? 'neutral'}>{l.entidade}</Badge>
                  </Td>
                  <Td className="font-mono text-xs text-muted-foreground">#{l.entidadeId}</Td>
                  <Td align="left" className="text-xs text-muted-foreground max-w-[260px] truncate" title={formatDetalhes(l.detalhes)}>
                    {formatDetalhes(l.detalhes)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          <Pagination
            page={pagina}
            totalPages={totalPages}
            onPageChange={(p) => { setPagina(p); load(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        </>
      )}
    </div>
  )
}
