const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { ConformityStatus, UserRole } = require("@prisma/client");
const { prisma } = require("./config/prisma");
const { jwtSecret } = require("./config/env");
const { ensureAuth, allowRoles } = require("./middlewares/auth");
const { loginLimiter } = require("./middlewares/rate-limiters");
const { calculateDiscount } = require("./utils/calculateDiscount");

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const optionalIsoDate = z
  .string()
  .max(40)
  .optional()
  .transform((s) => (s && String(s).trim() !== "" ? String(s).trim() : undefined))
  .refine((s) => s === undefined || !Number.isNaN(Date.parse(s)), { message: "Data inválida." });

function buildCreatedAtFilter(from, to) {
  if (!from && !to) {
    return undefined;
  }
  return {
    gte: from ? new Date(from) : undefined,
    lte: to ? new Date(to) : undefined,
  };
}

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const body = z
    .object({
      email: z
        .string()
        .max(320)
        .transform((s) => String(s ?? "").trim().toLowerCase())
        .pipe(z.string().min(3).max(254).email()),
      password: z.string().min(8).max(128),
    })
    .parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const validPassword = await bcrypt.compare(body.password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, sub: String(user.id) },
    jwtSecret,
    { expiresIn: "8h", algorithm: "HS256" },
  );

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.get("/auth/me", ensureAuth, (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

router.get("/producers", ensureAuth, async (_req, res) => {
  const producers = await prisma.producer.findMany({ orderBy: { name: "asc" } });
  res.json(producers);
});

router.post("/producers", ensureAuth, allowRoles(UserRole.ANALISTA), async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(3).max(120),
      city: z.string().trim().min(2).max(120),
      phone: z.string().trim().min(8).max(40),
    })
    .parse(req.body);

  const producer = await prisma.producer.create({ data: body });
  res.status(201).json(producer);
});

router.post("/analyses", ensureAuth, allowRoles(UserRole.ANALISTA), async (req, res) => {
  const body = z
    .object({
      producerId: z.number().int().positive().max(1_000_000_000),
      stickPercent: z.number().min(0).max(100),
    })
    .parse(req.body);

  const discountPercent = calculateDiscount(body.stickPercent);
  const analysis = await prisma.analysis.create({
    data: {
      producerId: body.producerId,
      stickPercent: body.stickPercent,
      discountPercent,
      createdById: req.user.id,
    },
    include: { producer: true },
  });

  res.status(201).json(analysis);
});

router.get("/analyses", ensureAuth, async (req, res) => {
  const query = paginationSchema
    .extend({
      producerId: z.coerce.number().int().positive().max(1_000_000_000).optional(),
      from: optionalIsoDate,
      to: optionalIsoDate,
    })
    .parse(req.query);

  const createdAt = buildCreatedAtFilter(query.from, query.to);
  const where = {
    producerId: query.producerId,
    ...(createdAt ? { createdAt } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.analysis.count({ where }),
    prisma.analysis.findMany({
      where,
      include: { producer: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({ items, total, page: query.page, pageSize: query.pageSize });
});

router.post("/packaging-sheets", ensureAuth, allowRoles(UserRole.ANALISTA), async (req, res) => {
  const paramSchema = z.object({
    name: z.string().trim().min(2).max(80),
    result: z.string().trim().min(1).max(120),
    unit: z.string().trim().min(1).max(40),
    standard: z.string().trim().min(1).max(120),
    status: z.enum(ConformityStatus),
  });

  const body = z
    .object({
      lot: z.string().trim().min(2).max(80),
      supplier: z.string().trim().min(2).max(120),
      observations: z.string().trim().max(5000).optional(),
      parameters: z.array(paramSchema).length(4),
    })
    .parse(req.body);

  const observations =
    body.observations !== undefined && body.observations !== "" ? body.observations : undefined;

  const overallStatus = body.parameters.some((param) => param.status === "NC") ? "NC" : "C";
  const sheet = await prisma.packagingSheet.create({
    data: {
      lot: body.lot,
      supplier: body.supplier,
      observations,
      overallStatus,
      createdById: req.user.id,
      parameters: { create: body.parameters },
    },
    include: { parameters: true },
  });

  res.status(201).json(sheet);
});

router.get("/packaging-sheets", ensureAuth, async (req, res) => {
  const query = paginationSchema
    .extend({
      status: z.enum(ConformityStatus).optional(),
      from: optionalIsoDate,
      to: optionalIsoDate,
    })
    .parse(req.query);

  const createdAt = buildCreatedAtFilter(query.from, query.to);
  const where = {
    overallStatus: query.status,
    ...(createdAt ? { createdAt } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.packagingSheet.count({ where }),
    prisma.packagingSheet.findMany({
      where,
      include: { parameters: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({ items, total, page: query.page, pageSize: query.pageSize });
});

router.post("/sample-collections", ensureAuth, allowRoles(UserRole.ANALISTA), async (req, res) => {
  const body = z
    .object({
      productType: z.string().trim().min(2).max(200),
      destination: z.string().trim().min(2).max(200),
      notes: z.string().trim().max(5000).optional(),
    })
    .parse(req.body);

  const notes = body.notes !== undefined && body.notes !== "" ? body.notes : undefined;

  const item = await prisma.sampleCollection.create({
    data: {
      productType: body.productType,
      destination: body.destination,
      notes,
      createdById: req.user.id,
    },
  });

  res.status(201).json(item);
});

router.get("/sample-collections", ensureAuth, async (req, res) => {
  const query = paginationSchema
    .extend({
      productType: z.string().trim().max(120).optional(),
      destination: z.string().trim().max(120).optional(),
      from: optionalIsoDate,
      to: optionalIsoDate,
    })
    .parse(req.query);

  const createdAt = buildCreatedAtFilter(query.from, query.to);
  const where = {
    productType: query.productType ? { contains: query.productType } : undefined,
    destination: query.destination ? { contains: query.destination } : undefined,
    ...(createdAt ? { createdAt } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.sampleCollection.count({ where }),
    prisma.sampleCollection.findMany({
      where,
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({ items, total, page: query.page, pageSize: query.pageSize });
});

module.exports = { router };
