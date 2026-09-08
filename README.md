# SCQ — Sistema de Controle de Qualidade

Sistema web desenvolvido para a **Indústria Ervateira Verdelândia LTDA** como projeto acadêmico da disciplina de Engenharia de Software.

O SCQ digitaliza e centraliza os processos de controle de qualidade da erva-mate recebida pela empresa, substituindo planilhas Excel e documentos físicos por uma plataforma web integrada, acessível de qualquer dispositivo.

---

##  Acesso ao Sistema

| Ambiente | URL |
|---|---|
| **Frontend (produção)** | https://sistema-controle-qualidade-verdelan.vercel.app |
| **Backend API (produção)** | https://sistema-controle-qualidade-verdelandia-production.up.railway.app |

---

##  Credenciais de Demonstração

| Perfil | E-mail | Senha | Acesso |
|---|---|---|---|
| Analista | analista@scq.com | 123456 | Registra análises, fichas, coletas e lotes |
| Compras | compras@scq.com | 123456 | Consulta análises e exporta dados |
| Gestor | gestor@scq.com | 123456 | Visualiza tudo + logs de auditoria |

---

##  Funcionalidades

- **Autenticação JWT** com controle de acesso por perfil
- **Dashboard** com cards de métricas e gráficos em tempo real
- **Análises de Erva-Mate** com cálculo automático de desconto
  - Fórmula: palito ≤ 0,3% = sem desconto; > 0,3% = (palito − 0,3) × 35%
- **Lotes de Produção** com período de 7 dias
- **Ficha FORQSE001** com geração de PDF
- **Coletas de Amostras** com exportação Excel
- **Exportação** de análises em Excel e PDF
- **Logs de Auditoria** (exclusivo para o perfil Gestor)
- **Paginação** de 10 registros por página em todas as listagens
- **Tema claro e escuro**
- **Responsivo** — funciona em desktop, tablet e celular

---

## 🛠️ Stack Tecnológica

### Frontend
- React 18 + TypeScript
- Vite
- React Router v6
- Recharts (gráficos)
- SheetJS / xlsx (exportação Excel)
- react-hot-toast (notificações)
- Lucide React (ícones)

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT + bcrypt (autenticação)
- Zod (validação)
- pdfmake (geração de PDF)
- Helmet (segurança HTTP)

### Hospedagem
- **Frontend:** Vercel
- **Backend + Banco:** Railway

---

##  Como Rodar Localmente

### Pré-requisitos
- Node.js 18 ou superior
- npm 9 ou superior
- Git

### 1. Clone o repositório
```bash
git clone https://github.com/Jp-Ortolan/Sistema-controle-qualidade-verdelandia.git
cd Sistema-controle-qualidade-verdelandia
```

### 2. Configure o backend
```bash
cd backend
npm install
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DATABASE_URL="postgresql://usuario:senha@host:5432/banco"
JWT_SECRET="sua_chave_secreta"
PORT=3333
NODE_ENV=development
```

> Para desenvolvimento local com SQLite, use: `DATABASE_URL="file:./dev.db"` e altere o provider no `schema.prisma` para `sqlite`.

```bash
npx prisma db push
node prisma/seed.js
node src/server.js
```

O backend estará disponível em: `http://localhost:3333`

### 3. Configure o frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

Edite o arquivo `.env`:
```env
VITE_API_URL=http://localhost:3333
```

```bash
npm run dev
```

O frontend estará disponível em: `http://localhost:5173`

---

##  Estrutura do Projeto

```
Sistema-controle-qualidade-verdelandia/
├── backend/
│   ├── src/
│   │   ├── server.js              # Ponto de entrada Express
│   │   ├── routes/                # Rotas da API por módulo
│   │   │   ├── auth.js
│   │   │   ├── analises.js
│   │   │   ├── lotes.js
│   │   │   ├── fichas.js
│   │   │   ├── coletas.js
│   │   │   ├── logs.js
│   │   │   └── dashboard.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # Validação JWT
│   │   │   └── perfil.js          # Controle de acesso por perfil
│   │   └── lib/
│   │       ├── prisma.js          # Singleton do Prisma Client
│   │       └── utils.js           # Utilitários compartilhados
│   ├── prisma/
│   │   ├── schema.prisma          # Modelo de dados
│   │   └── seed.js                # Dados iniciais
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Páginas da aplicação
│   │   ├── components/            # Componentes reutilizáveis
│   │   ├── services/
│   │   │   └── api.ts             # Cliente HTTP centralizado
│   │   ├── lib/
│   │   │   └── permissions.ts     # Mapa de permissões por perfil
│   │   └── hooks/
│   │       └── useAuth.ts         # Hook de autenticação
│   ├── vercel.json
│   └── .env.example
└── README.md
```

---

##  Segurança

- Autenticação via JWT com expiração de 8 horas
- Senhas armazenadas com bcrypt
- CORS restrito à URL oficial do frontend
- Headers de segurança HTTP via Helmet (HSTS, CSP, X-Frame-Options)
- Validação de dados em todas as rotas via Zod
- Controle de acesso por perfil verificado no backend (RBAC)

---

##  Equipe

| Nome | Função |
|---|---|
| Rafael Angelo Silva | Scrum Master |
| João Pedro Ortolan Pereira | Product Owner |
| Hivan Lucas Rossinolli | Desenvolvedor |
| João Vinicius | Desenvolvedor |

---

##  Informações Acadêmicas

- **Disciplina:** Projeto de extensão
- **Empresa parceira:** Indústria Ervateira Verdelândia LTDA — Guarapuava, PR
- **Período:** 2026
