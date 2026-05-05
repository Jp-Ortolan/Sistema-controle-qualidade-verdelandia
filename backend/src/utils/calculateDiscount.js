function calculateDiscount(stickPercent) {
  if (stickPercent <= 2.5) {
    return 0;
  }
  const discount = (stickPercent - 2.5) * 0.5;
  return Number(discount.toFixed(2));
}

module.exports = { calculateDiscount };
