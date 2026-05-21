import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react'
import { api, type Produtor } from '../services/api'
import { getPerfil, can } from '../lib/permissions'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {msg}<button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

const EMPTY = { nome: '', cidade: '', telefone: '' }

export default function Produtores() {
  const perfil = getPerfil()
  const canWrite = can.write('produtores', perfil)
  const canDel = can.delete('produtores', perfil)

  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Produtor | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [form, setForm] = useState(EMPTY)

  async function load() {
    try {
      setProdutores(await api.produtores.list())
    } catch { setToast({ msg: 'Erro ao carregar', type: 'err' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(p: Produtor) {
    setEditing(p)
    setForm({ nome: p.nome, cidade: p.cidade, telefone: p.telefone })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.produtores.update(editing.id, form)
        setToast({ msg: 'Produtor atualizado!', type: 'ok' })
      } else {
        await api.produtores.create(form)
        setToast({ msg: 'Produtor cadastrado!', type: 'ok' })
      }
      setShowForm(false); load()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro', type: 'err' })
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    try {
      await api.produtores.delete(id)
      setToast({ msg: 'Produtor excluído!', type: 'ok' })
      setConfirmId(null); load()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro ao excluir', type: 'err' })
      setConfirmId(null)
    }
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-zinc-100">Produtores</h1>
        {canWrite && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg">
            <Plus size={16} /> Novo Produtor
          </button>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-100">{editing ? 'Editar Produtor' : 'Novo Produtor'}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(['nome', 'cidade', 'telefone'] as const).map((f) => (
                <div key={f}>
                  <label className="mb-1 block text-xs font-medium capitalize text-zinc-400">{f}</label>
                  <input value={form[f]} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} required
                    placeholder={f === 'nome' ? 'Ex: Sítio Boa Esperança' : f === 'cidade' ? 'Ex: Guarapuava' : '(42) 99999-0000'}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                  {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : editing ? 'Atualizar' : 'Salvar'}
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
          <table className="w-full min-w-[540px]">
            <thead>
              <tr>
                {['#', 'Nome', 'Cidade', 'Telefone', 'Cadastro', ...(canWrite || canDel ? ['Ações'] : [])].map((h) => (
                  <th key={h} className="bg-emerald-900/90 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produtores.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-zinc-600">Nenhum produtor cadastrado</td></tr>
              ) : produtores.map((p) => (
                <tr key={p.id} className="even:bg-zinc-900/40 hover:bg-zinc-800/40 transition">
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{p.id}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm font-medium text-zinc-200">{p.nome}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{p.cidade}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300">{p.telefone}</td>
                  <td className="border-t border-zinc-800 px-4 py-2.5 text-center text-xs text-zinc-500">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  {(canWrite || canDel) && (
                    <td className="border-t border-zinc-800 px-4 py-2 text-center">
                      {confirmId === p.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(p.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canWrite && (
                            <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-emerald-400 transition" title="Editar">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDel && (
                            <button onClick={() => setConfirmId(p.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 transition" title="Excluir">
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
