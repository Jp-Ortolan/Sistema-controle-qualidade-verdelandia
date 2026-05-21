export type Perfil = 'ANALISTA' | 'COMPRAS' | 'COMPRA_MATERIA_PRIMA'
export type Resource = 'produtores' | 'analises' | 'fichas' | 'coletas'

export function getPerfil(): Perfil | null {
  const raw = localStorage.getItem('scq_user')
  if (!raw) return null
  return (JSON.parse(raw) as { perfil?: Perfil }).perfil ?? null
}

// Quem pode VER a página do módulo
const CAN_VIEW: Record<Resource, Perfil[]> = {
  produtores: ['COMPRAS'],
  analises: ['ANALISTA', 'COMPRAS', 'COMPRA_MATERIA_PRIMA'],
  fichas: ['ANALISTA'],
  coletas: ['ANALISTA'],
}

// Quem pode CRIAR e EDITAR (exibe botão Nova + lápis na linha)
// ANALISTA: cria/edita análises, fichas, coletas
// COMPRAS: somente leitura — sem botões de ação
// COMPRA_MATERIA_PRIMA: somente leitura
const CAN_WRITE: Record<Resource, Perfil[]> = {
  produtores: [],
  analises: ['ANALISTA'],
  fichas: ['ANALISTA'],
  coletas: ['ANALISTA'],
}

// Quem pode EXCLUIR (exibe botão lixeira na linha)
// Por especificação: ANALISTA "não pode excluir nada" → botão escondido no frontend
// O endpoint DELETE existe no backend para uso administrativo via API
const CAN_DELETE: Record<Resource, Perfil[]> = {
  produtores: [],
  analises: [],
  fichas: [],
  coletas: [],
}

export const can = {
  view: (resource: Resource, perfil: Perfil | null) =>
    perfil !== null && CAN_VIEW[resource].includes(perfil),
  write: (resource: Resource, perfil: Perfil | null) =>
    perfil !== null && CAN_WRITE[resource].includes(perfil),
  delete: (resource: Resource, perfil: Perfil | null) =>
    perfil !== null && CAN_DELETE[resource].includes(perfil),
}
