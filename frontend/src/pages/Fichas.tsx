import { useState, useEffect, type FormEvent } from 'react'
import { Plus, Search, FileDown, Pencil, Trash2 } from 'lucide-react'
import { api, type FichaEmbalagem, type Parametro } from '../services/api'
import { getPerfil, can } from '../lib/permissions'
import Pagination from '../components/Pagination'
import Toast from '../components/Toast'
import {
  Button, Field, Input, Select, Textarea, Modal, PageHeader, Badge,
  LoadingState, EmptyState, Table, Thead, Tr, Td,
} from '../components/ui'

type ToastT = { msg: string; type: 'ok' | 'err' | 'info' | 'warn' }

const PARAM_NAMES = ['Densidade', 'Dimensões', 'Visual / Impressões', 'Código de Barras']

const EMPTY_PARAMS: Parametro[] = [
  { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true },
  { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true },
  { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true },
  { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true },
]

export default function Fichas() {
  const perfil = getPerfil()
  const canWrite = can.write('fichas', perfil)
  const canDel = can.delete('fichas', perfil)
  const canExport = can.export('fichas', perfil)

  const [data, setData] = useState<{ fichas: FichaEmbalagem[]; total: number }>({ fichas: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<FichaEmbalagem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastT | null>(null)
  const [filters, setFilters] = useState({ status: '', dataInicio: '', dataFim: '' })
  const [pagina, setPagina] = useState(1)
  const [fornecedor, setFornecedor] = useState('')
  const [parametros, setParametros] = useState<Parametro[]>(EMPTY_PARAMS.map((p) => ({ ...p })))
  const [observacoes, setObservacoes] = useState('')
  const [fornecedorError, setFornecedorError] = useState('')
  const [observacoesError, setObservacoesError] = useState('')
  const limite = 10

  async function load(pg = pagina) {
    setLoading(true)
    try {
      const res = await api.fichas.list({
        status: filters.status || undefined,
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined,
        pagina: String(pg),
        limite: String(limite),
      })
      setData(res)
    } catch {
      setToast({ msg: 'Erro ao carregar fichas', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [pagina])

  function resetForm() {
    setFornecedor('')
    setParametros(EMPTY_PARAMS.map((p) => ({ ...p })))
    setObservacoes('')
    setFornecedorError('')
    setObservacoesError('')
  }

  function openCreate() {
    setEditingItem(null)
    resetForm()
    setShowForm(true)
  }

  function openEdit(f: FichaEmbalagem) {
    setEditingItem(f)
    setFornecedor(f.fornecedor)
    const parsed = JSON.parse(f.parametros) as Parametro[]
    const padded: Parametro[] = Array.from({ length: 4 }, (_, i) =>
      parsed[i] ?? { resultado: '', unidade: '', padrao: '', unidadePadrao: '', conforme: true }
    )
    padded[2] = { ...padded[2], unidade: '', unidadePadrao: '' }
    padded[3] = { ...padded[3], unidade: '', unidadePadrao: '' }
    setParametros(padded)
    setObservacoes(f.observacoes ?? '')
    setFornecedorError('')
    setObservacoesError('')
    setShowForm(true)
  }

  function updateParam(i: number, field: keyof Parametro, value: string | boolean) {
    setParametros((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  const statusGlobal = parametros.every((p) => p.conforme) ? 'CONFORME' : 'NAO_CONFORME'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const forn = fornecedor.trim()
    if (!forn) { setFornecedorError('Fornecedor é obrigatório'); return }
    if (forn.length < 3) { setFornecedorError('Fornecedor deve ter pelo menos 3 caracteres'); return }
    if (forn.length > 100) { setFornecedorError('Fornecedor deve ter no máximo 100 caracteres'); return }
    setFornecedorError('')
    if (observacoes.length > 500) { setObservacoesError('Observação deve ter no máximo 500 caracteres'); return }
    setObservacoesError('')
    setSaving(true)
    const payload = {
      fornecedor: fornecedor.trim(),
      parametros,
      observacoes: observacoes.trim() || null,
      statusGlobal,
    }
    try {
      if (editingItem) {
        await api.fichas.update(editingItem.id, payload)
        setToast({ msg: 'Registro atualizado com sucesso!', type: 'ok' })
      } else {
        await api.fichas.create(payload)
        setToast({ msg: 'Registro salvo com sucesso!', type: 'ok' })
      }
      setShowForm(false)
      load(1)
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.', type: 'err' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.fichas.delete(id)
      setToast({ msg: 'Registro excluído com sucesso!', type: 'ok' })
      setConfirmId(null)
      load(1)
    } catch (err) {
      setToast({ msg: 'Erro ao excluir. Tente novamente.', type: 'err' })
      setConfirmId(null)
    }
  }

  async function handleDownloadPdf(id: number) {
    setDownloadingId(id)
    setToast({ msg: 'Gerando PDF, aguarde...', type: 'info' })
    try {
      const res = await api.fichas.downloadPdf(id)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `FORQSE001-${String(id).padStart(4, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setToast({ msg: 'Arquivo gerado com sucesso!', type: 'ok' })
    } catch {
      setToast({ msg: 'Erro ao gerar o arquivo. Tente novamente.', type: 'err' })
    } finally {
      setDownloadingId(null)
    }
  }

  const totalPaginas = Math.ceil(data.total / limite)
  const showActions = canWrite || canDel

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        title="Fichas de Embalagem"
        actions={canWrite && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Nova Ficha
          </Button>
        )}
      />

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <Select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="w-auto"
        >
          <option value="">Todos os status</option>
          <option value="CONFORME">Conforme</option>
          <option value="NAO_CONFORME">Não Conforme</option>
        </Select>
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
        <Button variant="secondary" onClick={() => { setPagina(1); load(1) }}>
          <Search size={15} /> Filtrar
        </Button>
      </div>

      {/* Modal FORQSE001 */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={`FORQSE001 — ${editingItem ? 'Editar' : 'Nova'} Ficha de Embalagem`}
        description="Status global calculado automaticamente pelos parâmetros"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button form="ficha-form" type="submit" loading={saving} className="flex-1">
              {!saving && (editingItem ? 'Atualizar' : 'Salvar Ficha')}
            </Button>
          </>
        }
      >
        <form id="ficha-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Fornecedor" required error={fornecedorError}>
            <Input
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Nome do fornecedor"
            />
          </Field>

          {/* Parameters table */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Parâmetros</label>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-36">Parâmetro</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Resultado</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-16">UN</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Padrão</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-16">UN</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-36">Conformidade</th>
                  </tr>
                </thead>
                <tbody>
                  {PARAM_NAMES.map((name, i) => (
                    <tr key={i} className="border-t border-border even:bg-muted/20">
                      <td className="px-3 py-2">
                        <span className="text-xs font-medium text-foreground">{name}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={parametros[i].resultado}
                          onChange={(e) => updateParam(i, 'resultado', e.target.value)}
                          placeholder="Valor obtido"
                          className="px-2.5 py-1.5 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={i === 2 || i === 3 ? '' : parametros[i].unidade}
                          onChange={(e) => updateParam(i, 'unidade', e.target.value)}
                          placeholder="UN"
                          disabled={i === 2 || i === 3}
                          className="px-2 py-1.5 text-xs text-center"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={parametros[i].padrao}
                          onChange={(e) => updateParam(i, 'padrao', e.target.value)}
                          placeholder="Padrão"
                          className="px-2.5 py-1.5 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={i === 2 || i === 3 ? '' : parametros[i].unidadePadrao}
                          onChange={(e) => updateParam(i, 'unidadePadrao', e.target.value)}
                          placeholder="UN"
                          disabled={i === 2 || i === 3}
                          className="px-2 py-1.5 text-xs text-center"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateParam(i, 'conforme', true)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${parametros[i].conforme ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground hover:brightness-95'}`}
                          >
                            Conforme
                          </button>
                          <button
                            type="button"
                            onClick={() => updateParam(i, 'conforme', false)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${!parametros[i].conforme ? 'bg-danger text-danger-foreground' : 'bg-muted text-muted-foreground hover:brightness-95'}`}
                          >
                            N. Conf.
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Field label="Observações" error={observacoesError}>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações opcionais..."
            />
          </Field>

          {/* Status global */}
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${statusGlobal === 'CONFORME' ? 'border-success/40 bg-success/10 text-success' : 'border-danger/40 bg-danger/10 text-danger'}`}>
            Status Global: {statusGlobal === 'CONFORME' ? '✓ CONFORME' : '✗ NÃO CONFORME'}
          </div>
        </form>
      </Modal>

      {/* Tabela */}
      {loading ? (
        <LoadingState />
      ) : data.fichas.length === 0 ? (
        <EmptyState message="Nenhuma ficha encontrada" />
      ) : (
        <>
          <Table minWidth="min-w-[560px]">
            <Thead headers={['#', 'Fornecedor', 'Status', 'Data', ...(canExport ? ['PDF'] : []), ...(showActions ? ['Ações'] : [])]} />
            <tbody>
              {data.fichas.map((f) => (
                <Tr key={f.id}>
                  <Td className="font-mono text-xs text-muted-foreground">{f.id}</Td>
                  <Td>{f.fornecedor}</Td>
                  <Td>
                    <Badge tone={f.statusGlobal === 'CONFORME' ? 'success' : 'danger'}>
                      {f.statusGlobal === 'CONFORME' ? 'Conforme' : 'Não Conforme'}
                    </Badge>
                  </Td>
                  <Td className="font-mono text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleDateString('pt-BR')}</Td>
                  {canExport && (
                    <Td>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                        onClick={() => handleDownloadPdf(f.id)}
                        loading={downloadingId === f.id}
                      >
                        {downloadingId !== f.id && <FileDown size={13} />} PDF
                      </Button>
                    </Td>
                  )}
                  {showActions && (
                    <Td>
                      {confirmId === f.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(f.id)} className="text-xs font-semibold text-danger hover:brightness-110">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {canWrite && (
                            <button onClick={() => openEdit(f)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary" title="Editar">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDel && (
                            <button onClick={() => setConfirmId(f.id)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-danger" title="Excluir">
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

          <Pagination
            page={pagina}
            totalPages={totalPaginas}
            onPageChange={(p) => { setPagina(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        </>
      )}
    </div>
  )
}
