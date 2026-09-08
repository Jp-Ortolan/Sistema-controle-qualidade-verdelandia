import { useState, useEffect, type FormEvent } from 'react'
import { UserPlus, Pencil, Trash2, UserCheck, UserX, KeyRound, ShieldCheck, FileSpreadsheet } from 'lucide-react'
import { api, type Usuario } from '../services/api'
import {
  getPerfil, can, RECURSOS, ACOES, ROTULOS_RECURSO, ROTULOS_ACAO,
  ROTULOS_PERFIL, PERFIS, PRESETS, normalizarPermissoes, getUser,
  type Perfil, type Permissoes, type Resource, type Acao,
} from '../lib/permissions'
import Toast from '../components/Toast'
import { baixarArquivo } from '../lib/exportar'
import {
  Button, Field, Input, Select, Modal, PageHeader, Badge,
  LoadingState, EmptyState, Table, Thead, Tr, Td,
} from '../components/ui'

type ToastT = { msg: string; type: 'ok' | 'err' | 'info' | 'warn' }

const EMPTY_FORM = {
  nome: '',
  email: '',
  senha: '',
  perfil: 'ANALISTA' as Perfil,
}

type FormState = typeof EMPTY_FORM
type FormErrors = Partial<Record<keyof FormState, string>>

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function tomPerfil(perfil: string): 'primary' | 'info' | 'accent' | 'neutral' {
  if (perfil === 'ADMIN') return 'primary'
  if (perfil === 'GESTOR') return 'info'
  if (perfil === 'ANALISTA') return 'accent'
  return 'neutral'
}

export default function Usuarios() {
  const perfil = getPerfil()
  const canWrite = can.write('usuarios', perfil)
  const canDel = can.delete('usuarios', perfil)
  const canExport = can.export('usuarios', perfil)
  const [exporting, setExporting] = useState(false)
  const meuEmail = getUser()?.email ?? ''

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastT | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  // Permissões do formulário
  const [usaPadrao, setUsaPadrao] = useState(true)
  const [permissoes, setPermissoes] = useState<Permissoes>(PRESETS.ANALISTA)

  // Modais de confirmação
  const [confirmExcluir, setConfirmExcluir] = useState<Usuario | null>(null)
  const [confirmSituacao, setConfirmSituacao] = useState<Usuario | null>(null)
  const [senhaAlvo, setSenhaAlvo] = useState<Usuario | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [processando, setProcessando] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api.usuarios.list()
      setUsuarios(res.data)
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Erro ao carregar usuários', type: 'err' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])


  async function handleExportar() {
    if (usuarios.length === 0) {
      setToast({ msg: 'Nenhum registro encontrado para exportar.', type: 'warn' })
      return
    }
    setToast({ msg: 'Gerando a planilha, aguarde...', type: 'info' })
    setExporting(true)
    try {
      await baixarArquivo(await api.usuarios.exportar(), 'usuarios-scq.xlsx')
      setToast({ msg: 'Planilha gerada com sucesso!', type: 'ok' })
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Erro ao gerar a planilha.', type: 'err' })
    } finally {
      setExporting(false)
    }
  }

  function abrirCriar() {
    setEditando(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setUsaPadrao(true)
    setPermissoes(PRESETS.ANALISTA)
    setShowForm(true)
  }

  function abrirEditar(u: Usuario) {
    setEditando(u)
    setForm({ nome: u.nome ?? '', email: u.email, senha: '', perfil: u.perfil as Perfil })
    setErrors({})
    setUsaPadrao(!u.permissoesCustom)
    setPermissoes(normalizarPermissoes(u.permissoes))
    setShowForm(true)
  }

  // Ao trocar o perfil, se estiver usando o padrão, o quadro de permissões acompanha.
  function trocarPerfil(novo: Perfil) {
    setForm((f) => ({ ...f, perfil: novo }))
    if (usaPadrao) setPermissoes(PRESETS[novo] ?? permissoes)
  }

  function alternarPadrao(padrao: boolean) {
    setUsaPadrao(padrao)
    if (padrao) setPermissoes(PRESETS[form.perfil] ?? permissoes)
  }

  function marcar(recurso: Resource, acao: Acao, valor: boolean) {
    setPermissoes((p) => {
      const novo: Permissoes = { ...p, [recurso]: { ...p[recurso], [acao]: valor } }
      // Sem "Ver" não faz sentido manter as outras ações da mesma aba.
      if (acao === 'view' && !valor) {
        novo[recurso] = { view: false, write: false, delete: false, export: false }
      }
      // Marcar qualquer outra ação implica poder ver a aba.
      if (acao !== 'view' && valor) novo[recurso] = { ...novo[recurso], view: true }
      return novo
    })
  }

  function validar(): boolean {
    const e: FormErrors = {}
    if (form.nome.trim().length < 2) e.nome = 'Informe o nome do usuário'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'E-mail inválido'
    if (!editando && form.senha.length < 6) e.senha = 'A senha deve ter pelo menos 6 caracteres'
    if (editando && form.senha && form.senha.length < 6) e.senha = 'A senha deve ter pelo menos 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault()
    if (!validar()) return

    setSalvando(true)
    try {
      const base = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        perfil: form.perfil,
        permissoes: usaPadrao ? null : permissoes,
      }
      if (editando) {
        await api.usuarios.update(editando.id, { ...base, senha: form.senha || null })
        setToast({ msg: 'Usuário atualizado', type: 'ok' })
      } else {
        await api.usuarios.create({ ...base, senha: form.senha })
        setToast({ msg: 'Usuário criado', type: 'ok' })
      }
      setShowForm(false)
      await load()
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Erro ao salvar usuário', type: 'err' })
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarSituacao() {
    if (!confirmSituacao) return
    setProcessando(true)
    try {
      await api.usuarios.setAtivo(confirmSituacao.id, !confirmSituacao.ativo)
      setToast({ msg: confirmSituacao.ativo ? 'Usuário inativado' : 'Usuário reativado', type: 'ok' })
      setConfirmSituacao(null)
      await load()
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Erro ao alterar a situação', type: 'err' })
    } finally {
      setProcessando(false)
    }
  }

  async function confirmarExclusao() {
    if (!confirmExcluir) return
    setProcessando(true)
    try {
      await api.usuarios.delete(confirmExcluir.id)
      setToast({ msg: 'Usuário excluído', type: 'ok' })
      setConfirmExcluir(null)
      await load()
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Erro ao excluir usuário', type: 'err' })
    } finally {
      setProcessando(false)
    }
  }

  async function salvarSenha() {
    if (!senhaAlvo) return
    if (novaSenha.length < 6) {
      setToast({ msg: 'A senha deve ter pelo menos 6 caracteres', type: 'warn' })
      return
    }
    setProcessando(true)
    try {
      await api.usuarios.resetSenha(senhaAlvo.id, novaSenha)
      setToast({ msg: `Senha de ${senhaAlvo.email} redefinida`, type: 'ok' })
      setSenhaAlvo(null)
      setNovaSenha('')
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Erro ao redefinir a senha', type: 'err' })
    } finally {
      setProcessando(false)
    }
  }

  if (!can.view('usuarios', perfil)) {
    return (
      <EmptyState
        icon={ShieldCheck}
        message="Você não tem permissão para acessar a gestão de usuários."
      />
    )
  }

  const abasLiberadas = (u: Usuario) =>
    RECURSOS.filter((r) => u.permissoes?.[r]?.view).map((r) => ROTULOS_RECURSO[r])

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Cadastre usuários, defina o acesso de cada um às abas do sistema e controle quem está ativo."
        actions={
          <>
          {canExport && (
            <Button variant="outline" onClick={handleExportar} loading={exporting}>
              {!exporting && <FileSpreadsheet size={15} />} Exportar Excel
            </Button>
          )}
          {canWrite && (
            <Button onClick={abrirCriar}>
              <UserPlus size={16} /> Novo usuário
            </Button>
          )}
          </>
        }
      />

      {loading ? (
        <LoadingState />
      ) : usuarios.length === 0 ? (
        <EmptyState message="Nenhum usuário cadastrado." />
      ) : (
        <Table minWidth="min-w-[860px]">
          <Thead headers={['Nome', 'E-mail', 'Perfil', 'Abas liberadas', 'Situação', 'Criado em', 'Ações']} />
          <tbody>
            {usuarios.map((u) => {
              const abas = abasLiberadas(u)
              const souEu = u.email === meuEmail
              return (
                <Tr key={u.id}>
                  <Td align="left">
                    {u.nome ?? '—'}
                    {souEu && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                  </Td>
                  <Td align="left">{u.email}</Td>
                  <Td>
                    <Badge tone={tomPerfil(u.perfil)}>
                      {ROTULOS_PERFIL[u.perfil as Perfil] ?? u.perfil}
                    </Badge>
                  </Td>
                  <Td align="left">
                    <span className="text-xs text-muted-foreground">
                      {abas.length === 0 ? 'Nenhuma' : abas.join(', ')}
                    </span>
                    {u.permissoesCustom && (
                      <Badge tone="warning" className="ml-2">personalizado</Badge>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={u.ativo ? 'success' : 'danger'}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </Td>
                  <Td>{formatDate(u.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center justify-center gap-1">
                      {canWrite && (
                        <button
                          onClick={() => abrirEditar(u)}
                          title="Editar usuário e permissões"
                          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {canWrite && (
                        <button
                          onClick={() => { setSenhaAlvo(u); setNovaSenha('') }}
                          title="Redefinir senha"
                          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <KeyRound size={15} />
                        </button>
                      )}
                      {canWrite && !souEu && (
                        <button
                          onClick={() => setConfirmSituacao(u)}
                          title={u.ativo ? 'Inativar usuário' : 'Reativar usuário'}
                          className={`rounded-lg p-1.5 transition hover:bg-muted ${
                            u.ativo ? 'text-warning' : 'text-success'
                          }`}
                        >
                          {u.ativo ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                      )}
                      {canDel && !souEu && (
                        <button
                          onClick={() => setConfirmExcluir(u)}
                          title="Excluir usuário"
                          className="rounded-lg p-1.5 text-danger transition hover:bg-danger/10"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}

      {/* ── Formulário de usuário ── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editando ? 'Editar usuário' : 'Novo usuário'}
        description={
          editando
            ? 'Altere os dados, o perfil e o acesso às abas do sistema.'
            : 'Cadastre o usuário e escolha a quais abas ele terá acesso.'
        }
        maxWidth="max-w-3xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" form="form-usuario" loading={salvando} className="flex-1">
              {editando ? 'Salvar alterações' : 'Cadastrar usuário'}
            </Button>
          </>
        }
      >
        <form id="form-usuario" onSubmit={salvar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" required error={errors.nome} htmlFor="u-nome">
              <Input
                id="u-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Maria da Silva"
              />
            </Field>
            <Field label="E-mail" required error={errors.email} htmlFor="u-email">
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@scq.com"
              />
            </Field>
            <Field
              label={editando ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
              required={!editando}
              error={errors.senha}
              htmlFor="u-senha"
            >
              <Input
                id="u-senha"
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </Field>
            <Field label="Perfil" required htmlFor="u-perfil">
              <Select
                id="u-perfil"
                value={form.perfil}
                onChange={(e) => trocarPerfil(e.target.value as Perfil)}
              >
                {PERFIS.map((p) => (
                  <option key={p} value={p}>{ROTULOS_PERFIL[p]}</option>
                ))}
              </Select>
            </Field>
          </div>

          {/* ── Quadro de permissões ── */}
          <div className="rounded-xl border border-border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Acesso às abas</p>
                <p className="text-xs text-muted-foreground">
                  {usaPadrao
                    ? `Usando o acesso padrão do perfil ${ROTULOS_PERFIL[form.perfil]}.`
                    : 'Acesso personalizado para este usuário.'}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={usaPadrao}
                  onChange={(e) => alternarPadrao(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary,#065f46)]"
                />
                Usar o padrão do perfil
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr>
                    <th className="border-b border-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Aba
                    </th>
                    {ACOES.map((a) => (
                      <th
                        key={a}
                        className="border-b border-border px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {ROTULOS_ACAO[a]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECURSOS.map((r) => (
                    <tr key={r} className="even:bg-muted/40">
                      <td className="border-t border-border px-3 py-2 text-sm text-foreground">
                        {ROTULOS_RECURSO[r]}
                      </td>
                      {ACOES.map((a) => (
                        <td key={a} className="border-t border-border px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            disabled={usaPadrao}
                            checked={permissoes[r][a]}
                            onChange={(e) => marcar(r, a, e.target.checked)}
                            className="h-4 w-4 accent-[var(--color-primary,#065f46)] disabled:opacity-40"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Desmarcar <strong>Ver</strong> esconde a aba do menu desse usuário. O Dashboard aparece
              para quem tiver <strong>Ver</strong> marcado nele.
            </p>
          </div>
        </form>
      </Modal>

      {/* ── Redefinir senha ── */}
      <Modal
        open={senhaAlvo !== null}
        onClose={() => setSenhaAlvo(null)}
        title="Redefinir senha"
        description={senhaAlvo ? `Definir uma nova senha para ${senhaAlvo.email}.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setSenhaAlvo(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={salvarSenha} loading={processando} className="flex-1">
              Salvar senha
            </Button>
          </>
        }
      >
        <Field label="Nova senha" required htmlFor="u-nova-senha">
          <Input
            id="u-nova-senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </Field>
      </Modal>

      {/* ── Ativar / inativar ── */}
      <Modal
        open={confirmSituacao !== null}
        onClose={() => setConfirmSituacao(null)}
        title={confirmSituacao?.ativo ? 'Inativar usuário' : 'Reativar usuário'}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmSituacao(null)} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant={confirmSituacao?.ativo ? 'danger' : 'primary'}
              onClick={confirmarSituacao}
              loading={processando}
              className="flex-1"
            >
              {confirmSituacao?.ativo ? 'Inativar' : 'Reativar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {confirmSituacao?.ativo ? (
            <>
              <strong className="text-foreground">{confirmSituacao?.email}</strong> não vai mais
              conseguir entrar no sistema. O histórico e os registros feitos por ele continuam
              guardados.
            </>
          ) : (
            <>
              <strong className="text-foreground">{confirmSituacao?.email}</strong> volta a ter
              acesso ao sistema com as permissões atuais.
            </>
          )}
        </p>
      </Modal>

      {/* ── Excluir ── */}
      <Modal
        open={confirmExcluir !== null}
        onClose={() => setConfirmExcluir(null)}
        title="Excluir usuário"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmExcluir(null)} className="flex-1">
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao} loading={processando} className="flex-1">
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Excluir <strong className="text-foreground">{confirmExcluir?.email}</strong> de vez? Essa
          ação não tem volta. Se a ideia for só tirar o acesso, prefira <strong>inativar</strong>.
        </p>
      </Modal>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
