-- ================================================================
-- SCQ Verdelandia — Setup completo do banco PostgreSQL v3
-- Gerado a partir do prisma/schema.prisma atual
-- Execute no banco de dados (Supabase SQL Editor OU Render PSQL)
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
-- 2. User (sem alterações)
-- ----------------------------------------------------------------
CREATE TABLE "User" (
    "id"        SERIAL       NOT NULL,
    "email"     TEXT         NOT NULL,
    "senhaHash" TEXT         NOT NULL,
    "perfil"    TEXT         NOT NULL,         -- ANALISTA | COMPRAS | COMPRA_MATERIA_PRIMA
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ----------------------------------------------------------------
-- 3. Produtor (sem alterações)
-- ----------------------------------------------------------------
CREATE TABLE "Produtor" (
    "id"        SERIAL       NOT NULL,
    "nome"      TEXT         NOT NULL,
    "cidade"    TEXT         NOT NULL,
    "telefone"  TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Produtor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Produtor_nome_key" ON "Produtor"("nome");

-- ----------------------------------------------------------------
-- 4. Lote (NOVA TABELA)
--    codigo : identificador único (ex: L2026001)
--    produto: NATURAL | ABACAXI | MENTA_LIMAO | LIMAO
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
-- 5. Analise (campos novos: loteId, ticket, dataAnalise,
--    dataFabricacao, teorPo, umidade, observacao)
-- ----------------------------------------------------------------
CREATE TABLE "Analise" (
    "id"               SERIAL           NOT NULL,
    "produtorId"       INTEGER          NOT NULL,
    "loteId"           INTEGER,                        -- FK opcional para Lote
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
-- 6. FichaEmbalagem (campos novos: loteId, observacoes;
--    campo lote (texto livre) removido — agora é FK)
--    parametros: JSON com 4 objetos fixos
--    {resultado, unidade, padrao, unidadePadrao, conforme}
--    para: Densidade | Dimensoes | Visual/Impressoes | CodigoBarras
-- ----------------------------------------------------------------
CREATE TABLE "FichaEmbalagem" (
    "id"           SERIAL       NOT NULL,
    "loteId"       INTEGER,                            -- FK opcional para Lote
    "fornecedor"   TEXT         NOT NULL,
    "parametros"   TEXT         NOT NULL,              -- JSON string
    "observacoes"  TEXT,
    "statusGlobal" TEXT         NOT NULL,              -- CONFORME | NAO_CONFORME
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FichaEmbalagem_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------
-- 7. ColetaAmostra (produtorId agora opcional;
--    tipoProduto: Natural | Abacaxi | Menta & Limão | Limão)
-- ----------------------------------------------------------------
CREATE TABLE "ColetaAmostra" (
    "id"          SERIAL       NOT NULL,
    "produtorId"  INTEGER,                             -- FK opcional para Produtor
    "tipoProduto" TEXT         NOT NULL,
    "destino"     TEXT         NOT NULL,
    "dataColeta"  TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ColetaAmostra_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------
-- 8. Foreign Keys
-- ----------------------------------------------------------------
ALTER TABLE "Analise"
    ADD CONSTRAINT "Analise_produtorId_fkey"
    FOREIGN KEY ("produtorId") REFERENCES "Produtor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Analise"
    ADD CONSTRAINT "Analise_loteId_fkey"
    FOREIGN KEY ("loteId") REFERENCES "Lote"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FichaEmbalagem"
    ADD CONSTRAINT "FichaEmbalagem_loteId_fkey"
    FOREIGN KEY ("loteId") REFERENCES "Lote"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ColetaAmostra"
    ADD CONSTRAINT "ColetaAmostra_produtorId_fkey"
    FOREIGN KEY ("produtorId") REFERENCES "Produtor"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------
-- 9. SEED — Usuarios (senha "123456", bcrypt rounds=10)
-- ----------------------------------------------------------------
INSERT INTO "User" ("email", "senhaHash", "perfil") VALUES
    ('analista@scq.com', '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'ANALISTA'),
    ('compras@scq.com',  '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'COMPRAS'),
    ('compra@scq.com',   '$2a$10$IwhKYxts0TOwqEptmYummOySOZFUPg9h/mUJlVqyEs4yfrx7N1ogm', 'COMPRA_MATERIA_PRIMA');

-- ----------------------------------------------------------------
-- 10. SEED — Produtores
-- ----------------------------------------------------------------
INSERT INTO "Produtor" ("nome", "cidade", "telefone") VALUES
    ('Sitio Boa Esperanca', 'Guarapuava',   '(42) 99999-1111'),
    ('Fazenda Sao Jose',    'Ponta Grossa', '(42) 99999-2222'),
    ('Chacara Verde',       'Irati',        '(42) 99999-3333');

-- ----------------------------------------------------------------
-- 11. SEED — Lotes
-- ----------------------------------------------------------------
INSERT INTO "Lote" ("codigo", "produto", "dataFabricacao") VALUES
    ('L2026001', 'NATURAL',    '2026-01-10 00:00:00'),
    ('L2026002', 'ABACAXI',    '2026-02-15 00:00:00'),
    ('L2026003', 'MENTA_LIMAO','2026-03-20 00:00:00');

-- ----------------------------------------------------------------
-- 12. SEED — Analises
-- ----------------------------------------------------------------
INSERT INTO "Analise"
    ("produtorId", "loteId", "ticket", "percentualPalito", "teorPo", "umidade", "desconto")
SELECT p."id", l."id", 'TK-001', 8, 12.5, 11.2, 5
  FROM "Produtor" p, "Lote" l
 WHERE p."nome" = 'Sitio Boa Esperanca' AND l."codigo" = 'L2026001';

INSERT INTO "Analise"
    ("produtorId", "loteId", "ticket", "percentualPalito", "teorPo", "umidade", "desconto")
SELECT p."id", l."id", 'TK-002', 3, 8.0, 9.5, 0
  FROM "Produtor" p, "Lote" l
 WHERE p."nome" = 'Fazenda Sao Jose' AND l."codigo" = 'L2026002';

-- ----------------------------------------------------------------
-- 13. SEED — Ficha de embalagem (4 parametros fixos)
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
-- 14. SEED — Coletas
-- ----------------------------------------------------------------
INSERT INTO "ColetaAmostra" ("tipoProduto", "destino", "dataColeta") VALUES
    ('Natural',       'Laboratorio Interno', '2026-05-10 00:00:00'),
    ('Menta & Limao', 'TECPAR',              '2026-05-15 00:00:00');

-- ----------------------------------------------------------------
-- VERIFICACAO FINAL — deve retornar 6 linhas com as contagens
-- ----------------------------------------------------------------
SELECT 'User'          AS tabela, COUNT(*)::int AS registros FROM "User"
UNION ALL SELECT 'Produtor',       COUNT(*)::int FROM "Produtor"
UNION ALL SELECT 'Lote',           COUNT(*)::int FROM "Lote"
UNION ALL SELECT 'Analise',        COUNT(*)::int FROM "Analise"
UNION ALL SELECT 'FichaEmbalagem', COUNT(*)::int FROM "FichaEmbalagem"
UNION ALL SELECT 'ColetaAmostra',  COUNT(*)::int FROM "ColetaAmostra"
ORDER BY tabela;
