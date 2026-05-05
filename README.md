# Sistema de Controle de Qualidade - Verdelândia

Incremento funcional (evolução pós-Sprint 1) com arquitetura web moderna — adequado ao **entregável Sprint 2** (código versionado + ambiente local demonstrável).

## Stack utilizada

- Backend: Node.js, Express, JWT, Zod, Prisma
- Base de dados (desenvolvimento local): **SQLite** (ficheiro `backend/prisma/dev.db` — não precisa de instalar PostgreSQL)
- Frontend: React + TypeScript
- Deploy alvo (opcional): Railway (API), Vercel (web), PostgreSQL gerido (ex.: Supabase) — exige trocar `provider` no `schema.prisma` e gerar novas migrações para PostgreSQL

## Estrutura

- `backend/`: API REST com autenticação, perfis e módulos de domínio
- `frontend/`: aplicação React com telas de login, menu e formulários principais
- `src/` e `public/`: versão anterior da Sprint 1 (mantida como legado)

## Funcionalidades já preparadas

- Login com JWT e controle por perfil (`ANALISTA`, `COMPRAS`, `COMPRA_MATERIA_PRIMA`)
- Cadastro de produtores
- Cadastro e consulta paginada de análises com cálculo automático de desconto
- Cadastro e consulta paginada da ficha FORQSE001
- Cadastro e consulta paginada de coleta de amostras
- Tema claro/escuro no frontend

## Testes automatizados

Na raiz do repositório:

```bash
npm test
```

Executa testes unitários do backend (ex.: regra de desconto em `backend/src/utils/calculateDiscount.js`).

## Documentação da sprint (entregáveis)

- `docs/RELATORIO_SPRINT2.md` — relatório da Sprint 2 (sumário, métricas, retrospectiva, backlog atualizado resumido, anexo de testes manuais).
- `docs/ROTEIRO_VIDEO_SPRINT2.md` — roteiro do vídeo de demonstração (5–10 min).

## Como executar

1) Instale dependências no projeto raiz:

```bash
npm install
```

2) Instale backend e frontend:

```bash
npm install --prefix backend
npm install --prefix frontend
```

3) Configure variáveis no backend:

```bash
copy backend\.env.example backend\.env
```

Se já existir um `backend/.env` antigo com `postgresql://...`, **substitua** a linha `DATABASE_URL` por `DATABASE_URL="file:./dev.db"` (caminho relativo à pasta `backend/prisma`, como no `.env.example`) para usar SQLite local.

4) Configure banco e Prisma:

```bash
npm run prisma:migrate --prefix backend
npm run prisma:seed --prefix backend
```

5) Suba frontend + backend:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3333`

### Modo vídeo (sem API), sem botão no login

Com o frontend em `http://localhost:5173`, abra **`http://localhost:5173/?modo=video`** (ou `?video=1`). A app entra em modo local: cadastros e listagens ficam só no **localStorage** do navegador, sem backend.

### Erro 500 no login (`/api/auth/login`)

- Confirme em `backend/.env` a linha **`DATABASE_URL="file:./dev.db"`** (o projeto usa **SQLite**; um URL `postgresql://...` com o Prisma em SQLite gera 500).
- Depois de alterar o `.env`, **pare e volte a iniciar** o backend (`npm run dev` ou só o processo da API).
- Execute uma vez: `npm run prisma:migrate --prefix backend` e `npm run prisma:seed --prefix backend`.
