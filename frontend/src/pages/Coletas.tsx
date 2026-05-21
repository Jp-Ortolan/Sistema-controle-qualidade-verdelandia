import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X, Loader2, Search, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react'
import { api, type ColetaAmostra, type Produtor } from '../services/api'
import { getPerfil, can } from '../lib/permissions'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

const EMPTY_FORM = { produtorId: '', tipoProduto: '', destino: '', dataColeta: '' }

export default function Coletas() {
  const perfil = getPerfil()
  const canWrite = can.write('coletas', perfil)
  const canDel = can.delete('coletas', perfil)

  const [coletas, setColetas] = useState<ColetaAmostra[]>([])
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ColetaAmostra | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filters, setFilters] = useState({ tipoProduto: '', destino: '', dataInicio: '', dataFim: '' })
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([
        api.coletas.list({ tipoProduto: filters.tipoProduto || undefined, destino: filters.destino || undefined, dataInicio: filters.dataInicio || undefined, dataFim: filters.dataFim || undefined }),
        api.produtores.list(),
      ])
      setColetas(c); setProdutores(p)
    } catch { setToast({ msg: 'Erro ao carregar dados', type: 'err' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(c: ColetaAmostra) {
    setEditing(c)
    setForm({
      produtorId: String(c.produtorId),
      tipoProduto: c.tipoProduto,
      destino: c.destino,
      dataColeta: c.dataColeta.split('T')[0],
    })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setSaving(true)
    const payload = { produtorId: parseInt(form.produtorId), tipoProduto: form.tipoProduto, destino: form.destino, dataColeta: form.dataColeta }
    try {
      if (editing) { await api.coletas.update(editing.id, payload); setToast({ msg: 'Coleta atualizada!', type: 'ok' }) }
      else { await api.coletas.create(payload); setToast({ msg: 'Coleta registrada!', type: 'ok' }) }
      setShowForm(false); load()
    } catch (err) { setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' }) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    try { await api.coletas.delete(id); setToast({ msg: 'Coleta excluída!', type: 'ok' }); setConfirmId(null); load() }
    catch (err) { setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' }); setConfirmId(null) }
  }

  async function handleExportar() {
    setExporting(true)
    try {
      const res = await api.coletas.exportar()
      if (!res.ok) throw new Error('Erro ao exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'coletas-scq.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch { setToast({ msg: 'Erro ao exportar Excel', type: 'err' }) }
    finally { setExporting(false) }
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Coletas de Amostra</h1>
        <div className="flex gap-3">
          {canWrite && (
            <button onClick={handleExportar} disabled={exporting}
              className="flex items-center gap-2 rounded-xl border border-emerald-700/50 bg-emerald-700/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-700/20 disabled:opacity-50 transition">
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
              Exportar Excel
            </button>
          )}
          {canWrite && (
            <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg">
              <Plus size={16} /> Nova Coleta
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <input value={filters.tipoProduto} onChange={(e) => setFilters((f) => ({ ...f, tipoProduto: e.target.value }))} placeholder="Tipo de produto"
          className="flex-1 min-w-[140px] rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500" />
        <input value={filters.destino} onChange={(e) => setFilters((f) => ({ ...f, destino: e.target.value }))} placeholder="Destino"
          className="flex-1 min-w-[120px] rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500" />
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
              <h2 className="text-base font-bold text-zinc-100">{editing ? 'Editar Coleta' : 'Nova Coleta de Amostra'}</h2>
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
                <label className="mb-1 block text-xs font-medium text-zinc-400">Tipo de Produto</label>
                <input required value={form.tipoProduto} onChange={(e) => setForm((f) => ({ ...f, tipoProduto: e.target.value }))} placeholder="Ex: Erva-mate verde"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Destino</label>
                <input required value={form.destino} onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))} placeholder="Ex: Laboratório Interno"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Data da Coleta</label>
                <input type="date" required value={form.dataColeta} onChange={(e) => setForm((f) => ({ ...f, dataColeta: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
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
          <table className="w-full min-w-[680px]">
            <thead>
              <tr>
                {['#', 'Produtor', 'Tipo Produto', 'Destino', 'Data Coleta', 'Cadastro', ...(canWrite || canDel ? ['Ações'] : [])].map((h) => (
                  <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coletas.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-zinc-600">Nenhuma coleta encontrada</td></tr>
              ) : coletas.map((c) => (
                <tr key={c.id} className="even:bg-zinc-900/40 hover:bg-zinc-800/40 transition">
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{c.id}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm font-medium text-zinc-200">{c.produtor.nome}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{c.tipoProduto}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{c.destino}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{new Date(c.dataColeta).toLocaleDateString('pt-BR')}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                  {(canWrite || canDel) && (
                    <td className="border-t border-zinc-800 px-4 py-2 text-center">
                      {confirmId === c.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(c.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canWrite && <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-emerald-400 transition"><Pencil size={14} /></button>}
                          {canDel && <button onClick={() => setConfirmId(c.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 transition"><Trash2 size={14} /></button>}
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
