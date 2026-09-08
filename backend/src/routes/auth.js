const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { resolver } = require('../lib/permissoes');
const auth = require('../middleware/auth');
const { auditLog } = require('../lib/logger');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(senha, user.senhaHash))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }
    if (user.ativo === false) {
      return res.status(403).json({ error: 'Usuário inativo. Procure o administrador do sistema.' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, perfil: user.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({
      token,
      perfil: user.perfil,
      email: user.email,
      nome: user.nome ?? null,
      permissoes: resolver(user),
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('[auth/login]', err?.message ?? err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Trocar a propria senha ───────────────────────────────────────────────
// Qualquer usuario logado pode trocar a SUA senha, informando a senha atual.
// O administrador continua podendo redefinir a senha de qualquer um pela
// tela de Usuarios (rota PUT /api/usuarios/:id/senha), sem precisar da atual.
const trocaSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: z.string()
    .min(6, 'A nova senha deve ter pelo menos 6 caracteres')
    .max(72, 'A nova senha é muito longa'),
});

router.put('/senha', auth, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = trocaSenhaSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (!(await bcrypt.compare(senhaAtual, user.senhaHash))) {
      return res.status(401).json({ error: 'A senha atual está incorreta' });
    }
    if (senhaAtual === novaSenha) {
      return res.status(400).json({ error: 'A nova senha precisa ser diferente da atual' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { senhaHash: await bcrypt.hash(novaSenha, 10) },
    });

    auditLog(req, 'ALTERAR_SENHA', 'USUARIO', user.id, { email: user.email, porConta: 'própria' });
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('[auth/senha]', err?.message ?? err);
    return res.status(500).json({ error: 'Erro ao alterar a senha' });
  }
});

module.exports = router;
