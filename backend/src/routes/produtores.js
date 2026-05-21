const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { requirePerfil } = require('../middleware/perfil');

const router = express.Router();
router.use(auth);

const produtorSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  cidade: z.string().min(1, 'Cidade obrigatória'),
  telefone: z.string().min(1, 'Telefone obrigatório'),
});

// GET: todos os perfis podem listar (necessário para dropdowns)
router.get('/', async (_req, res) => {
  try {
    const produtores = await prisma.produtor.findMany({ orderBy: { nome: 'asc' } });
    return res.json(produtores);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar produtores' });
  }
});

// POST, PUT, DELETE: apenas COMPRAS gerencia produtores
router.post('/', requirePerfil('COMPRAS'), async (req, res) => {
  try {
    const data = produtorSchema.parse(req.body);
    const existe = await prisma.produtor.findUnique({ where: { nome: data.nome } });
    if (existe) return res.status(409).json({ error: 'Já existe um produtor com esse nome' });
    const produtor = await prisma.produtor.create({ data });
    return res.status(201).json(produtor);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    return res.status(500).json({ error: 'Erro ao cadastrar produtor' });
  }
});

router.put('/:id', requirePerfil('COMPRAS'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = produtorSchema.parse(req.body);
    const existeOutro = await prisma.produtor.findFirst({
      where: { nome: data.nome, id: { not: id } },
    });
    if (existeOutro) return res.status(409).json({ error: 'Já existe outro produtor com esse nome' });
    const produtor = await prisma.produtor.update({ where: { id }, data });
    return res.json(produtor);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Produtor não encontrado' });
    return res.status(500).json({ error: 'Erro ao atualizar produtor' });
  }
});

router.delete('/:id', requirePerfil('COMPRAS'), async (req, res) => {
  try {
    await prisma.produtor.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Produtor não encontrado' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Produtor possui análises ou coletas vinculadas' });
    return res.status(500).json({ error: 'Erro ao excluir produtor' });
  }
});

module.exports = router;
