import { useState, type FormEvent } from 'react'
import { api } from '../services/api'
import Toast from './Toast'
import { Button, Field, Input, Modal } from './ui'

type ToastT = { msg: string; type: 'ok' | 'err' | 'info' | 'warn' }

interface Props {
  open: boolean
  onClose: () => void
}

const VAZIO = { atual: '', nova: '', confirmar: '' }

export default function TrocarSenha({ open, onClose }: Props) {
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<ToastT | null>(null)

  function fechar() {
    setForm(VAZIO)
    setErro('')
    onClose()
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')

    if (!form.atual) return setErro('Informe a senha atual.')
    if (form.nova.length < 6) return setErro('A nova senha deve ter pelo menos 6 caracteres.')
    if (form.nova !== form.confirmar) return setErro('A confirmação não confere com a nova senha.')
    if (form.nova === form.atual) return setErro('A nova senha precisa ser diferente da atual.')

    setSalvando(true)
    try {
      await api.auth.alterarSenha(form.atual, form.nova)
      setForm(VAZIO)
      setToast({ msg: 'Senha alterada com sucesso!', type: 'ok' })
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível alterar a senha.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={fechar}
        title="Trocar minha senha"
        description="Informe a senha atual e escolha uma nova senha de acesso."
        footer={
          <>
            <Button variant="outline" onClick={fechar} className="flex-1">Cancelar</Button>
            <Button type="submit" form="form-trocar-senha" loading={salvando} className="flex-1">
              Salvar nova senha
            </Button>
          </>
        }
      >
        <form id="form-trocar-senha" onSubmit={salvar} className="space-y-4">
          {erro && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {erro}
            </div>
          )}
          <Field label="Senha atual" required htmlFor="s-atual">
            <Input
              id="s-atual" type="password" autoComplete="current-password"
              value={form.atual}
              onChange={(e) => setForm({ ...form, atual: e.target.value })}
              placeholder="••••••"
            />
          </Field>
          <Field label="Nova senha" required htmlFor="s-nova">
            <Input
              id="s-nova" type="password" autoComplete="new-password"
              value={form.nova}
              onChange={(e) => setForm({ ...form, nova: e.target.value })}
              placeholder="Mínimo 6 caracteres"
            />
          </Field>
          <Field label="Confirmar nova senha" required htmlFor="s-conf">
            <Input
              id="s-conf" type="password" autoComplete="new-password"
              value={form.confirmar}
              onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
              placeholder="Repita a nova senha"
            />
          </Field>
        </form>
      </Modal>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
