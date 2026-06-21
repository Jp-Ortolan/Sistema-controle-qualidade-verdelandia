const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = (p) => bcrypt.hash(p, 10);

  // Users
  await prisma.user.upsert({ where: { email: 'analista@scq.com' }, update: {}, create: { email: 'analista@scq.com', senhaHash: await hash('123456'), perfil: 'ANALISTA' } });
  await prisma.user.upsert({ where: { email: 'compras@scq.com' }, update: {}, create: { email: 'compras@scq.com', senhaHash: await hash('123456'), perfil: 'COMPRAS' } });
  await prisma.user.upsert({ where: { email: 'gestor@scq.com' }, update: {}, create: { email: 'gestor@scq.com', senhaHash: await hash('123456'), perfil: 'GESTOR' } });

  // Lotes
  const l1 = await prisma.lote.upsert({ where: { codigo: 'L2026001' }, update: {}, create: { codigo: 'L2026001', produto: 'Erva-Mate Cancheada', dataInicio: new Date('2026-01-10'), dataFim: new Date('2026-01-17') } });
  const l2 = await prisma.lote.upsert({ where: { codigo: 'L2026002' }, update: {}, create: { codigo: 'L2026002', produto: 'Erva-Mate Cancheada', dataInicio: new Date('2026-02-15'), dataFim: new Date('2026-02-22') } });
  await prisma.lote.upsert({ where: { codigo: 'L2026003' }, update: {}, create: { codigo: 'L2026003', produto: 'Erva-Mate Cancheada', dataInicio: new Date('2026-03-20'), dataFim: new Date('2026-03-27') } });

  // Analises (ticket gerado automaticamente, mas seed define manualmente)
  await prisma.analise.create({ data: { nomeProdutor: 'Sítio Boa Esperança', loteId: l1.id, ticket: 'TK-0001', percentualPalito: 8, teorPo: 12.5, umidade: 11.2, desconto: 2.695 } });
  await prisma.analise.create({ data: { nomeProdutor: 'Fazenda São José', loteId: l2.id, ticket: 'TK-0002', percentualPalito: 3, teorPo: 8.0, umidade: 9.5, desconto: 0 } });

  // Ficha (4 parâmetros fixos)
  await prisma.fichaEmbalagem.create({
    data: {
      fornecedor: 'Ervateira Central Ltda',
      parametros: JSON.stringify([
        { resultado: '0.85', unidade: 'g/cm3', padrao: '0.80-0.90', unidadePadrao: 'g/cm3', conforme: true },
        { resultado: '15x10', unidade: 'cm', padrao: '15x10', unidadePadrao: 'cm', conforme: true },
        { resultado: 'OK', unidade: '', padrao: 'Sem defeitos', unidadePadrao: '', conforme: true },
        { resultado: '7898901234560', unidade: '', padrao: '7898901234560', unidadePadrao: '', conforme: true },
      ]),
      statusGlobal: 'CONFORME',
    },
  });

  // Coletas
  await prisma.coletaAmostra.create({ data: { tipoProduto: 'Erva-Mate Cancheada', destino: 'Laboratório Interno', dataColeta: new Date('2026-05-10') } });
  await prisma.coletaAmostra.create({ data: { tipoProduto: 'Erva-Mate Cancheada', destino: 'TECPAR', dataColeta: new Date('2026-05-15') } });

  console.log('✅ Seed v3 concluído com sucesso!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
