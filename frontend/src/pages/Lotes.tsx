import { useState, useEffect, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, FileSpreadsheet } from 'lucide-react'
import { api, type Lote } from '../services/api'
import { getPerfil, can } from '../lib/permissions'
import Pagination from '../components/Pagination'
import Toast from '../components/Toast'
import { baixarArquivo } from '../lib/exportar'
import {
  Button, Field, Input, Textarea, Modal, PageHeader,
  LoadingState, EmptyState, Table, Thead, Tr, Td,
} from '../components/ui'

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
  const canExport = can.export('lotes', perfil)
  const [exporting, setExporting] = useState(false)

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


  async function handleExportar() {
    if (lotes.length === 0) {
      setToast({ msg: 'Nenhum registro encontrado para exportar.', type: 'warn' })
      return
    }
    setToast({ msg: 'Gerando a planilha, aguarde...', type: 'info' })
    setExporting(true)
    try {
      await baixarArquivo(await api.lotes.exportar(), 'lotes-scq.xlsx')
      setToast({ msg: 'Planilha gerada com sucesso!', type: 'ok' })
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Erro ao gerar a planilha.', type: 'err' })
    } finally {
      setExporting(false)
    }
  }

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
    const cod = form.codigo.trim()
    if (!cod) errs.codigo = 'Código é obrigatório'
    else if (cod.length < 2) errs.codigo = 'Código deve ter pelo menos 2 caracteres'
    else if (cod.length > 20) errs.codigo = 'Código deve ter no máximo 20 caracteres'
    else if (!/^[a-zA-Z0-9]+$/.test(cod)) errs.codigo = 'Código deve conter apenas letras e números'
    if (!form.dataInicio) errs.dataInicio = 'Data de início é obrigatória'
    if (!form.dataFim) errs.dataFim = 'Data de fim é obrigatória'
    if (form.observacao.length > 500) errs.observacao = 'Observação deve ter no máximo 500 caracteres'
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

  const showActions = canWrite || canDel

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        title="Lotes de Produção"
        actions={
          <>
          {canExport && (
            <Button variant="outline" onClick={handleExportar} loading={exporting}>
              {!exporting && <FileSpreadsheet size={15} />} Exportar Excel
            </Button>
          )}
          {canWrite && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Novo Lote
            </Button>
          )}
          </>
        }
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingItem ? 'Editar Lote' : 'Novo Lote'}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button form="lote-form" type="submit" loading={saving} className="flex-1">
              {!saving && (editingItem ? 'Atualizar' : 'Salvar')}
            </Button>
          </>
        }
      >
        <form id="lote-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Código" required error={errors.codigo}>
            <Input
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              placeholder="Ex: L2026001"
            />
          </Field>

          <Field label="Produto">
            <Input value="Erva-Mate Cancheada" disabled />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de Início" required error={errors.dataInicio}>
              <Input
                type="date"
                value={form.dataInicio}
                onChange={(e) => handleDataInicioChange(e.target.value)}
              />
            </Field>
            <Field label="Data de Fim" required error={errors.dataFim}>
              <Input
                type="date"
                value={form.dataFim}
                onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Observação" error={errors.observacao}>
            <Textarea
              rows={3}
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              placeholder="Observações opcionais..."
            />
          </Field>
        </form>
      </Modal>

      {loading ? (
        <LoadingState />
      ) : lotes.length === 0 ? (
        <EmptyState message="Nenhum lote cadastrado" />
      ) : (
        <div>
          <Table minWidth="min-w-[640px]">
            <Thead headers={['#', 'Código', 'Produto', 'Período', 'Observação', 'Cadastro', ...(showActions ? ['Ações'] : [])]} />
            <tbody>
              {lotes.map((l) => (
                <Tr key={l.id}>
                  <Td className="font-mono text-xs text-muted-foreground">{l.id}</Td>
                  <Td className="font-mono font-medium">{l.codigo}</Td>
                  <Td>{l.produto}</Td>
                  <Td className="font-mono">{formatPeriodo(l.dataInicio, l.dataFim)}</Td>
                  <Td className="text-muted-foreground">
                    {l.observacao ?? <span className="text-muted-foreground/60">—</span>}
                  </Td>
                  <Td className="font-mono text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleDateString('pt-BR')}</Td>
                  {showActions && (
                    <Td>
                      {confirmId === l.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(l.id)} className="text-xs font-semibold text-danger hover:brightness-110">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canWrite && (
                            <button onClick={() => openEdit(l)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary" title="Editar">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDel && (
                            <button onClick={() => setConfirmId(l.id)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-danger" title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </span>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  )
}
