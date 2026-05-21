import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Loader2 } from 'lucide-react'
import { api } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await api.auth.login(email, senha)
      localStorage.setItem('scq_token', res.token)
      localStorage.setItem('scq_user', JSON.stringify({ email: res.email, perfil: res.perfil }))
      navigate('/dashboard')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-stretch">
      {/* Left panel */}
      <div
        className="hidden md:flex flex-col justify-between w-[55%] px-14 py-16 relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 20% 30%, #11322f 0%, #091111 50%, #050607 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.3'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <Leaf size={28} className="text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium tracking-widest uppercase">SCQ</span>
          </div>
          <h1 className="font-serif text-5xl xl:text-6xl font-semibold text-stone-100 leading-tight">
            Indústria Ervateira<br />
            <span className="text-emerald-400 italic">Verdelândia</span>
          </h1>
          <p className="mt-6 text-stone-400 text-base max-w-sm leading-relaxed">
            Sistema de Controle de Qualidade para rastreabilidade e análise de erva-mate, substituindo planilhas manuais.
          </p>
        </div>
        <div className="relative z-10 flex gap-8 text-stone-500 text-sm">
          <div>
            <p className="text-2xl font-bold text-emerald-400">SCQ</p>
            <p className="text-xs">Controle de Qualidade</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">FORQSE001</p>
            <p className="text-xs">Fichas de Embalagem</p>
          </div>
        </div>
        <Leaf
          size={320}
          className="absolute -bottom-16 -left-16 text-emerald-900/20 rotate-12"
          strokeWidth={0.5}
        />
      </div>

      {/* Right panel — login form */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12"
        style={{
          background: 'radial-gradient(ellipse at 80% 70%, #11322f 0%, #050607 60%)',
        }}
      >
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <Leaf size={24} className="text-emerald-400" />
            <span className="font-serif text-xl font-semibold text-stone-100">Verdelândia SCQ</span>
          </div>

          <div
            className="rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-2xl"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div className="mb-1 h-0.5 rounded-full bg-gradient-to-r from-emerald-600/80 via-emerald-400/60 to-teal-500/70" />
            <h2 className="mt-6 text-xl font-bold text-stone-100">Entrar no sistema</h2>
            <p className="mt-1 text-sm text-stone-400">Use suas credenciais de acesso</p>

            {erro && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-3 text-sm text-red-400">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none backdrop-blur-md transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  placeholder="••••••"
                  className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none backdrop-blur-md transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 px-4 py-3.5 text-sm font-bold text-emerald-950 shadow-lg transition hover:from-white hover:to-stone-100 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-stone-600">
            © 2024 Ind. Ervateira Verdelândia LTDA
          </p>
        </div>
      </div>
    </div>
  )
}
