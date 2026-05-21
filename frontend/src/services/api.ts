const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`

export interface Produtor {
  id: number
  nome: string
  cidade: string
  telefone: string
  createdAt: string
}

export interface Analise {
  id: number
  produtorId: number
  produtor: { nome: string }
  percentualPalito: number
  desconto: number
  createdAt: string
}

export interface Parametro {
  nome: string
  valor: string
  conforme: boolean
}

export interface FichaEmbalagem {
  id: number
  lote: string
  fornecedor: string
  parametros: string
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
  produtorId: number
  produtor: { nome: string }
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
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
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
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v)
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

type ProdutorInput = Omit<Produtor, 'id' | 'createdAt'>
type AnaliseInput = { produtorId: number; percentualPalito: number }
type FichaInput = { lote: string; fornecedor: string; parametros: Parametro[]; statusGlobal: string }
type ColetaInput = { produtorId: number; tipoProduto: string; destino: string; dataColeta: string }

export const api = {
  auth: {
    login: (email: string, senha: string) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      }),
  },

  produtores: {
    list: () => request<Produtor[]>('/produtores'),
    create: (data: ProdutorInput) =>
      request<Produtor>('/produtores', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ProdutorInput) =>
      request<Produtor>(`/produtores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/produtores/${id}`, { method: 'DELETE' }),
  },

  analises: {
    list: (filters?: { produtorId?: string; dataInicio?: string; dataFim?: string }) =>
      request<Analise[]>(`/analises${buildParams(filters ?? {})}`),
    create: (data: AnaliseInput) =>
      request<Analise>('/analises', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: AnaliseInput) =>
      request<Analise>(`/analises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/analises/${id}`, { method: 'DELETE' }),
  },

  fichas: {
    list: (filters?: { status?: string; dataInicio?: string; dataFim?: string; pagina?: string; limite?: string }) =>
      request<FichaList>(`/fichas${buildParams(filters ?? {})}`),
    create: (data: FichaInput) =>
      request<FichaEmbalagem>('/fichas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: FichaInput) =>
      request<FichaEmbalagem>(`/fichas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/fichas/${id}`, { method: 'DELETE' }),
    downloadPdf: (id: number) =>
      fetch(`${BASE}/fichas/${id}/pdf`, { headers: authHeaders() }),
  },

  coletas: {
    list: (filters?: { tipoProduto?: string; destino?: string; dataInicio?: string; dataFim?: string }) =>
      request<ColetaAmostra[]>(`/coletas${buildParams(filters ?? {})}`),
    create: (data: ColetaInput) =>
      request<ColetaAmostra>('/coletas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ColetaInput) =>
      request<ColetaAmostra>(`/coletas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/coletas/${id}`, { method: 'DELETE' }),
    exportar: () =>
      fetch(`${BASE}/coletas/exportar`, { headers: authHeaders() }),
  },
}
