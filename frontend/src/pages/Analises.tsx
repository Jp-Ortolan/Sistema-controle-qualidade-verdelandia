import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X, Loader2, Search, Pencil, Trash2, Copy } from 'lucide-react'
import { api, type Analise, type Lote } from '../services/api'
import { getPerfil, can } from '../lib/permissions'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

function descontoLabel(pct: number): string {
  if (pct <= 5) return '0'
  if (pct <= 10) return '5'
  if (pct <= 15) return '10'
  return '15'
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('pt-BR')
}

const TODAY = new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  nomeProdutor: '',
  loteId: '',
  dataAnalise: TODAY,
  dataFabricacao: '',
  percentualPalito: '',
  teorPo: '',
  umidade: '',
  observacao: '',
}

type FormState = typeof EMPTY_FORM
type FormErrors = Partial<Record<keyof FormState, string>>

const PRODUTO_LABEL: Record<string, string> = {
  NATURAL: 'Erva Natural',
  ABACAXI: 'Abacaxi',
  MENTA_LIMAO: 'Menta & Limão',
  LIMAO: 'Limão',
}

const inputCls = 'w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
const selectCls = 'w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

export default function Analises() {
  const perfil = getPerfil()
  const canWrite = can.write('analises', perfil)
  const canDel = can.delete('analises', perfil)
  const canExport = can.export('analises', perfil)

  const [analises, setAnalises] = useState<Analise[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Analise | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filters, setFilters] = useState({ nomeProdutor: '', dataInicio: '', dataFim: '' })
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  async function load() {
    setLoading(true)
    try {
      const [a, l] = await Promise.all([
        api.analises.list({
          nomeProdutor: filters.nomeProdutor || undefined,
          dataInicio: filters.dataInicio || undefined,
          dataFim: filters.dataFim || undefined,
        }),
        api.lotes.list(),
      ])
      setAnalises(a)
      setLotes(l)
    } catch {
      setToast({ msg: 'Erro ao carregar dados', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, dataAnalise: TODAY })
    setErrors({})
    setShowForm(true)
  }

  function openEdit(a: Analise) {
    setEditingItem(a)
    setForm({
      nomeProdutor: a.nomeProdutor,
      loteId: a.loteId ? String(a.loteId) : '',
      dataAnalise: a.dataAnalise.split('T')[0],
      dataFabricacao: a.dataFabricacao ? a.dataFabricacao.split('T')[0] : '',
      percentualPalito: String(a.percentualPalito),
      teorPo: a.teorPo != null ? String(a.teorPo) : '',
      umidade: a.umidade != null ? String(a.umidade) : '',
      observacao: a.observacao ?? '',
    })
    setErrors({})
    setShowForm(true)
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.nomeProdutor.trim()) errs.nomeProdutor = 'Nome do produtor é obrigatório'
    if (!form.dataAnalise) errs.dataAnalise = 'Data da análise é obrigatória'
    if (!form.percentualPalito) errs.percentualPalito = 'Teor de palito é obrigatório'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      nomeProdutor: form.nomeProdutor.trim(),
      loteId: form.loteId ? parseInt(form.loteId) : null,
      dataAnalise: form.dataAnalise,
      dataFabricacao: form.dataFabricacao || null,
      percentualPalito: parseFloat(form.percentualPalito),
      teorPo: form.teorPo !== '' ? parseFloat(form.teorPo) : null,
      umidade: form.umidade !== '' ? parseFloat(form.umidade) : null,
      observacao: form.observacao.trim() || null,
    }
    try {
      if (editingItem) {
        await api.analises.update(editingItem.id, payload)
        setToast({ msg: 'Análise atualizada!', type: 'ok' })
      } else {
        await api.analises.create(payload)
        setToast({ msg: 'Análise registrada!', type: 'ok' })
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
      await api.analises.delete(id)
      setToast({ msg: 'Análise excluída!', type: 'ok' })
      setConfirmId(null)
      load()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' })
      setConfirmId(null)
    }
  }

  function handleCopy(a: Analise) {
    const text = [
      `Análise ${a.ticket ?? `#${a.id}`}`,
      `Produtor: ${a.nomeProdutor}`,
      `Data: ${formatDate(a.dataAnalise)}`,
      `Palito: ${a.percentualPalito}% → Desconto: ${a.desconto}%`,
      a.teorPo != null ? `Teor de Pó: ${a.teorPo}%` : '',
      a.umidade != null ? `Umidade: ${a.umidade}%` : '',
      a.observacao ? `Obs: ${a.observacao}` : '',
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text).then(
      () => setToast({ msg: 'Copiado!', type: 'ok' }),
      () => setToast({ msg: 'Falha ao copiar', type: 'err' }),
    )
  }

  const pct = parseFloat(form.percentualPalito)
  const previewDesconto = !isNaN(pct) ? descontoLabel(pct) + '%' : '—'
  const showActions = canWrite || canDel || canExport

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Análises de Palito</h1>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500"
          >
            <Plus size={16} /> Nova Análise
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <input
          value={filters.nomeProdutor}
          onChange={(e) => setFilters((f) => ({ ...f, nomeProdutor: e.target.value }))}
          placeholder="Buscar por produtor..."
          className="min-w-[180px] flex-1 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-base font-bold text-zinc-100">{editingItem ? 'Editar Análise' : 'Nova Análise'}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="analise-form" onSubmit={handleSubmit} className="space-y-4">

                {/* Ticket (somente visualização em edição) */}
                {editingItem?.ticket && (
                  <div className="rounded-xl border border-emerald-800/50 bg-emerald-900/20 px-4 py-2.5 flex items-center gap-3">
                    <span className="text-xs text-zinc-500">Ticket</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">{editingItem.ticket}</span>
                    <span className="ml-auto text-[10px] text-zinc-600">gerado automaticamente</span>
                  </div>
                )}

                {/* Nome do Produtor */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Produtor / Fornecedor<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    value={form.nomeProdutor}
                    onChange={(e) => setForm((f) => ({ ...f, nomeProdutor: e.target.value }))}
                    placeholder="Ex: Sítio Boa Esperança"
                    className={inputCls}
                  />
                  {errors.nomeProdutor && <p className="mt-1 text-xs text-red-400">{errors.nomeProdutor}</p>}
                </div>

                {/* Lote */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Lote</label>
                  <select
                    value={form.loteId}
                    onChange={(e) => setForm((f) => ({ ...f, loteId: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Nenhum</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>{l.codigo} — {PRODUTO_LABEL[l.produto] ?? l.produto}</option>
                    ))}
                  </select>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Data da Análise<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.dataAnalise}
                      onChange={(e) => setForm((f) => ({ ...f, dataAnalise: e.target.value }))}
                      className={inputCls}
                    />
                    {errors.dataAnalise && <p className="mt-1 text-xs text-red-400">{errors.dataAnalise}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Data de Fabricação</label>
                    <input
                      type="date"
                      value={form.dataFabricacao}
                      onChange={(e) => setForm((f) => ({ ...f, dataFabricacao: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Campos numéricos */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Teor de Palito %<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.percentualPalito}
                      onChange={(e) => setForm((f) => ({ ...f, percentualPalito: e.target.value }))}
                      placeholder="Ex: 8.5"
                      className={inputCls}
                    />
                    {errors.percentualPalito && <p className="mt-1 text-xs text-red-400">{errors.percentualPalito}</p>}
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 px-3 py-2.5">
                      <p className="text-[10px] text-zinc-500">Desconto calculado</p>
                      <p className="mt-0.5 text-lg font-bold text-emerald-400">{previewDesconto}</p>
                      <p className="text-[9px] text-zinc-600">≤5%→0 · 6-10%→5 · 11-15%→10 · &gt;15%→15</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Teor de Pó %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.teorPo}
                      onChange={(e) => setForm((f) => ({ ...f, teorPo: e.target.value }))}
                      placeholder="Opcional"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">Umidade %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.umidade}
                      onChange={(e) => setForm((f) => ({ ...f, umidade: e.target.value }))}
                      placeholder="Opcional"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Observação */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Observação</label>
                  <textarea
                    rows={2}
                    value={form.observacao}
                    onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                    placeholder="Observações opcionais..."
                    className={inputCls}
                  />
                </div>
              </form>
            </div>

            <div className="flex gap-3 border-t border-zinc-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                form="analise-form"
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="mx-auto animate-spin" /> : editingItem ? 'Atualizar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-700/60 shadow-lg">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr>
                {[
                  'Ticket', 'Produtor', 'Lote', 'Palito %', 'Teor Pó %', 'Umidade %', 'Desconto', 'Data',
                  ...(showActions ? ['Ações'] : []),
                ].map((h) => (
                  <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analises.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 9 : 8} className="py-10 text-center text-sm text-zinc-600">
                    Nenhuma análise encontrada
                  </td>
                </tr>
              ) : analises.map((a) => (
                <tr key={a.id} className="even:bg-zinc-900/40 transition hover:bg-zinc-800/40">
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center font-mono text-sm text-emerald-400">
                    {a.ticket ?? <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm font-medium text-zinc-200">{a.nomeProdutor}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-400">
                    {a.lote ? a.lote.codigo : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{a.percentualPalito}%</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">
                    {a.teorPo != null ? `${a.teorPo}%` : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">
                    {a.umidade != null ? `${a.umidade}%` : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.desconto === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {a.desconto}%
                    </span>
                  </td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">
                    {formatDate(a.dataAnalise)}
                  </td>
                  {showActions && (
                    <td className="border-t border-zinc-800 px-4 py-2 text-center">
                      {confirmId === a.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(a.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canExport && (
                            <button onClick={() => handleCopy(a)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-blue-400" title="Copiar">
                              <Copy size={14} />
                            </button>
                          )}
                          {canWrite && (
                            <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-emerald-400" title="Editar">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDel && (
                            <button onClick={() => setConfirmId(a.id)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700 hover:text-red-400" title="Excluir">
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
