-- ============================================================
-- SCQ Verdelandia -- Setup completo do banco PostgreSQL
-- Execute no Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- ------------------------------------------------------------
-- 1. DROP TABLE (ordem inversa das foreign keys)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS "ColetaAmostra" CASCADE;
DROP TABLE IF EXISTS "Analise"       CASCADE;
DROP TABLE IF EXISTS "FichaEmbalagem" CASCADE;
DROP TABLE IF EXISTS "Produtor"      CASCADE;
DROP TABLE IF EXISTS "User"          CASCADE;

-- Remove tabela interna do Prisma para comecar do zero
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- ------------------------------------------------------------
-- 2. CREATE TABLE
-- ------------------------------------------------------------

CREATE TABLE "User" (
    "id"        SERIAL      NOT NULL,
    "email"     TEXT        NOT NULL,
    "senhaHash" TEXT        NOT NULL,
    "perfil"    TEXT        NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Produtor" (
    "id"        SERIAL      NOT NULL,
    "nome"      TEXT        NOT NULL,
    "cidade"    TEXT        NOT NULL,
    "telefone"  TEXT        NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Produtor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Analise" (
    "id"               SERIAL           NOT NULL,
    "produtorId"       INTEGER          NOT NULL,
    "percentualPalito" DOUBLE PRECISION NOT NULL,
    "desconto"         DOUBLE PRECISION NOT NULL,
    "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FichaEmbalagem" (
    "id"           SERIAL      NOT NULL,
    "lote"         TEXT        NOT NULL,
    "fornecedor"   TEXT        NOT NULL,
    "parametros"   TEXT        NOT NULL,
    "statusGlobal" TEXT        NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FichaEmbalagem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ColetaAmostra" (
    "id"          SERIAL      NOT NULL,
    "produtorId"  INTEGER     NOT NULL,
    "tipoProduto" TEXT        NOT NULL,
    "destino"     TEXT        NOT NULL,
    "dataColeta"  TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ColetaAmostra_pkey" PRIMARY KEY ("id")
);

-- Indices unicos
CREATE UNIQUE INDEX "User_email_key"    ON "User"("email");
CREATE UNIQUE INDEX "Produtor_nome_key" ON "Produtor"("nome");

-- Foreign keys
ALTER TABLE "Analise"
    ADD CONSTRAINT "Analise_produtorId_fkey"
    FOREIGN KEY ("produtorId") REFERENCES "Produtor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ColetaAmostra"
    ADD CONSTRAINT "ColetaAmostra_produtorId_fkey"
    FOREIGN KEY ("produtorId") REFERENCES "Produtor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- 3. SEED
-- ------------------------------------------------------------

-- Usuarios (senha "123456" hasheada com bcrypt rounds=10)
INSERT INTO "User" ("email", "senhaHash", "perfil") VALUES
    ('analista@scq.com', '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'ANALISTA'),
    ('compras@scq.com',  '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'COMPRAS'),
    ('compra@scq.com',   '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'COMPRA_MATERIA_PRIMA');

-- Produtores
INSERT INTO "Produtor" ("nome", "cidade", "telefone") VALUES
    ('Sitio Boa Esperanca', 'Guarapuava',  '(42) 99999-1111'),
    ('Fazenda Sao Jose',    'Ponta Grossa','(42) 99999-2222'),
    ('Chacara Verde',       'Irati',       '(42) 99999-3333');

-- Analises (percentualPalito => desconto conforme regra de negocio)
-- <= 5% -> 0%  |  6-10% -> 5%  |  11-15% -> 10%  |  > 15% -> 15%
INSERT INTO "Analise" ("produtorId", "percentualPalito", "desconto") VALUES
    (1, 8, 5),   -- Sitio Boa Esperanca: 8% palito -> 5% desconto
    (2, 3, 0);   -- Fazenda Sao Jose:    3% palito -> 0% desconto

-- Ficha de embalagem (parametros armazenados como JSON texto)
INSERT INTO "FichaEmbalagem" ("lote", "fornecedor", "parametros", "statusGlobal") VALUES
    (
        'L2024001',
        'Ervateira Central Ltda',
        '[{"nome":"Umidade","valor":"12%","conforme":true},{"nome":"Granulometria","valor":"Grossa","conforme":true},{"nome":"Impurezas","valor":"0,5%","conforme":false}]',
        'NAO_CONFORME'
    );

-- Coletas de amostra
INSERT INTO "ColetaAmostra" ("produtorId", "tipoProduto", "destino", "dataColeta") VALUES
    (1, 'Erva-mate verde',    'Laboratorio Interno', '2024-11-10 00:00:00'),
    (3, 'Erva-mate cancheada','TECPAR',              '2024-11-15 00:00:00');

-- ------------------------------------------------------------
-- Verificacao final (deve retornar 5 linhas com contagens)
-- ------------------------------------------------------------
SELECT 'User'           AS tabela, COUNT(*)::int AS registros FROM "User"
UNION ALL
SELECT 'Produtor',       COUNT(*)::int FROM "Produtor"
UNION ALL
SELECT 'Analise',        COUNT(*)::int FROM "Analise"
UNION ALL
SELECT 'FichaEmbalagem', COUNT(*)::int FROM "FichaEmbalagem"
UNION ALL
SELECT 'ColetaAmostra',  COUNT(*)::int FROM "ColetaAmostra"
ORDER BY tabela;
