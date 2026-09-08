// Limpa os dados operacionais do SCQ (análises, lotes, fichas, coletas e logs).
// NAO apaga usuarios.
//
// Uso:  node prisma/limpar-dados.js --confirmar
//   ou: npm run db:limpar -- --confirmar

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONFIRMADO = process.argv.includes('--confirmar') || process.env.CONFIRMAR_LIMPEZA === 'SIM';

async function main() {
  const antes = {
    analises: await prisma.analise.count(),
    lotes: await prisma.lote.count(),
    fichas: await prisma.fichaEmbalagem.count(),
    coletas: await prisma.coletaAmostra.count(),
    logs: await prisma.log.count(),
    usuarios: await prisma.user.count(),
  };

  console.log('Registros no banco agora:');
  for (const [k, v] of Object.entries(antes)) console.log(`  ${k.padEnd(10)} ${v}`);

  if (!CONFIRMADO) {
    console.log('\n⚠️  Nada foi apagado.');
    console.log('   Rode de novo com --confirmar para apagar de verdade:');
    console.log('   node prisma/limpar-dados.js --confirmar');
    return;
  }

  // Analises primeiro: elas apontam para Lote.
  await prisma.analise.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.fichaEmbalagem.deleteMany();
  await prisma.coletaAmostra.deleteMany();
  await prisma.log.deleteMany();

  // Reinicia a contagem dos IDs para o sistema começar do 1.
  for (const tabela of ['Analise', 'Lote', 'FichaEmbalagem', 'ColetaAmostra', 'Log']) {
    try {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${tabela}_id_seq" RESTART WITH 1;`);
    } catch (e) {
      console.warn(`  (não deu para reiniciar a sequência de ${tabela}: ${e?.message})`);
    }
  }

  console.log('\n✅ Dados operacionais apagados. Usuários preservados:', antes.usuarios);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
