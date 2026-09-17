import { useState, useEffect, type FormEvent } from 'react'
import { Plus, Search, Pencil, Trash2, Copy, FileSpreadsheet, FileText, Upload } from 'lucide-react'
import { api, type Analise, type Lote } from '../services/api'
import { getPerfil, can } from '../lib/permissions'
import Pagination from '../components/Pagination'
import Toast from '../components/Toast'
import ImportarAnalises from '../components/ImportarAnalises'
import {
  Button, Field, Input, Select, Textarea, Modal, PageHeader, Badge,
  LoadingState, EmptyState, Table, Thead, Tr, Td,
} from '../components/ui'

type ToastT = { msg: string; type: 'ok' | 'err' | 'info' | 'warn' }

// RN01 - deve permanecer identico a calcularDesconto() em backend/src/routes/analises.js
const LIMITE_PALITO = 30
const FATOR_DESCONTO = 0.35

function descontoLabel(pct: number): string {
  if (pct <= LIMITE_PALITO) return '0'
  return String(Math.round((pct - LIMITE_PALITO) * FATOR_DESCONTO * 10000) / 10000)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

const TODAY = new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  ticket: '',
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

export default function Analises() {
  const perfil = getPerfil()
  const canWrite = can.write('analises', perfil)
  const canDel = can.delete('analises', perfil)
  const canExport = can.export('analises', perfil)
  const [showImportar, setShowImportar] = useState(false)

  const [analises, setAnalises] = useState<Analise[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Analise | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastT | null>(null)
  const [filters, setFilters] = useState({ nomeProdutor: '', dataInicio: '', dataFim: '' })
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  async function load(pg = page) {
    setLoading(true)
    try {
      const [a, l] = await Promise.all([
        api.analises.list({
          nomeProdutor: filters.nomeProdutor || undefined,
          dataInicio: filters.dataInicio || undefined,
          dataFim: filters.dataFim || undefined,
          page: String(pg),
          limit: '10',
        }),
        api.lotes.listAll(),
      ])
      setAnalises(a.data)
      setTotalPages(a.totalPages)
      setLotes(l.data)
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
    setForm({ ...EMPTY_FORM, dataAnalise: TODAY })
    setErrors({})
    setShowForm(true)
  }

  function openEdit(a: Analise) {
    setEditingItem(a)
    setForm({
      ticket: a.ticket ?? '',
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
    const tkt = form.ticket.trim()
    if (!tkt) errs.ticket = 'Ticket é obrigatório'
    else if (!/^\d+$/.test(tkt)) errs.ticket = 'Ticket deve conter apenas números'
    else if (tkt.length > 20) errs.ticket = 'Ticket deve ter no máximo 20 dígitos'
    const prod = form.nomeProdutor.trim()
    if (prod) {
      if (prod.length < 2) errs.nomeProdutor = 'Produtor deve ter pelo menos 2 caracteres'
      else if (prod.length > 100) errs.nomeProdutor = 'Produtor deve ter no máximo 100 caracteres'
      else if (!/^[a-zA-ZÀ-ú\s.,;'-]+$/.test(prod)) errs.nomeProdutor = 'Produtor deve conter apenas letras, espaços e os sinais . , ; -'
    }
    if (!form.dataAnalise) errs.dataAnalise = 'Data da análise é obrigatória'
    if (!form.percentualPalito) errs.percentualPalito = 'Teor de palito é obrigatório'
    else {
      const pct = parseFloat(form.percentualPalito)
      if (isNaN(pct) || pct < 0 || pct > 100) errs.percentualPalito = 'Valor deve estar entre 0 e 100'
    }
    if (form.teorPo !== '') {
      const tp = parseFloat(form.teorPo)
      if (isNaN(tp) || tp < 0 || tp > 100) errs.teorPo = 'Valor deve estar entre 0 e 100'
    }
    if (form.umidade !== '') {
      const um = parseFloat(form.umidade)
      if (isNaN(um) || um < 0 || um > 100) errs.umidade = 'Valor deve estar entre 0 e 100'
    }
    if (form.observacao.length > 500) errs.observacao = 'Observação deve ter no máximo 500 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      ticket: form.ticket.trim(),
      nomeProdutor: form.nomeProdutor.trim() || null,
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
        setToast({ msg: 'Registro atualizado com sucesso!', type: 'ok' })
      } else {
        await api.analises.create(payload)
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
      await api.analises.delete(id)
      setToast({ msg: 'Registro excluído com sucesso!', type: 'ok' })
      setConfirmId(null)
      setPage(1); load(1)
    } catch (err) {
      setToast({ msg: 'Erro ao excluir. Tente novamente.', type: 'err' })
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

  async function handleExport(tipo: 'excel' | 'pdf') {
    if (analises.length === 0) {
      setToast({ msg: 'Nenhum registro encontrado para exportar.', type: 'warn' })
      return
    }
    setToast({ msg: 'Gerando arquivo, aguarde...', type: 'info' })
    try {
      const f = {
        nomeProdutor: filters.nomeProdutor || undefined,
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined,
      }
      const res = tipo === 'excel'
        ? await api.analises.exportarExcel(f)
        : await api.analises.exportarPdf(f)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = tipo === 'excel' ? 'analises.xlsx' : 'analises.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setToast({ msg: 'Arquivo gerado com sucesso!', type: 'ok' })
    } catch {
      setToast({ msg: 'Erro ao gerar o arquivo. Tente novamente.', type: 'err' })
    }
  }

  return (
    <div>
      <ImportarAnalises
        open={showImportar}
        onClose={() => setShowImportar(false)}
        onImportado={() => { setPage(1); load(1) }}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        title="Análises de Erva-Mate"
        actions={
          <>
            {canExport && (
              <Button variant="outline" className="border-danger/30 bg-danger/10 text-danger hover:bg-danger/20" onClick={() => handleExport('pdf')}>
                <FileText size={15} /> Exportar PDF
              </Button>
            )}
            {canExport && (
              <Button variant="outline" className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20" onClick={() => handleExport('excel')}>
                <FileSpreadsheet size={15} /> Exportar Excel
              </Button>
            )}
            {canWrite && (
              <Button variant="outline" onClick={() => setShowImportar(true)}>
                <Upload size={15} /> Importar Excel
              </Button>
            )}
            {canWrite && (
              <Button onClick={openCreate}>
                <Plus size={16} /> Nova Análise
              </Button>
            )}
          </>
        }
      />

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <Input
          value={filters.nomeProdutor}
          onChange={(e) => setFilters((f) => ({ ...f, nomeProdutor: e.target.value }))}
          placeholder="Buscar por produtor..."
          className="min-w-[180px] flex-1"
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
        title={editingItem ? 'Editar Análise' : 'Nova Análise'}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button form="analise-form" type="submit" loading={saving} className="flex-1">
              {!saving && (editingItem ? 'Atualizar' : 'Registrar')}
            </Button>
          </>
        }
      >
        <form id="analise-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Ticket" required error={errors.ticket}>
            <Input
              value={form.ticket}
              onChange={(e) => setForm((f) => ({ ...f, ticket: e.target.value }))}
              placeholder="Ex: 1234"
            />
          </Field>

          <Field label="Produtor (opcional)" error={errors.nomeProdutor}>
            <Input
              value={form.nomeProdutor}
              onChange={(e) => setForm((f) => ({ ...f, nomeProdutor: e.target.value }))}
              placeholder="Ex: João Silva"
            />
          </Field>

          <Field label="Lote">
            <Select value={form.loteId} onChange={(e) => setForm((f) => ({ ...f, loteId: e.target.value }))}>
              <option value="">Nenhum</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>{l.codigo} — {PRODUTO_LABEL[l.produto] ?? l.produto}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <Field label="Data da Análise" required error={errors.dataAnalise}>
              <Input
                type="date"
                value={form.dataAnalise}
                onChange={(e) => setForm((f) => ({ ...f, dataAnalise: e.target.value }))}
              />
            </Field>
            <Field label="Data de Fabricação">
              <Input
                type="date"
                value={form.dataFabricacao}
                onChange={(e) => setForm((f) => ({ ...f, dataFabricacao: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <Field label="Teor de Palito (Erva-Mate) %" required error={errors.percentualPalito}>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.percentualPalito}
                onChange={(e) => setForm((f) => ({ ...f, percentualPalito: e.target.value }))}
                placeholder="Ex: 8.5"
              />
            </Field>
            <div className="flex flex-col justify-end">
              <div className="rounded-xl border border-border bg-muted/60 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground">Desconto calculado</p>
                <p className="mt-0.5 font-mono text-lg font-bold text-primary">{previewDesconto}</p>
                <p className="text-[9px] text-muted-foreground">Palito até 0,3%: sem desconto. Acima de 0,3%: desconto = (palito − 0,3) × 35%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <Field label="Teor de Pó %" error={errors.teorPo}>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.teorPo}
                onChange={(e) => setForm((f) => ({ ...f, teorPo: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
            <Field label="Umidade %" error={errors.umidade}>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.umidade}
                onChange={(e) => setForm((f) => ({ ...f, umidade: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
          </div>

          <Field label="Observação" error={errors.observacao}>
            <Textarea
              rows={2}
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              placeholder="Observações opcionais..."
            />
          </Field>
        </form>
      </Modal>

      {/* Tabela */}
      {loading ? (
        <LoadingState />
      ) : analises.length === 0 ? (
        <EmptyState message="Nenhuma análise encontrada" />
      ) : (
        <div>
          <Table minWidth="min-w-[820px]">
            <Thead headers={['Ticket', 'Produtor', 'Lote', 'Palito % (Erva)', 'Teor Pó %', 'Umidade %', 'Desconto', 'Data', ...(showActions ? ['Ações'] : [])]} />
            <tbody>
              {analises.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-mono text-primary">
                    {a.ticket ?? <span className="text-muted-foreground/60">—</span>}
                  </Td>
                  <Td className="font-medium">{a.nomeProdutor}</Td>
                  <Td className="font-mono text-muted-foreground">
                    {a.lote ? a.lote.codigo : <span className="text-muted-foreground/60">—</span>}
                  </Td>
                  <Td className="font-mono tabular-nums">{a.percentualPalito}%</Td>
                  <Td className="font-mono tabular-nums">{a.teorPo != null ? `${a.teorPo}%` : <span className="text-muted-foreground/60">—</span>}</Td>
                  <Td className="font-mono tabular-nums">{a.umidade != null ? `${a.umidade}%` : <span className="text-muted-foreground/60">—</span>}</Td>
                  <Td>
                    <Badge tone={a.desconto === 0 ? 'success' : 'warning'} className="font-mono">{a.desconto}%</Badge>
                  </Td>
                  <Td className="font-mono text-xs text-muted-foreground">{formatDate(a.dataAnalise)}</Td>
                  {showActions && (
                    <Td>
                      {confirmId === a.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(a.id)} className="text-xs font-semibold text-danger hover:brightness-110">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canExport && (
                            <button onClick={() => handleCopy(a)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-info" title="Copiar">
                              <Copy size={14} />
                            </button>
                          )}
                          {canWrite && (
                            <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary" title="Editar">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDel && (
                            <button onClick={() => setConfirmId(a.id)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-danger" title="Excluir">
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
