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
      localStorage.setItem('scq_user', JSON.stringify({ email: res.email, perfil: res.perfil }))
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
      {/* Painel esquerdo — logo destaque */}
      <div className="login-hero hidden md:flex flex-col items-center justify-center w-[55%] px-14 py-16 relative overflow-hidden">
        {/* Noise overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.3'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          {/* Logo grande — elemento visual principal */}
          <img
            src="/logo_verdelandia.png"
            alt="Verdelândia"
            className="h-48 w-auto object-contain drop-shadow-2xl mb-8"
          />

          <h1 className="font-serif text-4xl xl:text-5xl font-semibold text-foreground leading-tight">
            Indústria Ervateira<br />
            <span className="text-primary italic">Verdelândia</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-sm max-w-xs leading-relaxed">
            Sistema de Controle de Qualidade para rastreabilidade e análise de erva-mate.
          </p>

          <div className="mt-10 flex gap-10 text-muted-foreground text-sm">
            <div>
              <p className="text-xl font-bold text-primary">SCQ</p>
              <p className="text-xs">Controle de Qualidade</p>
            </div>
            <div>
              <p className="text-xl font-bold text-primary">FORQSE001</p>
              <p className="text-xs">Fichas de Embalagem</p>
            </div>
          </div>
        </div>

        {/* Brilho de fundo decorativo */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
      </div>

      {/* Painel direito — formulário */}
      <div className="login-panel-bg flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="md:hidden flex flex-col items-center mb-8 gap-3">
            <img src="/logo_verdelandia.png" alt="Verdelândia" className="h-20 w-auto object-contain" />
            <span className="font-serif text-lg font-semibold text-foreground">Verdelândia SCQ</span>
          </div>

          <div className="login-card rounded-2xl border p-8 shadow-2xl backdrop-blur-2xl">
            <div className="mb-1 h-0.5 rounded-full bg-gradient-to-r from-primary/80 via-primary/50 to-accent/70" />
            <h2 className="mt-6 text-xl font-bold text-foreground">Entrar no sistema</h2>
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
