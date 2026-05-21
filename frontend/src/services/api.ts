const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`

export interface Produtor {
  id: number
  nome: string
  cidade: string
  telefone: string
  createdAt: string
}

export interface Lote {
  id: number
  codigo: string
  produto: 'NATURAL' | 'ABACAXI' | 'MENTA_LIMAO' | 'LIMAO'
  dataFabricacao: string
  observacao?: string | null
  createdAt: string
}

export interface Analise {
  id: number
  produtorId: number
  produtor: { nome: string }
  loteId?: number | null
  lote?: { codigo: string; produto: string } | null
  ticket?: string | null
  dataAnalise: string
  dataFabricacao?: string | null
  percentualPalito: number
  teorPo?: number | null
  umidade?: number | null
  desconto: number
  observacao?: string | null
  createdAt: string
}

export interface Parametro {
  resultado: string
  unidade: string
  padrao: string
  unidadePadrao: string
  conforme: boolean
}

export interface FichaEmbalagem {
  id: number
  loteId?: number | null
  lote?: { codigo: string; produto: string } | null
  fornecedor: string
  parametros: string
  observacoes?: string | null
  statusGlobal: 'CONFORME' | 'NAO_CONFORME'
  createdAt: string
}

export interface FichaList {
  fichas: FichaEmbalagem[]
  total: number
  pagina: number
  limite: number
}

export interface ColetaAmostra {
  id: number
  tipoProduto: string
  destino: string
  dataColeta: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  perfil: string
  email: string
}

export interface DashboardData {
  totalAnalises: number
  analisesHoje: number
  mediaDesconto: number
  mediaTeorPalito: number
  lotesEstaSemana: number
  fichasConformes: number
  fichasNaoConformes: number
  coletasEstaSemana: number
  ultimasAnalises: Array<{ id: number; percentualPalito: number; desconto: number; createdAt: string; produtor: { nome: string } }>
  analisesPorDia: Array<{ dia: string; total: number }>
  descontoPorProdutor: Array<{ nome: string; mediaDesconto: number }>
}

function getToken(): string | null {
  return localStorage.getItem('scq_token')
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers ?? {}) },
  })
  if (res.status === 401) {
    localStorage.removeItem('scq_token')
    localStorage.removeItem('scq_user')
    window.location.href = '/login'
    throw new Error('Sessão expirada')
  }
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(body.error ?? 'Erro na requisição')
  }
  return res.json() as Promise<T>
}

function buildParams(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) { if (v) q.set(k, v) }
  const s = q.toString()
  return s ? `?${s}` : ''
}

type ProdutorInput = Omit<Produtor, 'id' | 'createdAt'>
type LoteInput = { codigo: string; produto: string; dataFabricacao: string; observacao?: string }
type AnaliseInput = {
  produtorId: number; loteId?: number | null; ticket?: string | null
  dataAnalise?: string; dataFabricacao?: string | null
  percentualPalito: number; teorPo?: number | null; umidade?: number | null; observacao?: string | null
}
type FichaInput = { loteId?: number | null; fornecedor: string; parametros: Parametro[]; observacoes?: string | null; statusGlobal: string }
type ColetaInput = { dataColeta: string; tipoProduto: string; destino: string }

export const api = {
  auth: {
    login: (email: string, senha: string) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
  },

  dashboard: {
    get: () => request<DashboardData>('/dashboard'),
  },

  produtores: {
    list: () => request<Produtor[]>('/produtores'),
    create: (data: ProdutorInput) => request<Produtor>('/produtores', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ProdutorInput) => request<Produtor>(`/produtores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/produtores/${id}`, { method: 'DELETE' }),
  },

  lotes: {
    list: () => request<Lote[]>('/lotes'),
    create: (data: LoteInput) => request<Lote>('/lotes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: LoteInput) => request<Lote>(`/lotes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/lotes/${id}`, { method: 'DELETE' }),
  },

  analises: {
    list: (filters?: { produtorId?: string; dataInicio?: string; dataFim?: string }) =>
      request<Analise[]>(`/analises${buildParams(filters ?? {})}`),
    create: (data: AnaliseInput) => request<Analise>('/analises', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: AnaliseInput) => request<Analise>(`/analises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/analises/${id}`, { method: 'DELETE' }),
  },

  fichas: {
    list: (filters?: { status?: string; dataInicio?: string; dataFim?: string; pagina?: string; limite?: string }) =>
      request<FichaList>(`/fichas${buildParams(filters ?? {})}`),
    create: (data: FichaInput) => request<FichaEmbalagem>('/fichas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: FichaInput) => request<FichaEmbalagem>(`/fichas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/fichas/${id}`, { method: 'DELETE' }),
    downloadPdf: (id: number) => fetch(`${BASE}/fichas/${id}/pdf`, { headers: authHeaders() }),
  },

  coletas: {
    list: (filters?: { tipoProduto?: string; destino?: string; dataInicio?: string; dataFim?: string }) =>
      request<ColetaAmostra[]>(`/coletas${buildParams(filters ?? {})}`),
    create: (data: ColetaInput) => request<ColetaAmostra>('/coletas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ColetaInput) => request<ColetaAmostra>(`/coletas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/coletas/${id}`, { method: 'DELETE' }),
    exportar: () => fetch(`${BASE}/coletas/exportar`, { headers: authHeaders() }),
  },
}
