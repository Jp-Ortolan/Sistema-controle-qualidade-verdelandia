// Seed do SCQ.
// ATENCAO: este script roda a cada deploy no Railway (railway.toml > preDeployCommands),
// por isso ele NAO cria mais dados de demonstracao - senao lotes/analises/fichas de teste
// voltariam a aparecer no sistema toda vez que subisse uma versao nova.
// Ele so garante que os usuarios de acesso existam.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const USUARIOS = [
  { email: 'admin@scq.com',    nome: 'Administrador do Sistema', perfil: 'ADMIN',    senha: '123456' },
  { email: 'analista@scq.com', nome: 'Analista de Qualidade',    perfil: 'ANALISTA', senha: '123456' },
  { email: 'compras@scq.com',  nome: 'Setor de Compras',         perfil: 'COMPRAS',  senha: '123456' },
  { email: 'gestor@scq.com',   nome: 'Gestor da Qualidade',      perfil: 'GESTOR',   senha: '123456' },
];

async function main() {
  for (const u of USUARIOS) {
    const existente = await prisma.user.findUnique({ where: { email: u.email } });

    if (!existente) {
      await prisma.user.create({
        data: {
          nome: u.nome,
          email: u.email,
          senhaHash: await bcrypt.hash(u.senha, 10),
          perfil: u.perfil,
          ativo: true,
          permissoes: null, // null = usa as permissoes padrao do perfil
        },
      });
      console.log(`+ usuário criado: ${u.email} (${u.perfil})`);
      continue;
    }

    // Usuario ja existe: nao mexe em senha, perfil nem permissoes,
    // para nao desfazer o que o administrador configurou pela tela.
    if (!existente.nome) {
      await prisma.user.update({ where: { email: u.email }, data: { nome: u.nome } });
      console.log(`~ nome preenchido: ${u.email}`);
    } else {
      console.log(`= usuário já existe: ${u.email}`);
    }
  }

  console.log('\n✅ Seed concluído (somente usuários).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
