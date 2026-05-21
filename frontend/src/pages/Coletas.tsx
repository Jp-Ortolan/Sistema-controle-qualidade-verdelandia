import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X, Loader2, Search, FileSpreadsheet, Pencil, Trash2, Copy } from 'lucide-react'
import { api, type ColetaAmostra } from '../services/api'
import { getPerfil, can } from '../lib/permissions'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('pt-BR')
}

const TODAY = new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  dataColeta: TODAY,
  tipoProduto: '',
  destino: '',
}

type FormState = typeof EMPTY_FORM
type FormErrors = Partial<Record<keyof FormState, string>>

const inputCls = 'w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
const selectCls = 'w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

export default function Coletas() {
  const perfil = getPerfil()
  const canWrite = can.write('coletas', perfil)
  const canDel = can.delete('coletas', perfil)
  const canExport = can.export('coletas', perfil)

  const [coletas, setColetas] = useState<ColetaAmostra[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<ColetaAmostra | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filters, setFilters] = useState({ tipoProduto: '', destino: '', dataInicio: '', dataFim: '' })
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  async function load() {
    setLoading(true)
    try {
      const c = await api.coletas.list({
        tipoProduto: filters.tipoProduto || undefined,
        destino: filters.destino || undefined,
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined,
      })
      setColetas(c)
    } catch {
      setToast({ msg: 'Erro ao carregar dados', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, dataColeta: TODAY })
    setErrors({})
    setShowForm(true)
  }

  function openEdit(c: ColetaAmostra) {
    setEditingItem(c)
    setForm({
      dataColeta: c.dataColeta.split('T')[0],
      tipoProduto: c.tipoProduto,
      destino: c.destino,
    })
    setErrors({})
    setShowForm(true)
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.dataColeta) errs.dataColeta = 'Data da coleta é obrigatória'
    if (!form.tipoProduto) errs.tipoProduto = 'Tipo de produto é obrigatório'
    if (!form.destino.trim()) errs.destino = 'Destino é obrigatório'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      dataColeta: form.dataColeta,
      tipoProduto: form.tipoProduto,
      destino: form.destino.trim(),
    }
    try {
      if (editingItem) {
        await api.coletas.update(editingItem.id, payload)
        setToast({ msg: 'Coleta atualizada!', type: 'ok' })
      } else {
        await api.coletas.create(payload)
        setToast({ msg: 'Coleta registrada!', type: 'ok' })
      }
      setShowForm(false)
      load()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.coletas.delete(id)
      setToast({ msg: 'Coleta excluída!', type: 'ok' })
      setConfirmId(null)
      load()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' })
      setConfirmId(null)
    }
  }

  async function handleExportar() {
    setExporting(true)
    try {
      const res = await api.coletas.exportar()
      if (!res.ok) throw new Error('Erro ao exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'coletas-scq.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setToast({ msg: 'Erro ao exportar Excel', type: 'err' })
    } finally {
      setExporting(false)
    }
  }

  function handleCopy(c: ColetaAmostra) {
    const text = [
      `Coleta #${c.id}`,
      `Produto: ${c.tipoProduto}`,
      `Destino: ${c.destino}`,
      `Data: ${formatDate(c.dataColeta)}`,
    ].join('\n')
    navigator.clipboard.writeText(text).then(
      () => setToast({ msg: 'Copiado!', type: 'ok' }),
      () => setToast({ msg: 'Falha ao copiar', type: 'err' }),
    )
  }

  const showActions = canWrite || canDel || canExport

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Coletas de Amostra</h1>
        <div className="flex gap-3">
          {canExport && (
            <button
              onClick={handleExportar}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl border border-emerald-700/50 bg-emerald-700/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-700/20 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
              Exportar Excel
            </button>
          )}
          {canWrite && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500"
            >
              <Plus size={16} /> Nova Coleta
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <input
          value={filters.tipoProduto}
          onChange={(e) => setFilters((f) => ({ ...f, tipoProduto: e.target.value }))}
          placeholder="Tipo de produto"
          className="min-w-[140px] flex-1 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
        />
        <input
          value={filters.destino}
          onChange={(e) => setFilters((f) => ({ ...f, destino: e.target.value }))}
          placeholder="Destino"
          className="min-w-[120px] flex-1 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
        />
        <input
          type="date"
          value={filters.dataInicio}
          onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
        />
        <input
          type="date"
          value={filters.dataFim}
          onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
        />
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-xl bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-600"
        >
          <Search size={15} /> Filtrar
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-100">{editingItem ? 'Editar Coleta' : 'Nova Coleta de Amostra'}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Data da Coleta */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Data da Coleta<span className="ml-0.5 text-red-400">*</span>
                </label>
                <input
                  type="date"
                  max={TODAY}
                  value={form.dataColeta}
                  onChange={(e) => setForm((f) => ({ ...f, dataColeta: e.target.value }))}
                  className={inputCls}
                />
                {errors.dataColeta && <p className="mt-1 text-xs text-red-400">{errors.dataColeta}</p>}
              </div>

              {/* Tipo de Produto */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Tipo de Produto<span className="ml-0.5 text-red-400">*</span>
                </label>
                <select
                  value={form.tipoProduto}
                  onChange={(e) => setForm((f) => ({ ...f, tipoProduto: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">Selecione...</option>
                  <option value="Natural">Natural</option>
                  <option value="Abacaxi">Abacaxi</option>
                  <option value="Menta & Limão">Menta & Limão</option>
                  <option value="Limão">Limão</option>
                </select>
                {errors.tipoProduto && <p className="mt-1 text-xs text-red-400">{errors.tipoProduto}</p>}
              </div>

              {/* Destino */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Destino da Amostra<span className="ml-0.5 text-red-400">*</span>
                </label>
                <input
                  value={form.destino}
                  onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
                  placeholder="Ex: Laboratório Interno"
                  className={inputCls}
                />
                {errors.destino && <p className="mt-1 text-xs text-red-400">{errors.destino}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="mx-auto animate-spin" /> : editingItem ? 'Atualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-700/60 shadow-lg">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                {[
                  '#', 'Tipo Produto', 'Destino', 'Data Coleta', 'Cadastro',
                  ...(showActions ? ['Ações'] : []),
                ].map((h) => (
                  <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coletas.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 6 : 5} className="py-10 text-center text-sm text-zinc-600">
                    Nenhuma coleta encontrada
                  </td>
                </tr>
              ) : coletas.map((c) => (
                <tr key={c.id} className="even:bg-zinc-900/40 transition hover:bg-zinc-800/40">
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{c.id}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm font-medium text-zinc-200">{c.tipoProduto}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{c.destino}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{formatDate(c.dataColeta)}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                  {showActions && (
                    <td className="border-t border-zinc-800 px-4 py-2 text-center">
                      {confirmId === c.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(c.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canExport && (
                            <button
                              onClick={() => handleCopy(c)}
                              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-blue-400"
                              title="Copiar"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => openEdit(c)}
                              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-emerald-400"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDel && (
                            <button
                              onClick={() => setConfirmId(c.id)}
                              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-red-400"
                              title="Excluir"
                            >
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
      )}
    </div>
  )
}
