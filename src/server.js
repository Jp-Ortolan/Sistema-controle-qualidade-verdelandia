const express = require("express");
const path = require("path");
const { readDatabase, writeDatabase } = require("./data/store");

const app = express();
const PORT = 3000;
const BRAND_ASSETS_DIR =
  "C:\\Users\\joaop\\.cursor\\projects\\c-Users-joaop-Documents-Verdelandia-OneDrive-Documentos-Sistema-de-Controle-de-Qualidade\\assets";

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/brand", express.static(BRAND_ASSETS_DIR));

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha sao obrigatorios." });
  }

  const db = readDatabase();
  const user = db.users.find(
    (item) => item.email.toLowerCase() === String(email).toLowerCase().trim()
  );

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Credenciais invalidas." });
  }

  return res.json({
    message: "Login realizado com sucesso.",
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
  });
});

app.get("/api/producers", (_req, res) => {
  const db = readDatabase();
  const ordered = [...db.producers].sort((a, b) => b.id - a.id);
  res.json(ordered);
});

app.post("/api/producers", (req, res) => {
  const { name, city, phone } = req.body;

  if (!name || !city || !phone) {
    return res
      .status(400)
      .json({ message: "Nome, cidade e telefone sao obrigatorios." });
  }

  const db = readDatabase();
  const alreadyExists = db.producers.some(
    (producer) => producer.name.toLowerCase().trim() === name.toLowerCase().trim()
  );

  if (alreadyExists) {
    return res.status(409).json({ message: "Produtor ja cadastrado." });
  }

  const newProducer = {
    id: db.producers.length ? Math.max(...db.producers.map((p) => p.id)) + 1 : 1,
    name: name.trim(),
    city: city.trim(),
    phone: phone.trim(),
    createdAt: new Date().toISOString(),
  };

  db.producers.push(newProducer);
  writeDatabase(db);

  return res.status(201).json({
    message: "Produtor cadastrado com sucesso.",
    producer: newProducer,
  });
});

app.get("/api/analyses", (_req, res) => {
  const db = readDatabase();
  const analyses = [...db.analyses]
    .map((analysis) => {
      const producer = db.producers.find((p) => p.id === analysis.producerId);
      return {
        ...analysis,
        producerName: producer ? producer.name : "Produtor removido",
      };
    })
    .sort((a, b) => b.id - a.id);

  res.json(analyses);
});

app.post("/api/analyses", (req, res) => {
  const { producerId, stickPercent } = req.body;
  const normalizedPercent = Number(stickPercent);
  const normalizedProducer = Number(producerId);

  if (!normalizedProducer || Number.isNaN(normalizedPercent)) {
    return res
      .status(400)
      .json({ message: "Produtor e percentual de palito sao obrigatorios." });
  }

  if (normalizedPercent < 0 || normalizedPercent > 100) {
    return res
      .status(400)
      .json({ message: "Percentual de palito deve estar entre 0 e 100." });
  }

  const db = readDatabase();
  const producer = db.producers.find((p) => p.id === normalizedProducer);

  if (!producer) {
    return res.status(404).json({ message: "Produtor nao encontrado." });
  }

  const newAnalysis = {
    id: db.analyses.length ? Math.max(...db.analyses.map((a) => a.id)) + 1 : 1,
    producerId: normalizedProducer,
    stickPercent: normalizedPercent,
    createdAt: new Date().toISOString(),
  };

  db.analyses.push(newAnalysis);
  writeDatabase(db);

  return res.status(201).json({
    message: "Analise cadastrada com sucesso.",
    analysis: newAnalysis,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor online em http://localhost:${PORT}`);
});
