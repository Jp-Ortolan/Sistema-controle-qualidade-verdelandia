const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

/** Senha de desenvolvimento (mín. 8 caracteres, alinhada à validação da API). Altere em produção. */
const DEV_PASSWORD = "ScqVerde2026!";

async function main() {
  const users = [
    {
      name: "Analista Verdelandia",
      email: "analista@verdelandia.com",
      password: DEV_PASSWORD,
      role: UserRole.ANALISTA,
    },
    {
      name: "Resp. Setor Compras",
      email: "setor.compras@verdelandia.com",
      password: DEV_PASSWORD,
      role: UserRole.COMPRAS,
    },
    {
      name: "Resp. Compra Matéria-Prima",
      email: "compra.materia@verdelandia.com",
      password: DEV_PASSWORD,
      role: UserRole.COMPRA_MATERIA_PRIMA,
    },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
      },
      update: { name: user.name, role: user.role, passwordHash },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
