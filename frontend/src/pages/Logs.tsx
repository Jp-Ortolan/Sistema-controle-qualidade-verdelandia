import { useState, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import { api, type AuditLog } from '../services/api'

const ACAO_COLOR: Record<string, string> = {
  CRIAR: 'bg-emerald-500/15 text-emerald-400',
  EDITAR: 'bg-blue-500/15 text-blue-400',
  EXCLUIR: 'bg-red-500/15 text-red-400',
}

const ENTIDADE_COLOR: Record<string, string> = {
  ANALISE: 'bg-teal-500/15 text-teal-400',
  FICHA: 'bg-purple-500/15 text-purple-400',
  COLETA: 'bg-amber-500/15 text-amber-400',
  LOTE: 'bg-sky-500/15 text-sky-400',
}

function Badge({ label, colorCls }: { label: string; colorCls: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorCls}`}>
      {label}
    </span>
  )
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-xl">
      {msg}<button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

export default function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [filters, setFilters] = useState({ entidade: '', acao: '' })

  const limite = 50

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
      setToast('Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1); setPagina(1) }, [])

  function handleFilter() { setPagina(1); load(1) }

  const totalPages = Math.ceil(total / limite)

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Logs de Auditoria</h1>
        <p className="mt-1 text-sm text-zinc-500">Histórico de todas as operações realizadas no sistema</p>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <select
          value={filters.entidade}
          onChange={(e) => setFilters((f) => ({ ...f, entidade: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
        >
          <option value="">Todas as entidades</option>
          <option value="ANALISE">Análise</option>
          <option value="FICHA">Ficha</option>
          <option value="COLETA">Coleta</option>
          <option value="LOTE">Lote</option>
        </select>
        <select
          value={filters.acao}
          onChange={(e) => setFilters((f) => ({ ...f, acao: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
        >
          <option value="">Todas as ações</option>
          <option value="CRIAR">Criar</option>
          <option value="EDITAR">Editar</option>
          <option value="EXCLUIR">Excluir</option>
        </select>
        <button
          onClick={handleFilter}
          className="rounded-xl bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-600"
        >
          Filtrar
        </button>
        <span className="ml-auto self-center text-xs text-zinc-500">{total} registro(s)</span>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-700/60 shadow-lg">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  {['Data', 'Usuário', 'Ação', 'Entidade', 'ID', 'Detalhes'].map((h) => (
                    <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-zinc-600">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : logs.map((l) => (
                  <tr key={l.id} className="even:bg-zinc-900/40 transition hover:bg-zinc-800/40">
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">
                      {l.userEmail}
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center">
                      <Badge label={l.acao} colorCls={ACAO_COLOR[l.acao] ?? 'bg-zinc-700/30 text-zinc-400'} />
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center">
                      <Badge label={l.entidade} colorCls={ENTIDADE_COLOR[l.entidade] ?? 'bg-zinc-700/30 text-zinc-400'} />
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center font-mono text-xs text-zinc-400">
                      #{l.entidadeId}
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-left text-xs text-zinc-500 font-mono max-w-[260px] truncate">
                      {l.detalhes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => { const p = Math.max(1, pagina - 1); setPagina(p); load(p) }}
                disabled={pagina === 1}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-sm text-zinc-500">{pagina} / {totalPages}</span>
              <button
                onClick={() => { const p = Math.min(totalPages, pagina + 1); setPagina(p); load(p) }}
                disabled={pagina === totalPages}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
