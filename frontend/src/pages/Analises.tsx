import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X, Loader2, Search, Pencil, Trash2 } from 'lucide-react'
import { api, type Analise, type Produtor } from '../services/api'
import { getPerfil, can } from '../lib/permissions'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

function descontoLabel(pct: number) {
  if (pct <= 5) return '0%'; if (pct <= 10) return '5%'; if (pct <= 15) return '10%'; return '15%'
}

const EMPTY_FORM = { produtorId: '', percentualPalito: '' }

export default function Analises() {
  const perfil = getPerfil()
  const canWrite = can.write('analises', perfil)
  const canDel = can.delete('analises', perfil)

  const [analises, setAnalises] = useState<Analise[]>([])
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Analise | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filters, setFilters] = useState({ produtorId: '', dataInicio: '', dataFim: '' })
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    setLoading(true)
    try {
      const [a, p] = await Promise.all([
        api.analises.list({ produtorId: filters.produtorId || undefined, dataInicio: filters.dataInicio || undefined, dataFim: filters.dataFim || undefined }),
        api.produtores.list(),
      ])
      setAnalises(a); setProdutores(p)
    } catch { setToast({ msg: 'Erro ao carregar dados', type: 'err' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(a: Analise) {
    setEditing(a)
    setForm({ produtorId: String(a.produtorId), percentualPalito: String(a.percentualPalito) })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { produtorId: parseInt(form.produtorId), percentualPalito: parseFloat(form.percentualPalito) }
    try {
      if (editing) { await api.analises.update(editing.id, payload); setToast({ msg: 'Análise atualizada!', type: 'ok' }) }
      else { await api.analises.create(payload); setToast({ msg: 'Análise registrada!', type: 'ok' }) }
      setShowForm(false); load()
    } catch (err) { setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' }) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    try {
      await api.analises.delete(id); setToast({ msg: 'Análise excluída!', type: 'ok' })
      setConfirmId(null); load()
    } catch (err) { setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' }); setConfirmId(null) }
  }

  const pct = parseFloat(form.percentualPalito)
  const previewDesconto = !isNaN(pct) ? descontoLabel(pct) : '—'

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Análises de Palito</h1>
        {canWrite && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg">
            <Plus size={16} /> Nova Análise
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <select value={filters.produtorId} onChange={(e) => setFilters((f) => ({ ...f, produtorId: e.target.value }))}
          className="flex-1 min-w-[180px] rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500">
          <option value="">Todos os produtores</option>
          {produtores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <input type="date" value={filters.dataInicio} onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500" />
        <input type="date" value={filters.dataFim} onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500" />
        <button onClick={load} className="flex items-center gap-2 rounded-xl bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 transition">
          <Search size={15} /> Filtrar
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-100">{editing ? 'Editar Análise' : 'Nova Análise'}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Produtor</label>
                <select required value={form.produtorId} onChange={(e) => setForm((f) => ({ ...f, produtorId: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">Selecione...</option>
                  {produtores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Percentual de Palito (%)</label>
                <input type="number" min="0" max="100" step="0.1" required value={form.percentualPalito}
                  onChange={(e) => setForm((f) => ({ ...f, percentualPalito: e.target.value }))} placeholder="Ex: 8.5"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 px-4 py-3">
                <p className="text-xs text-zinc-500">Desconto calculado automaticamente</p>
                <p className="mt-1 text-lg font-bold text-emerald-400">{previewDesconto}</p>
                <p className="text-[10px] text-zinc-600">≤5%→0% · 6-10%→5% · 11-15%→10% · &gt;15%→15%</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                  {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : editing ? 'Atualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-700/60 shadow-lg">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                {['#', 'Produtor', 'Palito %', 'Desconto', 'Data', ...(canWrite || canDel ? ['Ações'] : [])].map((h) => (
                  <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analises.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-zinc-600">Nenhuma análise encontrada</td></tr>
              ) : analises.map((a) => (
                <tr key={a.id} className="even:bg-zinc-900/40 hover:bg-zinc-800/40 transition">
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{a.id}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm font-medium text-zinc-200">{a.produtor.nome}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{a.percentualPalito}%</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.desconto === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {a.desconto}%
                    </span>
                  </td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</td>
                  {(canWrite || canDel) && (
                    <td className="border-t border-zinc-800 px-4 py-2 text-center">
                      {confirmId === a.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(a.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canWrite && <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-emerald-400 transition"><Pencil size={14} /></button>}
                          {canDel && <button onClick={() => setConfirmId(a.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 transition"><Trash2 size={14} /></button>}
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
