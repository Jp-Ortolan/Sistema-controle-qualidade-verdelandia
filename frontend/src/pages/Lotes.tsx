import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react'
import { api, type Lote } from '../services/api'
import { getPerfil, can } from '../lib/permissions'
import Pagination from '../components/Pagination'
import Toast from '../components/Toast'

type ToastT = { msg: string; type: 'ok' | 'err' | 'info' | 'warn' }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function formatPeriodo(inicio: string, fim: string): string {
  return `${fmtDate(inicio)} a ${fmtDate(fim)}`
}

const EMPTY_FORM = { codigo: '', dataInicio: '', dataFim: '', observacao: '' }

type FormState = typeof EMPTY_FORM
type FormErrors = Partial<Record<keyof FormState, string>>

export default function Lotes() {
  const perfil = getPerfil()
  const canWrite = can.write('lotes', perfil)
  const canDel = can.delete('lotes', perfil)

  const [lotes, setLotes] = useState<Lote[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Lote | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastT | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  async function load(pg = page) {
    setLoading(true)
    try {
      const res = await api.lotes.list({ page: String(pg), limit: '10' })
      setLotes(res.data)
      setTotalPages(res.totalPages)
    } catch {
      setToast({ msg: 'Erro ao carregar lotes', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  function handlePageChange(pg: number) {
    setPage(pg)
    load(pg)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCreate() {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowForm(true)
  }

  function openEdit(l: Lote) {
    setEditingItem(l)
    setForm({
      codigo: l.codigo,
      dataInicio: l.dataInicio.split('T')[0],
      dataFim: l.dataFim.split('T')[0],
      observacao: l.observacao ?? '',
    })
    setErrors({})
    setShowForm(true)
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.codigo.trim()) errs.codigo = 'Código é obrigatório'
    if (!form.dataInicio) errs.dataInicio = 'Data de início é obrigatória'
    if (!form.dataFim) errs.dataFim = 'Data de fim é obrigatória'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleDataInicioChange(value: string) {
    setForm((f) => ({
      ...f,
      dataInicio: value,
      dataFim: value ? addDays(value, 7) : f.dataFim,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      codigo: form.codigo.trim(),
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      observacao: form.observacao.trim() || undefined,
    }
    try {
      if (editingItem) {
        await api.lotes.update(editingItem.id, payload)
        setToast({ msg: 'Registro atualizado com sucesso!', type: 'ok' })
      } else {
        await api.lotes.create(payload)
        setToast({ msg: 'Registro salvo com sucesso!', type: 'ok' })
      }
      setShowForm(false)
      setPage(1); load(1)
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.', type: 'err' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.lotes.delete(id)
      setToast({ msg: 'Registro excluído com sucesso!', type: 'ok' })
      setConfirmId(null)
      setPage(1); load(1)
    } catch (err) {
      setToast({ msg: 'Erro ao excluir. Tente novamente.', type: 'err' })
      setConfirmId(null)
    }
  }

  const inputCls = 'w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  const disabledCls = 'w-full rounded-xl border border-zinc-700/50 bg-zinc-800/30 px-4 py-2.5 text-sm text-zinc-500 outline-none cursor-not-allowed'

  const showActions = canWrite || canDel

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Lotes de Produção</h1>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500"
          >
            <Plus size={16} /> Novo Lote
          </button>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto p-3 min-[480px]:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-100">{editingItem ? 'Editar Lote' : 'Novo Lote'}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Código */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Código<span className="ml-0.5 text-red-400">*</span>
                </label>
                <input
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                  placeholder="Ex: L2026001"
                  className={inputCls}
                />
                {errors.codigo && <p className="mt-1 text-xs text-red-400">{errors.codigo}</p>}
              </div>

              {/* Produto (fixo) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Produto</label>
                <input
                  value="Erva-Mate Cancheada"
                  disabled
                  className={disabledCls}
                />
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Data de Início<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => handleDataInicioChange(e.target.value)}
                    className={inputCls}
                  />
                  {errors.dataInicio && <p className="mt-1 text-xs text-red-400">{errors.dataInicio}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Data de Fim<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.dataFim}
                    onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))}
                    className={inputCls}
                  />
                  {errors.dataFim && <p className="mt-1 text-xs text-red-400">{errors.dataFim}</p>}
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Observação</label>
                <textarea
                  rows={3}
                  value={form.observacao}
                  onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  placeholder="Observações opcionais..."
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 min-[380px]:flex-row">
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
                  {saving ? <Loader2 size={16} className="mx-auto animate-spin" /> : editingItem ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-xl border border-zinc-700/60 shadow-lg">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  {['#', 'Código', 'Produto', 'Período', 'Observação', 'Cadastro', ...(showActions ? ['Ações'] : [])].map((h) => (
                    <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotes.length === 0 ? (
                  <tr>
                    <td colSpan={showActions ? 7 : 6} className="py-10 text-center text-sm text-zinc-600">
                      Nenhum lote cadastrado
                    </td>
                  </tr>
                ) : lotes.map((l) => (
                  <tr key={l.id} className="even:bg-zinc-900/40 transition hover:bg-zinc-800/40">
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{l.id}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm font-medium text-zinc-200">{l.codigo}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{l.produto}</td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">
                      {formatPeriodo(l.dataInicio, l.dataFim)}
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-400">
                      {l.observacao ?? <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">
                      {new Date(l.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    {showActions && (
                      <td className="border-t border-zinc-800 px-4 py-2 text-center">
                        {confirmId === l.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <button onClick={() => handleDelete(l.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Confirmar</button>
                            <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            {canWrite && (
                              <button onClick={() => openEdit(l)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-emerald-400" title="Editar">
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDel && (
                              <button onClick={() => setConfirmId(l.id)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-red-400" title="Excluir">
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
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  )
}
