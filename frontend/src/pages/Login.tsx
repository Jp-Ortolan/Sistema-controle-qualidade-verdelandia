import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { getInitialTheme, applyTheme } from '../lib/theme'
import { Button, Field, Input } from '../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  // Garante que o login siga o mesmo tema do resto do sistema
  // (útil quando o usuário chega direto em /login, sem passar pelo Layout antes).
  useEffect(() => {
    applyTheme(getInitialTheme())
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('scq_session_expired')) {
      sessionStorage.removeItem('scq_session_expired')
      setErro('Sua sessão expirou. Faça login novamente.')
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')

    if (!email.trim() || !senha.trim()) {
      setErro('Preencha o e-mail e a senha para continuar.')
      return
    }

    setLoading(true)
    try {
      const res = await api.auth.login(email, senha)
      localStorage.setItem('scq_token', res.token)
      localStorage.setItem('scq_user', JSON.stringify({
        email: res.email,
        nome: res.nome ?? null,
        perfil: res.perfil,
        permissoes: res.permissoes ?? null,
      }))
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof TypeError) {
        setErro('Não foi possível conectar ao servidor. Tente novamente em instantes.')
      } else {
        setErro('E-mail ou senha incorretos. Verifique e tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-stretch">
      {/* Painel esquerdo — identidade de marca */}
      <div className="login-hero hidden md:flex flex-col justify-end w-[55%] px-14 py-16 relative overflow-hidden border-r border-border">
        <div className="max-w-sm">
          <img
            src="/logo_verdelandia.png"
            alt="Verdelândia"
            className="h-16 w-auto object-contain mb-10"
          />

          <h1 className="font-serif text-4xl xl:text-5xl font-semibold text-foreground leading-tight">
            Indústria Ervateira<br />
            <span className="text-primary italic">Verdelândia</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-sm max-w-xs leading-relaxed">
            Sistema de Controle de Qualidade para rastreabilidade e análise de erva-mate.
          </p>

          <div className="mt-10 flex gap-10 border-t border-border pt-6 text-muted-foreground text-sm">
            <div>
              <p className="font-mono text-xl font-bold text-primary">SCQ</p>
              <p className="text-xs">Controle de Qualidade</p>
            </div>
            <div>
              <p className="font-mono text-xl font-bold text-primary">FORQSE001</p>
              <p className="text-xs">Fichas de Embalagem</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="md:hidden flex flex-col items-center mb-8 gap-3">
            <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-20 w-auto object-contain" />
            <span className="font-serif text-lg font-semibold text-foreground">Verdelândia SCQ</span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-xl font-bold text-foreground">Entrar no sistema</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use suas credenciais de acesso</p>

            {erro && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="E-mail" htmlFor="login-email">
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </Field>
              <Field label="Senha" htmlFor="login-senha">
                <Input
                  id="login-senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  placeholder="••••••"
                />
              </Field>
              <Button type="submit" loading={loading} className="mt-2 w-full">
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 Ind. Ervateira Verdelândia LTDA
          </p>
        </div>
      </div>
    </div>
  )
}
