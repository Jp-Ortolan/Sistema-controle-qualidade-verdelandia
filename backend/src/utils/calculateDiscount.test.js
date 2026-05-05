const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { calculateDiscount } = require("./calculateDiscount");

describe("calculateDiscount", () => {
  it("retorna 0 quando palha <= 2,5%", () => {
    assert.equal(calculateDiscount(0), 0);
    assert.equal(calculateDiscount(2.5), 0);
  });

  it("aplica (palha - 2,5) * 0,5 acima do limiar", () => {
    assert.equal(calculateDiscount(3), 0.25);
    assert.equal(calculateDiscount(10), 3.75);
  });

  it("arredonda o desconto a duas casas decimais", () => {
    assert.equal(calculateDiscount(4.333), 0.92);
  });
});
