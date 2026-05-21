export type Perfil = 'ANALISTA' | 'COMPRAS' | 'COMPRA_MATERIA_PRIMA'
export type Resource = 'produtores' | 'analises' | 'fichas' | 'coletas' | 'lotes'

export function getPerfil(): Perfil | null {
  const raw = localStorage.getItem('scq_user')
  if (!raw) return null
  return (JSON.parse(raw) as { perfil?: Perfil }).perfil ?? null
}

// Quem pode VER a página
const CAN_VIEW: Record<Resource, Perfil[]> = {
  produtores: ['COMPRAS'],
  analises: ['ANALISTA', 'COMPRAS', 'COMPRA_MATERIA_PRIMA'],
  fichas: ['ANALISTA', 'COMPRAS'],
  coletas: ['ANALISTA', 'COMPRAS'],
  lotes: ['ANALISTA', 'COMPRAS'],
}

// Quem pode CRIAR e EDITAR
const CAN_WRITE: Record<Resource, Perfil[]> = {
  produtores: [],
  analises: ['ANALISTA'],
  fichas: ['ANALISTA'],
  coletas: ['ANALISTA'],
  lotes: ['ANALISTA'],
}

// Quem pode EXCLUIR (botão lixeira visível)
const CAN_DELETE: Record<Resource, Perfil[]> = {
  produtores: [],
  analises: [],
  fichas: [],
  coletas: [],
  lotes: [],
}

// Quem pode baixar PDF/Excel e copiar dados
const CAN_EXPORT: Record<Resource, Perfil[]> = {
  produtores: ['COMPRAS'],
  analises: ['ANALISTA', 'COMPRAS', 'COMPRA_MATERIA_PRIMA'],
  fichas: ['ANALISTA', 'COMPRAS'],
  coletas: ['ANALISTA', 'COMPRAS'],
  lotes: ['ANALISTA', 'COMPRAS'],
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
