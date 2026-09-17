import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import { api, type ImportacaoResultado } from '../services/api'
import { baixarArquivo } from '../lib/exportar'
import Toast from './Toast'
import { Button, Modal, Badge, Table, Thead, Tr, Td } from './ui'

type ToastT = { msg: string; type: 'ok' | 'err' | 'info' | 'warn' }

interface Props {
  open: boolean
  onClose: () => void
  onImportado: () => void
}

function dataBR(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export default function ImportarAnalises({ open, onClose, onImportado }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<ImportacaoResultado | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState<ToastT | null>(null)

  function limpar() {
    setArquivo(null); setPrevia(null); setErro('')
    setCarregando(false); setGravando(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function fechar() { limpar(); onClose() }

  async function escolher(f: File | null) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setErro('O arquivo precisa ser uma planilha .xlsx.')
      return
    }
    setArquivo(f); setPrevia(null); setErro(''); setCarregando(true)
    try {
      setPrevia(await api.analises.importar(f, false))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a planilha.')
      setArquivo(null)
    } finally {
      setCarregando(false)
    }
  }

  async function confirmar() {
    if (!arquivo) return
    setGravando(true)
    try {
      const r = await api.analises.importar(arquivo, true)
      setToast({ msg: `${r.inseridas} análise(s) importada(s) com sucesso!`, type: 'ok' })
      onImportado()
      limpar(); onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar a planilha.')
    } finally {
      setGravando(false)
    }
  }

  async function baixarModelo() {
    try {
      await baixarArquivo(await api.analises.modeloImportacao(), 'modelo-importacao-analises.xlsx')
    } catch {
      setToast({ msg: 'Erro ao baixar o modelo.', type: 'err' })
    }
  }

  const podeGravar = previa !== null && previa.aInserir > 0

  return (
    <>
      <Modal
        open={open}
        onClose={fechar}
        title="Importar análises de planilha"
        description="A planilha é conferida antes de gravar. Nada entra no sistema sem você confirmar."
        maxWidth="max-w-4xl"
        footer={
          <>
            <Button variant="outline" onClick={fechar} className="flex-1">
              {previa ? 'Cancelar' : 'Fechar'}
            </Button>
            <Button onClick={confirmar} loading={gravando} disabled={!podeGravar} className="flex-1">
              {podeGravar ? `Importar ${previa.aInserir} análise(s)` : 'Importar'}
            </Button>
          </>
        }
      >
        {erro && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {erro}
          </div>
        )}

        {/* ── Escolha do arquivo ── */}
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-6 text-center">
          <FileSpreadsheet size={26} className="mx-auto mb-2 text-muted-foreground/70" />
          {arquivo ? (
            <p className="text-sm font-medium text-foreground">{arquivo.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione a planilha de análises (.xlsx)</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={carregando}>
              {!carregando && <Upload size={14} />} {arquivo ? 'Trocar arquivo' : 'Escolher arquivo'}
            </Button>
            <Button variant="ghost" size="sm" onClick={baixarModelo}>
              <Download size={14} /> Baixar modelo
            </Button>
          </div>
        </div>

        {/* ── Prévia ── */}
        {previa && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['A importar', previa.aInserir, 'text-primary'],
                ['Já no sistema', previa.jaNoBanco, 'text-muted-foreground'],
                ['Com problema', previa.comProblema, previa.comProblema ? 'text-warning' : 'text-muted-foreground'],
                ['Sem análise ("x")', previa.semAnalise, 'text-muted-foreground'],
              ].map(([rotulo, valor, cor]) => (
                <div key={rotulo as string} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className={`font-mono text-xl font-bold ${cor}`}>{valor as number}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo as string}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border px-4 py-3 text-xs text-muted-foreground">
              <p>
                Aba <strong className="text-foreground">{previa.aba}</strong>
                {' · '}teor de palito lido {previa.unidadePalito === 'fracao'
                  ? <>como <strong className="text-foreground">fração</strong> (0,24 = 24%)</>
                  : <>em <strong className="text-foreground">pontos percentuais</strong> (24 = 24%)</>}
                {!previa.cabecalhoDetectado && ' · cabeçalho não reconhecido, usando o layout da planilha de palitos'}
              </p>
              {previa.periodo && (
                <p className="mt-1">
                  Período de {dataBR(previa.periodo.de)} a {dataBR(previa.periodo.ate)}
                  {' · '}{previa.comLote} com lote, {previa.semLote} sem lote
                  {' · '}{previa.comDesconto} com desconto
                </p>
              )}
            </div>

            {previa.avisos.length > 0 && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <AlertTriangle size={14} /> Confira antes de importar
                </p>
                {previa.avisos.map((a) => (
                  <p key={a.linha} className="text-xs text-warning">
                    Linha {a.linha}: ticket {a.ticket} está muito fora da sequência
                    {' '}(vizinhos {a.vizinhos[0]} e {a.vizinhos[1]}). Será importado assim mesmo.
                  </p>
                ))}
              </div>
            )}

            {previa.problemas.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">
                  Linhas que não serão importadas
                </p>
                <div className="max-h-56 overflow-y-auto">
                  <Table minWidth="min-w-[480px]">
                    <Thead headers={['Linha', 'Ticket', 'Motivo']} />
                    <tbody>
                      {previa.problemas.map((p) => (
                        <Tr key={`${p.linha}-${p.ticket}`}>
                          <Td>{p.linha}</Td>
                          <Td>{p.ticket ?? '—'}</Td>
                          <Td align="left" className="text-xs">{p.erros.join('; ')}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {previa.problemasOcultos > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    e mais {previa.problemasOcultos} linha(s) com problema não listadas aqui.
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Corrija essas linhas na planilha e importe de novo — o sistema pula o que já foi importado,
                  então nada é duplicado.
                </p>
              </div>
            )}

            {previa.amostra.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">
                  Prévia das primeiras linhas
                </p>
                <Table minWidth="min-w-[560px]">
                  <Thead headers={['Ticket', 'Data', 'Palito', 'Desconto', 'Lote', 'Produtor']} />
                  <tbody>
                    {previa.amostra.map((a) => (
                      <Tr key={a.ticket}>
                        <Td className="font-mono text-xs">{a.ticket}</Td>
                        <Td>{dataBR(a.data)}</Td>
                        <Td className="font-mono tabular-nums">{a.percentualPalito}%</Td>
                        <Td>
                          {a.desconto > 0
                            ? <Badge tone="warning">{a.desconto}%</Badge>
                            : <span className="text-muted-foreground">—</span>}
                        </Td>
                        <Td>{a.lote ?? <span className="text-muted-foreground">—</span>}</Td>
                        <Td align="left">{a.nomeProdutor || <span className="text-muted-foreground">—</span>}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-success" />
                  O desconto é calculado pelo sistema a partir do teor de palito, não vem da planilha.
                </p>
              </div>
            )}

            {previa.aInserir === 0 && previa.validas > 0 && (
              <p className="text-sm text-muted-foreground">
                Todas as {previa.validas} análises válidas desta planilha já estão no sistema. Nada a importar.
              </p>
            )}
          </div>
        )}
      </Modal>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
