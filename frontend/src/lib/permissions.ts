// Permissões do SCQ — controle por aba (recurso) e por ação.
// Cada usuário pode ter permissões próprias, definidas pelo administrador na tela de Usuários.
// Quando o usuário não tem permissões próprias, valem as permissões padrão do perfil dele.

export type Perfil = 'ADMIN' | 'GESTOR' | 'ANALISTA' | 'COMPRAS' | 'COMPRA_MATERIA_PRIMA'
export type Resource = 'dashboard' | 'lotes' | 'analises' | 'coletas' | 'fichas' | 'logs' | 'usuarios'
export type Acao = 'view' | 'write' | 'delete' | 'export'
export type Permissoes = Record<Resource, Record<Acao, boolean>>

export const RECURSOS: Resource[] = ['dashboard', 'lotes', 'analises', 'coletas', 'fichas', 'logs', 'usuarios']
export const ACOES: Acao[] = ['view', 'write', 'delete', 'export']

export const ROTULOS_RECURSO: Record<Resource, string> = {
  dashboard: 'Dashboard',
  lotes: 'Lotes',
  analises: 'Análises',
  coletas: 'Coletas de Amostra',
  fichas: 'Fichas de Embalagem',
  logs: 'Logs de Auditoria',
  usuarios: 'Usuários',
}

export const ROTULOS_ACAO: Record<Acao, string> = {
  view: 'Ver',
  write: 'Criar / Editar',
  delete: 'Excluir',
  export: 'Exportar',
}

export const ROTULOS_PERFIL: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  ANALISTA: 'Analista',
  COMPRAS: 'Compras',
  COMPRA_MATERIA_PRIMA: 'Compra de Matéria-Prima',
}

export const PERFIS: Perfil[] = ['ADMIN', 'GESTOR', 'ANALISTA', 'COMPRAS', 'COMPRA_MATERIA_PRIMA']

const TUDO: Acao[] = ['view', 'write', 'delete', 'export']

export function permissoesVazias(): Permissoes {
  const p = {} as Permissoes
  for (const r of RECURSOS) {
    p[r] = { view: false, write: false, delete: false, export: false }
  }
  return p
}

function montar(mapa: Partial<Record<Resource, Acao[]>>): Permissoes {
  const p = permissoesVazias()
  for (const [recurso, acoes] of Object.entries(mapa) as [Resource, Acao[]][]) {
    for (const acao of acoes) p[recurso][acao] = true
  }
  return p
}

// Presets — precisam bater com backend/src/lib/permissoes.js
export const PRESETS: Record<Perfil, Permissoes> = {
  ADMIN: montar({
    dashboard: TUDO, lotes: TUDO, analises: TUDO, coletas: TUDO,
    fichas: TUDO, logs: ['view', 'export'], usuarios: TUDO,
  }),
  GESTOR: montar({
    dashboard: ['view'],
    lotes: ['view', 'export'], analises: ['view', 'export'],
    coletas: ['view', 'export'], fichas: ['view', 'export'],
    logs: ['view', 'export'],
  }),
  ANALISTA: montar({
    dashboard: ['view'],
    lotes: TUDO, analises: TUDO, coletas: TUDO, fichas: TUDO,
  }),
  COMPRAS: montar({
    dashboard: ['view'],
    lotes: ['view', 'export'], analises: ['view', 'export'],
    coletas: ['view', 'export'], fichas: ['view', 'export'],
  }),
  COMPRA_MATERIA_PRIMA: montar({
    dashboard: ['view'],
    lotes: ['view', 'export'], analises: ['view', 'export'],
    coletas: ['view', 'export'], fichas: ['view', 'export'],
  }),
}

export function normalizarPermissoes(entrada: unknown): Permissoes {
  const bruto = (entrada ?? {}) as Record<string, Record<string, unknown>>
  const p = permissoesVazias()
  for (const r of RECURSOS) {
    for (const a of ACOES) p[r][a] = bruto?.[r]?.[a] === true
  }
  return p
}

interface UsuarioSessao {
  email?: string
  nome?: string | null
  perfil?: Perfil
  permissoes?: unknown
}

export function getUser(): UsuarioSessao | null {
  const raw = localStorage.getItem('scq_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as UsuarioSessao
  } catch {
    return null
  }
}

export function getPerfil(): Perfil | null {
  return getUser()?.perfil ?? null
}

// Permissões efetivas de quem está logado.
export function getPermissoes(perfilFallback?: Perfil | null): Permissoes {
  const user = getUser()
  if (user?.permissoes) return normalizarPermissoes(user.permissoes)
  const perfil = user?.perfil ?? perfilFallback ?? null
  return perfil && PRESETS[perfil] ? PRESETS[perfil] : permissoesVazias()
}

function checar(resource: Resource, acao: Acao, perfil: Perfil | null): boolean {
  return getPermissoes(perfil)[resource][acao] === true
}

export const can = {
  view:   (resource: Resource, perfil: Perfil | null) => checar(resource, 'view', perfil),
  write:  (resource: Resource, perfil: Perfil | null) => checar(resource, 'write', perfil),
  delete: (resource: Resource, perfil: Perfil | null) => checar(resource, 'delete', perfil),
  export: (resource: Resource, perfil: Perfil | null) => checar(resource, 'export', perfil),
}
