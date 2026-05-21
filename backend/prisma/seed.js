const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = (p) => bcrypt.hash(p, 10);

  await prisma.user.upsert({
    where: { email: 'analista@scq.com' },
    update: {},
    create: { email: 'analista@scq.com', senhaHash: await hash('123456'), perfil: 'ANALISTA' },
  });
  await prisma.user.upsert({
    where: { email: 'compras@scq.com' },
    update: {},
    create: { email: 'compras@scq.com', senhaHash: await hash('123456'), perfil: 'COMPRAS' },
  });
  await prisma.user.upsert({
    where: { email: 'compra@scq.com' },
    update: {},
    create: { email: 'compra@scq.com', senhaHash: await hash('123456'), perfil: 'COMPRA_MATERIA_PRIMA' },
  });

  const p1 = await prisma.produtor.upsert({
    where: { nome: 'Sítio Boa Esperança' },
    update: {},
    create: { nome: 'Sítio Boa Esperança', cidade: 'Guarapuava', telefone: '(42) 99999-1111' },
  });
  const p2 = await prisma.produtor.upsert({
    where: { nome: 'Fazenda São José' },
    update: {},
    create: { nome: 'Fazenda São José', cidade: 'Ponta Grossa', telefone: '(42) 99999-2222' },
  });
  const p3 = await prisma.produtor.upsert({
    where: { nome: 'Chácara Verde' },
    update: {},
    create: { nome: 'Chácara Verde', cidade: 'Irati', telefone: '(42) 99999-3333' },
  });

  await prisma.analise.create({
    data: { produtorId: p1.id, percentualPalito: 8, desconto: 5 },
  });
  await prisma.analise.create({
    data: { produtorId: p2.id, percentualPalito: 3, desconto: 0 },
  });

  await prisma.fichaEmbalagem.create({
    data: {
      lote: 'L2024001',
      fornecedor: 'Ervateira Central Ltda',
      parametros: JSON.stringify([
        { nome: 'Umidade', valor: '12%', conforme: true },
        { nome: 'Granulometria', valor: 'Grossa', conforme: true },
        { nome: 'Impurezas', valor: '0,5%', conforme: false },
      ]),
      statusGlobal: 'NAO_CONFORME',
    },
  });

  await prisma.coletaAmostra.create({
    data: {
      produtorId: p1.id,
      tipoProduto: 'Erva-mate verde',
      destino: 'Laboratório Interno',
      dataColeta: new Date('2024-11-10'),
    },
  });
  await prisma.coletaAmostra.create({
    data: {
      produtorId: p3.id,
      tipoProduto: 'Erva-mate cancheada',
      destino: 'TECPAR',
      dataColeta: new Date('2024-11-15'),
    },
  });

  console.log('✅ Seed concluído com sucesso!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
