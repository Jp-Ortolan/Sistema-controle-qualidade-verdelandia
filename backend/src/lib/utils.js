function buildDateRange(inicio, fim) {
  if (!inicio && !fim) return undefined;
  const range = {};
  if (inicio) range.gte = new Date(inicio);
  if (fim) { const d = new Date(fim); d.setHours(23, 59, 59, 999); range.lte = d; }
  return range;
}

const LOTE_INCLUDE = { lote: { select: { codigo: true, produto: true } } };

module.exports = { buildDateRange, LOTE_INCLUDE };
