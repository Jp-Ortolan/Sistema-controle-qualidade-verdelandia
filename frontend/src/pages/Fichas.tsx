import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X, Loader2, Search, FileDown, Trash2, Pencil } from 'lucide-react'
import { api, type FichaEmbalagem, type Parametro } from '../services/api'
import { getPerfil, can } from '../lib/permissions'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

const EMPTY_PARAM: Parametro = { nome: '', valor: '', conforme: true }
const EMPTY_FORM = { lote: '', fornecedor: '' }

export default function Fichas() {
  const perfil = getPerfil()
  const canWrite = can.write('fichas', perfil)
  const canDel = can.delete('fichas', perfil)

  const [data, setData] = useState<{ fichas: FichaEmbalagem[]; total: number }>({ fichas: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<FichaEmbalagem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filters, setFilters] = useState({ status: '', dataInicio: '', dataFim: '' })
  const [pagina, setPagina] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [parametros, setParametros] = useState<Parametro[]>([{ ...EMPTY_PARAM }])
  const limite = 10

  async function load(pg = pagina) {
    setLoading(true)
    try {
      const res = await api.fichas.list({ status: filters.status || undefined, dataInicio: filters.dataInicio || undefined, dataFim: filters.dataFim || undefined, pagina: String(pg), limite: String(limite) })
      setData(res)
    } catch { setToast({ msg: 'Erro ao carregar fichas', type: 'err' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [pagina])

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setParametros([{ ...EMPTY_PARAM }]); setShowForm(true) }
  function openEdit(f: FichaEmbalagem) {
    setEditing(f)
    setForm({ lote: f.lote, fornecedor: f.fornecedor })
    setParametros(JSON.parse(f.parametros) as Parametro[])
    setShowForm(true)
  }

  function addParam() { setParametros((p) => [...p, { ...EMPTY_PARAM }]) }
  function removeParam(i: number) { setParametros((p) => p.filter((_, idx) => idx !== i)) }
  function updateParam(i: number, field: keyof Parametro, value: string | boolean) {
    setParametros((p) => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  const statusGlobal = parametros.every((p) => p.conforme) ? 'CONFORME' : 'NAO_CONFORME'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (parametros.some((p) => !p.nome || !p.valor)) { setToast({ msg: 'Preencha todos os parâmetros', type: 'err' }); return }
    setSaving(true)
    const payload = { ...form, parametros, statusGlobal }
    try {
      if (editing) { await api.fichas.update(editing.id, payload); setToast({ msg: 'Ficha atualizada!', type: 'ok' }) }
      else { await api.fichas.create(payload); setToast({ msg: 'Ficha criada!', type: 'ok' }) }
      setShowForm(false); load(1)
    } catch (err) { setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' }) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    try { await api.fichas.delete(id); setToast({ msg: 'Ficha excluída!', type: 'ok' }); setConfirmId(null); load(1) }
    catch (err) { setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' }); setConfirmId(null) }
  }

  async function handleDownloadPdf(id: number, lote: string) {
    setDownloadingId(id)
    try {
      const res = await api.fichas.downloadPdf(id)
      if (!res.ok) throw new Error('Erro ao gerar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `ficha-${lote}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { setToast({ msg: 'Erro ao baixar PDF', type: 'err' }) }
    finally { setDownloadingId(null) }
  }

  const totalPaginas = Math.ceil(data.total / limite)

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Fichas de Embalagem</h1>
        {canWrite && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg">
            <Plus size={16} /> Nova Ficha
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500">
          <option value="">Todos os status</option>
          <option value="CONFORME">Conforme</option>
          <option value="NAO_CONFORME">Não Conforme</option>
        </select>
        <input type="date" value={filters.dataInicio} onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500" />
        <input type="date" value={filters.dataFim} onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500" />
        <button onClick={() => { setPagina(1); load(1) }} className="flex items-center gap-2 rounded-xl bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 transition">
          <Search size={15} /> Filtrar
        </button>
      </div>

      {/* Modal FORQSE001 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-zinc-100">FORQSE001 — {editing ? 'Editar' : 'Nova'} Ficha de Embalagem</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Status global calculado automaticamente pelos parâmetros</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <form id="ficha-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Lote</label>
                    <input required value={form.lote} onChange={(e) => setForm((f) => ({ ...f, lote: e.target.value }))} placeholder="Ex: L2024001"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Fornecedor</label>
                    <input required value={form.fornecedor} onChange={(e) => setForm((f) => ({ ...f, fornecedor: e.target.value }))} placeholder="Nome do fornecedor"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400">Parâmetros</label>
                    <button type="button" onClick={addParam} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition">
                      <Plus size={13} /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {parametros.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/40 px-3 py-2">
                        <input value={p.nome} onChange={(e) => updateParam(i, 'nome', e.target.value)} placeholder="Parâmetro"
                          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none" />
                        <input value={p.valor} onChange={(e) => updateParam(i, 'valor', e.target.value)} placeholder="Valor"
                          className="w-24 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none text-center" />
                        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer shrink-0">
                          <input type="checkbox" checked={p.conforme} onChange={(e) => updateParam(i, 'conforme', e.target.checked)} className="accent-emerald-500" />
                          OK
                        </label>
                        {parametros.length > 1 && (
                          <button type="button" onClick={() => removeParam(i)} className="text-zinc-600 hover:text-red-400 transition shrink-0"><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${statusGlobal === 'CONFORME' ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-400' : 'border-red-600/40 bg-red-500/10 text-red-400'}`}>
                  Status Global: {statusGlobal === 'CONFORME' ? '✓ CONFORME' : '✗ NÃO CONFORME'}
                </div>
              </form>
            </div>
            <div className="border-t border-zinc-800 px-6 py-4 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition">Cancelar</button>
              <button form="ficha-form" type="submit" disabled={saving} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : editing ? 'Atualizar' : 'Salvar Ficha'}
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
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  {['#', 'Lote', 'Fornecedor', 'Status', 'Data', 'PDF', ...(canWrite || canDel ? ['Ações'] : [])].map((h) => (
                    <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.fichas.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-zinc-600">Nenhuma ficha encontrada</td></tr>
                ) : data.fichas.map((f) => (
                  <tr key={f.id} className="even:bg-zinc-900/40 hover:bg-zinc-800/40 transition">
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{f.id}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm font-medium text-zinc-200">{f.lote}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{f.fornecedor}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.statusGlobal === 'CONFORME' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {f.statusGlobal === 'CONFORME' ? 'Conforme' : 'Não Conforme'}
                      </span>
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{new Date(f.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center">
                      <button onClick={() => handleDownloadPdf(f.id, f.lote)} disabled={downloadingId === f.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-700/30 disabled:opacity-50 transition">
                        {downloadingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={13} />} PDF
                      </button>
                    </td>
                    {(canWrite || canDel) && (
                      <td className="border-t border-zinc-800 px-4 py-2 text-center">
                        {confirmId === f.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <button onClick={() => handleDelete(f.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Confirmar</button>
                            <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            {canWrite && <button onClick={() => openEdit(f)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-emerald-400 transition"><Pencil size={14} /></button>}
                            {canDel && <button onClick={() => setConfirmId(f.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 transition"><Trash2 size={14} /></button>}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
              <span>{data.total} fichas · página {pagina} de {totalPaginas}</span>
              <div className="flex gap-2">
                <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800 disabled:opacity-40 transition">← Anterior</button>
                <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800 disabled:opacity-40 transition">Próxima →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
