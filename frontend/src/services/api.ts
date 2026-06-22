const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`

export interface Lote {
  id: number
  codigo: string
  produto: string
  dataInicio: string
  dataFim: string
  observacao?: string | null
  createdAt: string
}

export interface Analise {
  id: number
  nomeProdutor: string
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

export interface Page<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
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

export interface AuditLog {
  id: number
  userId: number
  userEmail: string
  acao: string
  entidade: string
  entidadeId: number
  detalhes?: string | null
  createdAt: string
}

export interface LogsResponse {
  logs: AuditLog[]
  total: number
  pagina: number
  limite: number
}

export interface DashboardData {
  totalAnalises: number
  analisesEstaSemana: number
  fichasConformes: number
  fichasNaoConformes: number
  totalColetas: number
  ultimasAnalises: Array<{
    id: number
    ticket?: string | null
    nomeProdutor: string
    percentualPalito: number
    desconto: number
    createdAt: string
  }>
  analisesPorDia: Array<{ dia: string; total: number }>
  top5Produtores: Array<{ nome: string; total: number }>
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

type LoteInput = { codigo: string; dataInicio: string; dataFim: string; observacao?: string }
type AnaliseInput = {
  nomeProdutor?: string | null
  ticket: string
  loteId?: number | null
  dataAnalise?: string
  dataFabricacao?: string | null
  percentualPalito: number
  teorPo?: number | null
  umidade?: number | null
  observacao?: string | null
}
type FichaInput = { fornecedor: string; parametros: Parametro[]; observacoes?: string | null; statusGlobal: string }
type ColetaInput = { dataColeta: string; destino: string }

export const api = {
  auth: {
    login: (email: string, senha: string) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
  },

  dashboard: {
    get: () => request<DashboardData>('/dashboard'),
  },

  lotes: {
    list: (params?: { page?: string; limit?: string }) =>
      request<Page<Lote>>(`/lotes${buildParams(params ?? {})}`),
    listAll: () =>
      request<Page<Lote>>(`/lotes${buildParams({ limit: '500' })}`),
    create: (data: LoteInput) => request<Lote>('/lotes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: LoteInput) => request<Lote>(`/lotes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/lotes/${id}`, { method: 'DELETE' }),
  },

  analises: {
    list: (filters?: { nomeProdutor?: string; dataInicio?: string; dataFim?: string; page?: string; limit?: string }) =>
      request<Page<Analise>>(`/analises${buildParams(filters ?? {})}`),
    create: (data: AnaliseInput) => request<Analise>('/analises', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: AnaliseInput) => request<Analise>(`/analises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/analises/${id}`, { method: 'DELETE' }),
    exportarExcel: (filters?: { nomeProdutor?: string; dataInicio?: string; dataFim?: string }) =>
      fetch(`${BASE}/analises/exportar/excel${buildParams(filters ?? {})}`, { headers: authHeaders() }),
    exportarPdf: (filters?: { nomeProdutor?: string; dataInicio?: string; dataFim?: string }) =>
      fetch(`${BASE}/analises/exportar/pdf${buildParams(filters ?? {})}`, { headers: authHeaders() }),
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
    list: (filters?: { tipoProduto?: string; destino?: string; dataInicio?: string; dataFim?: string; page?: string; limit?: string }) =>
      request<Page<ColetaAmostra>>(`/coletas${buildParams(filters ?? {})}`),
    create: (data: ColetaInput) => request<ColetaAmostra>('/coletas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ColetaInput) => request<ColetaAmostra>(`/coletas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/coletas/${id}`, { method: 'DELETE' }),
    exportar: () => fetch(`${BASE}/coletas/exportar`, { headers: authHeaders() }),
  },

  logs: {
    list: (filters?: { entidade?: string; acao?: string; pagina?: string; limite?: string }) =>
      request<LogsResponse>(`/logs${buildParams(filters ?? {})}`),
  },
}
