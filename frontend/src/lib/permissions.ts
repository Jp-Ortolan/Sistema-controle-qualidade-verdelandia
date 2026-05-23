export type Perfil = 'ANALISTA' | 'COMPRAS' | 'COMPRA_MATERIA_PRIMA' | 'GESTOR'
export type Resource = 'analises' | 'fichas' | 'coletas' | 'lotes' | 'logs'

export function getPerfil(): Perfil | null {
  const raw = localStorage.getItem('scq_user')
  if (!raw) return null
  return (JSON.parse(raw) as { perfil?: Perfil }).perfil ?? null
}

const CAN_VIEW: Record<Resource, Perfil[]> = {
  analises: ['ANALISTA', 'COMPRAS', 'COMPRA_MATERIA_PRIMA', 'GESTOR'],
  fichas: ['ANALISTA', 'COMPRAS', 'GESTOR'],
  coletas: ['ANALISTA', 'COMPRAS', 'GESTOR'],
  lotes: ['ANALISTA', 'COMPRAS', 'GESTOR'],
  logs: ['GESTOR'],
}

const CAN_WRITE: Record<Resource, Perfil[]> = {
  analises: ['ANALISTA'],
  fichas: ['ANALISTA'],
  coletas: ['ANALISTA'],
  lotes: ['ANALISTA'],
  logs: [],
}

const CAN_DELETE: Record<Resource, Perfil[]> = {
  analises: [],
  fichas: [],
  coletas: [],
  lotes: [],
  logs: [],
}

const CAN_EXPORT: Record<Resource, Perfil[]> = {
  analises: ['ANALISTA', 'COMPRAS', 'COMPRA_MATERIA_PRIMA', 'GESTOR'],
  fichas: ['ANALISTA', 'COMPRAS'],
  coletas: ['ANALISTA', 'COMPRAS'],
  lotes: ['ANALISTA', 'COMPRAS'],
  logs: ['ANALISTA'],
}

export const can = {
  view: (resource: Resource, perfil: Perfil | null) =>
    perfil !== null && CAN_VIEW[resource].includes(perfil),
  write: (resource: Resource, perfil: Perfil | null) =>
    perfil !== null && CAN_WRITE[resource].includes(perfil),
  delete: (resource: Resource, perfil: Perfil | null) =>
    perfil !== null && CAN_DELETE[resource].includes(perfil),
  export: (resource: Resource, perfil: Perfil | null) =>
    perfil !== null && CAN_EXPORT[resource].includes(perfil),
}
