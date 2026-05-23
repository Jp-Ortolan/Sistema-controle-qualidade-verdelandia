-- ================================================================
-- SCQ Verdelandia — Setup completo do banco PostgreSQL v4
-- Remove tabela Produtor; Analise usa nomeProdutor (texto livre)
-- Execute no banco de dados (Supabase SQL Editor ou Railway PSQL)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. DROP (ordem que respeita foreign keys)
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS "ColetaAmostra"   CASCADE;
DROP TABLE IF EXISTS "Analise"         CASCADE;
DROP TABLE IF EXISTS "FichaEmbalagem"  CASCADE;
DROP TABLE IF EXISTS "Lote"            CASCADE;
DROP TABLE IF EXISTS "Produtor"        CASCADE;
DROP TABLE IF EXISTS "User"            CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- ----------------------------------------------------------------
-- 2. User
-- ----------------------------------------------------------------
CREATE TABLE "User" (
    "id"        SERIAL       NOT NULL,
    "email"     TEXT         NOT NULL,
    "senhaHash" TEXT         NOT NULL,
    "perfil"    TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ----------------------------------------------------------------
-- 3. Lote
-- ----------------------------------------------------------------
CREATE TABLE "Lote" (
    "id"             SERIAL       NOT NULL,
    "codigo"         TEXT         NOT NULL,
    "produto"        TEXT         NOT NULL,
    "dataFabricacao" TIMESTAMP(3) NOT NULL,
    "observacao"     TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Lote_codigo_key" ON "Lote"("codigo");

-- ----------------------------------------------------------------
-- 4. Analise (nomeProdutor como texto livre, ticket auto-gerado)
-- ----------------------------------------------------------------
CREATE TABLE "Analise" (
    "id"               SERIAL           NOT NULL,
    "nomeProdutor"     TEXT             NOT NULL,
    "loteId"           INTEGER,
    "ticket"           TEXT,
    "dataAnalise"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFabricacao"   TIMESTAMP(3),
    "percentualPalito" DOUBLE PRECISION NOT NULL,
    "teorPo"           DOUBLE PRECISION,
    "umidade"          DOUBLE PRECISION,
    "desconto"         DOUBLE PRECISION NOT NULL,
    "observacao"       TEXT,
    "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analise_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------
-- 5. FichaEmbalagem
-- ----------------------------------------------------------------
CREATE TABLE "FichaEmbalagem" (
    "id"           SERIAL       NOT NULL,
    "loteId"       INTEGER,
    "fornecedor"   TEXT         NOT NULL,
    "parametros"   TEXT         NOT NULL,
    "observacoes"  TEXT,
    "statusGlobal" TEXT         NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FichaEmbalagem_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------
-- 6. ColetaAmostra (sem produtorId)
-- ----------------------------------------------------------------
CREATE TABLE "ColetaAmostra" (
    "id"          SERIAL       NOT NULL,
    "tipoProduto" TEXT         NOT NULL,
    "destino"     TEXT         NOT NULL,
    "dataColeta"  TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ColetaAmostra_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------
-- 7. Foreign Keys
-- ----------------------------------------------------------------
ALTER TABLE "Analise"
    ADD CONSTRAINT "Analise_loteId_fkey"
    FOREIGN KEY ("loteId") REFERENCES "Lote"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FichaEmbalagem"
    ADD CONSTRAINT "FichaEmbalagem_loteId_fkey"
    FOREIGN KEY ("loteId") REFERENCES "Lote"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------
-- 8. SEED — Usuarios (senha "123456", bcrypt rounds=10)
-- ----------------------------------------------------------------
INSERT INTO "User" ("email", "senhaHash", "perfil") VALUES
    ('analista@scq.com', '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'ANALISTA'),
    ('compras@scq.com',  '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'COMPRAS'),
    ('compra@scq.com',   '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'COMPRA_MATERIA_PRIMA');

-- ----------------------------------------------------------------
-- 9. SEED — Lotes
-- ----------------------------------------------------------------
INSERT INTO "Lote" ("codigo", "produto", "dataFabricacao") VALUES
    ('L2026001', 'NATURAL',    '2026-01-10 00:00:00'),
    ('L2026002', 'ABACAXI',    '2026-02-15 00:00:00'),
    ('L2026003', 'MENTA_LIMAO','2026-03-20 00:00:00');

-- ----------------------------------------------------------------
-- 10. SEED — Analises
-- ----------------------------------------------------------------
INSERT INTO "Analise" ("nomeProdutor", "loteId", "ticket", "percentualPalito", "teorPo", "umidade", "desconto")
SELECT 'Sítio Boa Esperança', l."id", 'TK-0001', 8, 12.5, 11.2, 5
  FROM "Lote" l WHERE l."codigo" = 'L2026001';

INSERT INTO "Analise" ("nomeProdutor", "loteId", "ticket", "percentualPalito", "teorPo", "umidade", "desconto")
SELECT 'Fazenda São José', l."id", 'TK-0002', 3, 8.0, 9.5, 0
  FROM "Lote" l WHERE l."codigo" = 'L2026002';

-- ----------------------------------------------------------------
-- 11. SEED — Ficha de embalagem
-- ----------------------------------------------------------------
INSERT INTO "FichaEmbalagem" ("loteId", "fornecedor", "parametros", "statusGlobal")
SELECT l."id",
    'Ervateira Central Ltda',
    '[
      {"resultado":"0.85","unidade":"g/cm3","padrao":"0.80-0.90","unidadePadrao":"g/cm3","conforme":true},
      {"resultado":"15x10","unidade":"cm","padrao":"15x10","unidadePadrao":"cm","conforme":true},
      {"resultado":"OK","unidade":"","padrao":"Sem defeitos","unidadePadrao":"","conforme":true},
      {"resultado":"7898901234560","unidade":"","padrao":"7898901234560","unidadePadrao":"","conforme":true}
    ]',
    'CONFORME'
  FROM "Lote" l WHERE l."codigo" = 'L2026001';

-- ----------------------------------------------------------------
-- 12. SEED — Coletas
-- ----------------------------------------------------------------
INSERT INTO "ColetaAmostra" ("tipoProduto", "destino", "dataColeta") VALUES
    ('Natural',       'Laboratório Interno', '2026-05-10 00:00:00'),
    ('Menta & Limão', 'TECPAR',              '2026-05-15 00:00:00');

-- ----------------------------------------------------------------
-- VERIFICACAO FINAL
-- ----------------------------------------------------------------
SELECT 'User'          AS tabela, COUNT(*)::int AS registros FROM "User"
UNION ALL SELECT 'Lote',           COUNT(*)::int FROM "Lote"
UNION ALL SELECT 'Analise',        COUNT(*)::int FROM "Analise"
UNION ALL SELECT 'FichaEmbalagem', COUNT(*)::int FROM "FichaEmbalagem"
UNION ALL SELECT 'ColetaAmostra',  COUNT(*)::int FROM "ColetaAmostra"
ORDER BY tabela;
