import { useState, useEffect, type FormEvent } from 'react'
import { Plus, Search, FileSpreadsheet, Pencil, Trash2, Copy } from 'lucide-react'
import { api, type ColetaAmostra } from '../services/api'
import { getPerfil, can } from '../lib/permissions'
import Pagination from '../components/Pagination'
import Toast from '../components/Toast'
import {
  Button, Field, Input, Modal, PageHeader,
  LoadingState, EmptyState, Table, Thead, Tr, Td,
} from '../components/ui'

type ToastT = { msg: string; type: 'ok' | 'err' | 'info' | 'warn' }

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

const TODAY = new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  dataColeta: TODAY,
  destino: '',
}

type FormState = typeof EMPTY_FORM
type FormErrors = Partial<Record<keyof FormState, string>>

export default function Coletas() {
  const perfil = getPerfil()
  const canWrite = can.write('coletas', perfil)
  const canDel = can.delete('coletas', perfil)
  const canExport = can.export('coletas', perfil)

  const [coletas, setColetas] = useState<ColetaAmostra[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<ColetaAmostra | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastT | null>(null)
  const [filters, setFilters] = useState({ destino: '', dataInicio: '', dataFim: '' })
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  async function load(pg = page) {
    setLoading(true)
    try {
      const res = await api.coletas.list({
        destino: filters.destino || undefined,
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined,
        page: String(pg),
        limit: '10',
      })
      setColetas(res.data)
      setTotalPages(res.totalPages)
    } catch {
      setToast({ msg: 'Erro ao carregar dados', type: 'err' })
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
    setForm({ ...EMPTY_FORM, dataColeta: TODAY })
    setErrors({})
    setShowForm(true)
  }

  function openEdit(c: ColetaAmostra) {
    setEditingItem(c)
    setForm({
      dataColeta: c.dataColeta.split('T')[0],
      destino: c.destino,
    })
    setErrors({})
    setShowForm(true)
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.dataColeta) errs.dataColeta = 'Data da coleta é obrigatória'
    const dest = form.destino.trim()
    if (!dest) errs.destino = 'Destino é obrigatório'
    else if (dest.length < 3) errs.destino = 'Destino deve ter pelo menos 3 caracteres'
    else if (dest.length > 100) errs.destino = 'Destino deve ter no máximo 100 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      dataColeta: form.dataColeta,
      destino: form.destino.trim(),
    }
    try {
      if (editingItem) {
        await api.coletas.update(editingItem.id, payload)
        setToast({ msg: 'Registro atualizado com sucesso!', type: 'ok' })
      } else {
        await api.coletas.create(payload)
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
      await api.coletas.delete(id)
      setToast({ msg: 'Registro excluído com sucesso!', type: 'ok' })
      setConfirmId(null)
      setPage(1); load(1)
    } catch (err) {
      setToast({ msg: 'Erro ao excluir. Tente novamente.', type: 'err' })
      setConfirmId(null)
    }
  }

  async function handleExportar() {
    if (coletas.length === 0) {
      setToast({ msg: 'Nenhum registro encontrado para exportar.', type: 'warn' })
      return
    }
    setToast({ msg: 'Gerando arquivo, aguarde...', type: 'info' })
    setExporting(true)
    try {
      const res = await api.coletas.exportar()
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'coletas-scq.xlsx'
      a.click()
      URL.revokeObjectURL(url)
      setToast({ msg: 'Arquivo gerado com sucesso!', type: 'ok' })
    } catch {
      setToast({ msg: 'Erro ao gerar o arquivo. Tente novamente.', type: 'err' })
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

      <PageHeader
        title="Coletas de Amostra"
        actions={
          <>
            {canExport && (
              <Button variant="outline" onClick={handleExportar} loading={exporting}>
                {!exporting && <FileSpreadsheet size={15} />} Exportar Excel
              </Button>
            )}
            {canWrite && (
              <Button onClick={openCreate}>
                <Plus size={16} /> Nova Coleta
              </Button>
            )}
          </>
        }
      />

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <Input
          value={filters.destino}
          onChange={(e) => setFilters((f) => ({ ...f, destino: e.target.value }))}
          placeholder="Destino"
          className="min-w-[140px] flex-1"
        />
        <Input
          type="date"
          value={filters.dataInicio}
          onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
          className="flex-1 min-w-[120px]"
        />
        <Input
          type="date"
          value={filters.dataFim}
          onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
          className="flex-1 min-w-[120px]"
        />
        <Button variant="secondary" onClick={() => { setPage(1); load(1) }}>
          <Search size={15} /> Filtrar
        </Button>
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingItem ? 'Editar Coleta' : 'Nova Coleta de Amostra'}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button form="coleta-form" type="submit" loading={saving} className="flex-1">
              {!saving && (editingItem ? 'Atualizar' : 'Registrar')}
            </Button>
          </>
        }
      >
        <form id="coleta-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Data da Coleta" required error={errors.dataColeta}>
            <Input
              type="date"
              max={TODAY}
              value={form.dataColeta}
              onChange={(e) => setForm((f) => ({ ...f, dataColeta: e.target.value }))}
            />
          </Field>

          <Field label="Tipo de Produto">
            <Input value="Erva-Mate Cancheada" disabled />
          </Field>

          <Field label="Destino da Amostra" required error={errors.destino}>
            <Input
              value={form.destino}
              onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
              placeholder="Ex: Laboratório Interno"
            />
          </Field>
        </form>
      </Modal>

      {loading ? (
        <LoadingState />
      ) : coletas.length === 0 ? (
        <EmptyState message="Nenhuma coleta encontrada" />
      ) : (
        <div>
          <Table minWidth="min-w-[640px]">
            <Thead headers={['#', 'Tipo Produto', 'Destino', 'Data Coleta', 'Cadastro', ...(showActions ? ['Ações'] : [])]} />
            <tbody>
              {coletas.map((c) => (
                <Tr key={c.id}>
                  <Td className="text-xs text-muted-foreground">{c.id}</Td>
                  <Td className="font-medium">{c.tipoProduto}</Td>
                  <Td>{c.destino}</Td>
                  <Td>{formatDate(c.dataColeta)}</Td>
                  <Td className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</Td>
                  {showActions && (
                    <Td>
                      {confirmId === c.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(c.id)} className="text-xs font-semibold text-danger hover:brightness-110">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canExport && (
                            <button onClick={() => handleCopy(c)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-info" title="Copiar">
                              <Copy size={14} />
                            </button>
                          )}
                          {canWrite && (
                            <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary" title="Editar">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDel && (
                            <button onClick={() => setConfirmId(c.id)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-danger" title="Excluir">
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
