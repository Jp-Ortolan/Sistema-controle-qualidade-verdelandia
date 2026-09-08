const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePermissao } = require('../middleware/permissao');
const { auditLog } = require('../lib/logger');
const {
  RECURSOS, ACOES, ROTULOS, PRESETS, PERFIS, resolver, normalizar,
} = require('../lib/permissoes');
const { enviarPlanilha, dataBR, texto } = require('../lib/excel');

const router = express.Router();
router.use(auth);

const SELECT = {
  id: true, nome: true, email: true, perfil: true,
  ativo: true, permissoes: true, createdAt: true,
};

// Devolve o usuario com as permissoes ja resolvidas (preset do perfil ou as proprias).
function serializar(u) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    ativo: u.ativo !== false,
    permissoesCustom: u.permissoes != null,
    permissoes: resolver(u),
    createdAt: u.createdAt,
  };
}

// Quantos usuarios ativos ainda conseguem administrar usuarios (fora o id informado).
// Serve para nao deixar o sistema sem ninguem capaz de gerenciar acessos.
async function outrosAdministradores(exceptId) {
  const ativos = await prisma.user.findMany({ where: { ativo: true }, select: SELECT });
  return ativos.filter((u) => u.id !== exceptId && resolver(u).usuarios.write === true).length;
}

const perfilSchema = z.string().refine((v) => PERFIS.includes(v), 'Perfil inválido');
const permissoesSchema = z.record(z.record(z.boolean())).nullable().optional();
const senhaSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa');

const criarSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(80, 'Nome deve ter no máximo 80 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: senhaSchema,
  perfil: perfilSchema,
  ativo: z.boolean().optional(),
  permissoes: permissoesSchema,
});

const editarSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(80, 'Nome deve ter no máximo 80 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: senhaSchema.optional().nullable(),
  perfil: perfilSchema,
  permissoes: permissoesSchema,
});

// ── Metadados para montar a tela (abas, acoes, perfis e presets) ─────────
router.get('/opcoes', requirePermissao('usuarios', 'view'), (_req, res) => {
  return res.json({ recursos: RECURSOS, acoes: ACOES, rotulos: ROTULOS, perfis: PERFIS, presets: PRESETS });
});

// ── Exportar Excel ───────────────────────────────────────────────────────
router.get('/exportar', requirePermissao('usuarios', 'export'), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' }, select: SELECT });

    const abas = (u) => {
      const p = resolver(u);
      const liberadas = RECURSOS.filter((r) => p[r].view).map((r) => ROTULOS[r]);
      return liberadas.length ? liberadas.join(', ') : 'Nenhuma';
    };
    const podeEditar = (u) => {
      const p = resolver(u);
      return RECURSOS.filter((r) => p[r].write).map((r) => ROTULOS[r]).join(', ') || '—';
    };

    const ativos = users.filter((u) => u.ativo !== false).length;

    return enviarPlanilha(res, {
      titulo: 'Relatório de Usuários e Permissões de Acesso',
      nomeAba: 'Usuários',
      colunas: [
        { titulo: 'Nome',                  chave: 'nome',      largura: 28, tipo: 'texto' },
        { titulo: 'E-mail',                chave: 'email',     largura: 30, tipo: 'texto' },
        { titulo: 'Perfil',                chave: 'perfil',    largura: 22, tipo: 'texto' },
        { titulo: 'Situação',              chave: 'situacao',  largura: 12, tipo: 'texto' },
        { titulo: 'Abas que pode ver',     chave: 'ver',       largura: 46, tipo: 'texto' },
        { titulo: 'Abas que pode editar',  chave: 'editar',    largura: 40, tipo: 'texto' },
        { titulo: 'Acesso personalizado',  chave: 'custom',    largura: 20, tipo: 'texto' },
        { titulo: 'Cadastrado em',         chave: 'criadoEm',  largura: 18, tipo: 'datahora' },
      ],
      linhas: users.map((u) => ({
        nome: texto(u.nome),
        email: texto(u.email),
        perfil: texto(u.perfil),
        situacao: u.ativo === false ? 'Inativo' : 'Ativo',
        ver: abas(u),
        editar: podeEditar(u),
        custom: u.permissoes != null ? 'Sim' : 'Não (padrão do perfil)',
        criadoEm: dataBR(u.createdAt),
      })),
      resumo: [['Usuários ativos', ativos], ['Usuários inativos', users.length - ativos]],
    }, 'usuarios-scq.xlsx');
  } catch (err) {
    console.error('[usuarios/excel]', err?.message);
    return res.status(500).json({ error: 'Erro ao exportar usuários' });
  }
});

// ── Listar ───────────────────────────────────────────────────────────────
router.get('/', requirePermissao('usuarios', 'view'), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' }, select: SELECT });
    return res.json({ data: users.map(serializar), total: users.length });
  } catch (e) {
    console.error('[usuarios/list]', e?.message ?? e);
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// ── Criar ────────────────────────────────────────────────────────────────
router.post('/', requirePermissao('usuarios', 'write'), async (req, res) => {
  try {
    const d = criarSchema.parse(req.body);
    const email = d.email.trim().toLowerCase();

    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) return res.status(409).json({ error: 'Já existe um usuário com esse e-mail' });

    const user = await prisma.user.create({
      data: {
        nome: d.nome.trim(),
        email,
        senhaHash: await bcrypt.hash(d.senha, 10),
        perfil: d.perfil,
        ativo: d.ativo !== false,
        permissoes: d.permissoes ? JSON.stringify(normalizar(d.permissoes)) : null,
      },
      select: SELECT,
    });

    auditLog(req, 'CRIAR', 'USUARIO', user.id, { email: user.email, perfil: user.perfil });
    return res.status(201).json(serializar(user));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('[usuarios/create]', err?.message ?? err);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// ── Editar (dados, perfil, permissoes e senha opcional) ──────────────────
router.put('/:id', requirePermissao('usuarios', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const d = editarSchema.parse(req.body);
    const email = d.email.trim().toLowerCase();

    const alvo = await prisma.user.findUnique({ where: { id }, select: SELECT });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });

    const emailEmUso = await prisma.user.findFirst({ where: { email, id: { not: id } } });
    if (emailEmUso) return res.status(409).json({ error: 'Já existe outro usuário com esse e-mail' });

    const novasPermissoes = d.permissoes ? normalizar(d.permissoes) : null;

    // Nao deixa o proprio admin tirar o proprio acesso a gestao de usuarios.
    const perdeGestao = novasPermissoes
      ? novasPermissoes.usuarios.write !== true
      : PRESETS[d.perfil]?.usuarios?.write !== true;
    if (perdeGestao && alvo.ativo !== false && resolver(alvo).usuarios.write === true) {
      if ((await outrosAdministradores(id)) === 0) {
        return res.status(400).json({
          error: 'Este é o único usuário que pode gerenciar acessos. Dê essa permissão a outro antes de tirar deste.',
        });
      }
    }

    const data = {
      nome: d.nome.trim(),
      email,
      perfil: d.perfil,
      permissoes: novasPermissoes ? JSON.stringify(novasPermissoes) : null,
    };
    if (d.senha) data.senhaHash = await bcrypt.hash(d.senha, 10);

    const user = await prisma.user.update({ where: { id }, data, select: SELECT });
    auditLog(req, 'EDITAR', 'USUARIO', user.id, {
      email: user.email, perfil: user.perfil, senhaAlterada: Boolean(d.senha),
    });
    return res.json(serializar(user));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado' });
    console.error('[usuarios/update]', err?.message ?? err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// ── Ativar / inativar ────────────────────────────────────────────────────
router.patch('/:id/ativo', requirePermissao('usuarios', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { ativo } = z.object({ ativo: z.boolean() }).parse(req.body);

    if (id === req.user.id && ativo === false) {
      return res.status(400).json({ error: 'Você não pode inativar o próprio usuário' });
    }

    const alvo = await prisma.user.findUnique({ where: { id }, select: SELECT });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (ativo === false && resolver(alvo).usuarios.write === true) {
      if ((await outrosAdministradores(id)) === 0) {
        return res.status(400).json({
          error: 'Este é o único usuário que pode gerenciar acessos. Não dá para inativá-lo.',
        });
      }
    }

    const user = await prisma.user.update({ where: { id }, data: { ativo }, select: SELECT });
    auditLog(req, ativo ? 'ATIVAR' : 'INATIVAR', 'USUARIO', user.id, { email: user.email });
    return res.json(serializar(user));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado' });
    console.error('[usuarios/ativo]', err?.message ?? err);
    return res.status(500).json({ error: 'Erro ao alterar situação do usuário' });
  }
});

// ── Redefinir senha ──────────────────────────────────────────────────────
router.put('/:id/senha', requirePermissao('usuarios', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { senha } = z.object({ senha: senhaSchema }).parse(req.body);
    const user = await prisma.user.update({
      where: { id },
      data: { senhaHash: await bcrypt.hash(senha, 10) },
      select: SELECT,
    });
    auditLog(req, 'REDEFINIR_SENHA', 'USUARIO', user.id, { email: user.email });
    return res.json(serializar(user));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado' });
    console.error('[usuarios/senha]', err?.message ?? err);
    return res.status(500).json({ error: 'Erro ao redefinir a senha' });
  }
});

// ── Excluir ──────────────────────────────────────────────────────────────
router.delete('/:id', requirePermissao('usuarios', 'delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir o próprio usuário' });
    }

    const alvo = await prisma.user.findUnique({ where: { id }, select: SELECT });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (alvo.ativo !== false && resolver(alvo).usuarios.write === true) {
      if ((await outrosAdministradores(id)) === 0) {
        return res.status(400).json({
          error: 'Este é o único usuário que pode gerenciar acessos. Não dá para excluí-lo.',
        });
      }
    }

    await prisma.user.delete({ where: { id } });
    auditLog(req, 'EXCLUIR', 'USUARIO', id, { email: alvo.email });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado' });
    console.error('[usuarios/delete]', err?.message ?? err);
    return res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
