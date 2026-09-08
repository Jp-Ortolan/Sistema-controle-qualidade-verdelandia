// Permissoes do SCQ - controle por recurso (aba) e acao.
// Cada usuario pode ter permissoes proprias (coluna User.permissoes, em JSON).
// Quando o usuario nao tem permissoes proprias, vale o preset do perfil dele.

const RECURSOS = ['dashboard', 'lotes', 'analises', 'coletas', 'fichas', 'logs', 'usuarios'];
const ACOES = ['view', 'write', 'delete', 'export'];

const ROTULOS = {
  dashboard: 'Dashboard',
  lotes: 'Lotes',
  analises: 'Analises',
  coletas: 'Coletas de Amostra',
  fichas: 'Fichas de Embalagem',
  logs: 'Logs de Auditoria',
  usuarios: 'Usuarios',
};

const TUDO = ['view', 'write', 'delete', 'export'];

function vazio() {
  const p = {};
  for (const r of RECURSOS) {
    p[r] = {};
    for (const a of ACOES) p[r][a] = false;
  }
  return p;
}

function montar(mapa) {
  const p = vazio();
  for (const [recurso, acoes] of Object.entries(mapa)) {
    if (!p[recurso]) continue;
    for (const acao of acoes) {
      if (ACOES.includes(acao)) p[recurso][acao] = true;
    }
  }
  return p;
}

const PRESETS = {
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
  // Perfil legado que existe no banco de producao - mesmo acesso do COMPRAS.
  COMPRA_MATERIA_PRIMA: montar({
    dashboard: ['view'],
    lotes: ['view', 'export'], analises: ['view', 'export'],
    coletas: ['view', 'export'], fichas: ['view', 'export'],
  }),
};

const PERFIS = Object.keys(PRESETS);

function clonar(p) {
  const copia = {};
  for (const r of RECURSOS) {
    copia[r] = {};
    for (const a of ACOES) copia[r][a] = p?.[r]?.[a] === true;
  }
  return copia;
}

// Resolve as permissoes efetivas de um usuario do banco.
function resolver(user) {
  if (user && user.permissoes) {
    try {
      return clonar(JSON.parse(user.permissoes));
    } catch {
      // JSON invalido: cai no preset do perfil
    }
  }
  return clonar(PRESETS[user?.perfil] ?? vazio());
}

// Normaliza um objeto vindo do front antes de gravar no banco.
function normalizar(entrada) {
  return clonar(entrada);
}

module.exports = { RECURSOS, ACOES, ROTULOS, PRESETS, PERFIS, vazio, resolver, normalizar, clonar };
