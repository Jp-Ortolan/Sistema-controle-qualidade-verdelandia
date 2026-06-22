import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X, Loader2, Search, FileDown, Pencil, Trash2 } from 'lucide-react'
import { api, type FichaEmbalagem, type Parametro } from '../services/api'
import { getPerfil, can } from '../lib/permissions'
import Pagination from '../components/Pagination'
import Toast from '../components/Toast'

type ToastT = { msg: string; type: 'ok' | 'err' | 'info' | 'warn' }

const PARAM_NAMES = ['Densidade', 'Dimensões', 'Visual / Impressões', 'Código de Barras']

const EMPTY_PARAMS: Parametro[] = [
  { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true },
  { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true },
  { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true },
  { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true },
]

const inputCls = 'w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

export default function Fichas() {
  const perfil = getPerfil()
  const canWrite = can.write('fichas', perfil)
  const canDel = can.delete('fichas', perfil)
  const canExport = can.export('fichas', perfil)

  const [data, setData] = useState<{ fichas: FichaEmbalagem[]; total: number }>({ fichas: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<FichaEmbalagem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastT | null>(null)
  const [filters, setFilters] = useState({ status: '', dataInicio: '', dataFim: '' })
  const [pagina, setPagina] = useState(1)
  const [fornecedor, setFornecedor] = useState('')
  const [parametros, setParametros] = useState<Parametro[]>(EMPTY_PARAMS.map((p) => ({ ...p })))
  const [observacoes, setObservacoes] = useState('')
  const [fornecedorError, setFornecedorError] = useState('')
  const [observacoesError, setObservacoesError] = useState('')
  const limite = 10

  async function load(pg = pagina) {
    setLoading(true)
    try {
      const res = await api.fichas.list({
        status: filters.status || undefined,
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined,
        pagina: String(pg),
        limite: String(limite),
      })
      setData(res)
    } catch {
      setToast({ msg: 'Erro ao carregar fichas', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [pagina])

  function resetForm() {
    setFornecedor('')
    setParametros(EMPTY_PARAMS.map((p) => ({ ...p })))
    setObservacoes('')
    setFornecedorError('')
    setObservacoesError('')
  }

  function openCreate() {
    setEditingItem(null)
    resetForm()
    setShowForm(true)
  }

  function openEdit(f: FichaEmbalagem) {
    setEditingItem(f)
    setFornecedor(f.fornecedor)
    const parsed = JSON.parse(f.parametros) as Parametro[]
    const padded: Parametro[] = Array.from({ length: 4 }, (_, i) =>
      parsed[i] ?? { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true }
    )
    padded[2] = { ...padded[2], unidade: '', unidadePadrao: '' }
    setParametros(padded)
    setObservacoes(f.observacoes ?? '')
    setFornecedorError('')
    setObservacoesError('')
    setShowForm(true)
  }

  function updateParam(i: number, field: keyof Parametro, value: string | boolean) {
    setParametros((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  const statusGlobal = parametros.every((p) => p.conforme) ? 'CONFORME' : 'NAO_CONFORME'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const forn = fornecedor.trim()
    if (!forn) { setFornecedorError('Fornecedor é obrigatório'); return }
    if (forn.length < 3) { setFornecedorError('Fornecedor deve ter pelo menos 3 caracteres'); return }
    if (forn.length > 100) { setFornecedorError('Fornecedor deve ter no máximo 100 caracteres'); return }
    setFornecedorError('')
    if (observacoes.length > 500) { setObservacoesError('Observação deve ter no máximo 500 caracteres'); return }
    setObservacoesError('')
    setSaving(true)
    const payload = {
      fornecedor: fornecedor.trim(),
      parametros,
      observacoes: observacoes.trim() || null,
      statusGlobal,
    }
    try {
      if (editingItem) {
        await api.fichas.update(editingItem.id, payload)
        setToast({ msg: 'Registro atualizado com sucesso!', type: 'ok' })
      } else {
        await api.fichas.create(payload)
        setToast({ msg: 'Registro salvo com sucesso!', type: 'ok' })
      }
      setShowForm(false)
      load(1)
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.', type: 'err' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.fichas.delete(id)
      setToast({ msg: 'Registro excluído com sucesso!', type: 'ok' })
      setConfirmId(null)
      load(1)
    } catch (err) {
      setToast({ msg: 'Erro ao excluir. Tente novamente.', type: 'err' })
      setConfirmId(null)
    }
  }

  async function handleDownloadPdf(id: number) {
    setDownloadingId(id)
    setToast({ msg: 'Gerando PDF, aguarde...', type: 'info' })
    try {
      const res = await api.fichas.downloadPdf(id)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `FORQSE001-${String(id).padStart(4, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setToast({ msg: 'Arquivo gerado com sucesso!', type: 'ok' })
    } catch {
      setToast({ msg: 'Erro ao gerar o arquivo. Tente novamente.', type: 'err' })
    } finally {
      setDownloadingId(null)
    }
  }

  const totalPaginas = Math.ceil(data.total / limite)
  const showActions = canWrite || canDel

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Fichas de Embalagem</h1>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500"
          >
            <Plus size={16} /> Nova Ficha
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
        >
          <option value="">Todos os status</option>
          <option value="CONFORME">Conforme</option>
          <option value="NAO_CONFORME">Não Conforme</option>
        </select>
        <input
          type="date"
          value={filters.dataInicio}
          onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
          className="flex-1 min-w-[120px] rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
        />
        <input
          type="date"
          value={filters.dataFim}
          onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
          className="flex-1 min-w-[120px] rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
        />
        <button
          onClick={() => { setPagina(1); load(1) }}
          className="flex items-center gap-2 rounded-xl bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-600"
        >
          <Search size={15} /> Filtrar
        </button>
      </div>

      {/* Modal FORQSE001 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-3 min-[480px]:px-6 min-[480px]:py-4">
              <div>
                <h2 className="text-base font-bold text-zinc-100">
                  FORQSE001 — {editingItem ? 'Editar' : 'Nova'} Ficha de Embalagem
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">Status global calculado automaticamente pelos parâmetros</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 min-[480px]:px-6 min-[480px]:py-5">
              <form id="ficha-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Fornecedor */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Fornecedor<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    placeholder="Nome do fornecedor"
                    className={inputCls}
                  />
                  {fornecedorError && <p className="mt-1 text-xs text-red-400">{fornecedorError}</p>}
                </div>

                {/* Parameters table */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">Parâmetros</label>
                  <div className="overflow-x-auto rounded-xl border border-zinc-700">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="bg-zinc-800/80">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 w-36">Parâmetro</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400">Resultado</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 w-16">UN</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400">Padrão</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 w-16">UN</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400 w-36">Conformidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PARAM_NAMES.map((name, i) => (
                          <tr key={i} className="border-t border-zinc-800 even:bg-zinc-800/20">
                            <td className="px-3 py-2">
                              <span className="text-xs font-medium text-zinc-300">{name}</span>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={parametros[i].resultado}
                                onChange={(e) => updateParam(i, 'resultado', e.target.value)}
                                placeholder="Valor obtido"
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={i === 2 ? '' : parametros[i].unidade}
                                onChange={(e) => updateParam(i, 'unidade', e.target.value)}
                                placeholder="UN"
                                disabled={i === 2}
                                className={`w-full rounded-lg border px-2 py-1.5 text-xs outline-none text-center ${i === 2 ? 'border-zinc-700/40 bg-zinc-800/20 text-zinc-600 cursor-not-allowed' : 'border-zinc-700 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500'}`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={parametros[i].padrao}
                                onChange={(e) => updateParam(i, 'padrao', e.target.value)}
                                placeholder="Padrão"
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={i === 2 ? '' : parametros[i].unidadePadrao}
                                onChange={(e) => updateParam(i, 'unidadePadrao', e.target.value)}
                                placeholder="UN"
                                disabled={i === 2}
                                className={`w-full rounded-lg border px-2 py-1.5 text-xs outline-none text-center ${i === 2 ? 'border-zinc-700/40 bg-zinc-800/20 text-zinc-600 cursor-not-allowed' : 'border-zinc-700 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500'}`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateParam(i, 'conforme', true)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${parametros[i].conforme ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                                >
                                  Conforme
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateParam(i, 'conforme', false)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${!parametros[i].conforme ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                                >
                                  N. Conf.
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Observações</label>
                  <textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observações opcionais..."
                    className={inputCls}
                  />
                  {observacoesError && <p className="mt-1 text-xs text-red-400">{observacoesError}</p>}
                </div>

                {/* Status global */}
                <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${statusGlobal === 'CONFORME' ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-400' : 'border-red-600/40 bg-red-500/10 text-red-400'}`}>
                  Status Global: {statusGlobal === 'CONFORME' ? '✓ CONFORME' : '✗ NÃO CONFORME'}
                </div>
              </form>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 px-3 py-3 min-[380px]:flex-row min-[480px]:px-6 min-[480px]:py-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                form="ficha-form"
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="mx-auto animate-spin" /> : editingItem ? 'Atualizar' : 'Salvar Ficha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-700/60 shadow-lg">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  {[
                    '#', 'Fornecedor', 'Status', 'Data',
                    ...(canExport ? ['PDF'] : []),
                    ...(showActions ? ['Ações'] : []),
                  ].map((h) => (
                    <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.fichas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-sm text-zinc-600">
                      Nenhuma ficha encontrada
                    </td>
                  </tr>
                ) : data.fichas.map((f) => (
                  <tr key={f.id} className="even:bg-zinc-900/40 transition hover:bg-zinc-800/40">
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{f.id}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{f.fornecedor}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.statusGlobal === 'CONFORME' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {f.statusGlobal === 'CONFORME' ? 'Conforme' : 'Não Conforme'}
                      </span>
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">
                      {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    {canExport && (
                      <td className="border-t border-zinc-800 px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleDownloadPdf(f.id)}
                          disabled={downloadingId === f.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-700/30 disabled:opacity-50"
                        >
                          {downloadingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={13} />} PDF
                        </button>
                      </td>
                    )}
                    {showActions && (
                      <td className="border-t border-zinc-800 px-4 py-2 text-center">
                        {confirmId === f.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <button onClick={() => handleDelete(f.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Confirmar</button>
                            <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            {canWrite && (
                              <button onClick={() => openEdit(f)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-emerald-400" title="Editar">
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDel && (
                              <button onClick={() => setConfirmId(f.id)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-red-400" title="Excluir">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagina}
            totalPages={totalPaginas}
            onPageChange={(p) => { setPagina(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        </>
      )}
    </div>
  )
}
