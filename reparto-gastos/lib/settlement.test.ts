import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  computeBalances,
  settle,
  simplifyDebts,
  splitEvenly,
  type MemberBalance,
  type Transfer,
} from "./settlement.ts";
import { parseAmountToCents } from "./money.ts";

/** Aplica las transferencias a los balances: todo debe quedar a 0. */
function applyTransfers(balances: MemberBalance[], transfers: Transfer[]) {
  const result = new Map(balances.map((b) => [b.member, b.balance]));
  for (const t of transfers) {
    result.set(t.from, (result.get(t.from) ?? 0) + t.amount);
    result.set(t.to, (result.get(t.to) ?? 0) - t.amount);
  }
  return result;
}

describe("splitEvenly", () => {
  it("quien paga asume los céntimos indivisibles", () => {
    const shares = splitEvenly(12500, ["Luis", "Carla", "Efrain"], "Carla");
    assert.deepEqual(Object.fromEntries(shares), {
      Luis: 4166,
      Carla: 4168,
      Efrain: 4166,
    });
  });

  it("si quien paga no participa, el sobrante va céntimo a céntimo", () => {
    const shares = splitEvenly(1000, ["Ana", "Luis", "Eva"], "Marta");
    assert.deepEqual([...shares.values()], [334, 333, 333]);
  });

  it("la suma de las partes es siempre el importe original", () => {
    for (let amount = 1; amount < 500; amount += 7) {
      for (let n = 1; n <= 7; n++) {
        const members = Array.from({ length: n }, (_, k) => `m${k}`);
        const sum = [...splitEvenly(amount, members, members[n - 1]).values()].reduce(
          (a, b) => a + b,
          0,
        );
        assert.equal(sum, amount);
      }
    }
  });

  it("rechaza importes no enteros o sin participantes", () => {
    assert.throws(() => splitEvenly(10.5, ["Ana"]), RangeError);
    assert.throws(() => splitEvenly(100, []), RangeError);
  });
});

describe("computeBalances", () => {
  it("balance = pagado − consumido y la suma total es 0", () => {
    const balances = computeBalances(
      ["Ana", "Luis", "Eva"],
      [
        { amount: 3000, paidBy: "Ana", splitAmong: ["Ana", "Luis", "Eva"] },
        { amount: 1000, paidBy: "Luis", splitAmong: ["Luis", "Eva"] },
      ],
    );
    assert.deepEqual(balances, [
      { member: "Ana", balance: 2000 },
      { member: "Luis", balance: -500 },
      { member: "Eva", balance: -1500 },
    ]);
  });

  it("todos los deudores deben lo mismo aunque el importe no sea divisible", () => {
    // Regresión: 125,00 € / 3 daba 41,67 € a Luis y 41,66 € a Efrain.
    const { transfers } = settle(
      ["Luis", "Carla", "Efrain"],
      [{ amount: 12500, paidBy: "Carla", splitAmong: ["Luis", "Carla", "Efrain"] }],
    );
    assert.deepEqual(transfers, [
      { from: "Efrain", to: "Carla", amount: 4166 },
      { from: "Luis", to: "Carla", amount: 4166 },
    ]);
  });

  it("incluye miembros sin gastos con balance 0", () => {
    assert.deepEqual(computeBalances(["Ana", "Luis"], []), [
      { member: "Ana", balance: 0 },
      { member: "Luis", balance: 0 },
    ]);
  });
});

describe("simplifyDebts", () => {
  it("salda una cadena A→B→C con una única transferencia", () => {
    const transfers = simplifyDebts([
      { member: "A", balance: -1000 },
      { member: "B", balance: 0 },
      { member: "C", balance: 1000 },
    ]);
    assert.deepEqual(transfers, [{ from: "A", to: "C", amount: 1000 }]);
  });

  it("empareja al mayor deudor con el mayor acreedor", () => {
    const transfers = simplifyDebts([
      { member: "Ana", balance: 2000 },
      { member: "Luis", balance: -500 },
      { member: "Eva", balance: -1500 },
    ]);
    assert.deepEqual(transfers, [
      { from: "Eva", to: "Ana", amount: 1500 },
      { from: "Luis", to: "Ana", amount: 500 },
    ]);
  });

  it("no genera transferencias si todo está saldado", () => {
    assert.deepEqual(simplifyDebts([{ member: "A", balance: 0 }]), []);
    assert.deepEqual(simplifyDebts([]), []);
  });

  it("rechaza balances que no suman 0", () => {
    assert.throws(
      () => simplifyDebts([{ member: "A", balance: 1 }]),
      RangeError,
    );
  });

  it("propiedad: salda todo con como mucho n − 1 transferencias", () => {
    let seed = 42;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31);

    for (let round = 0; round < 200; round++) {
      const members = Array.from({ length: 2 + (random() % 8) }, (_, k) => `m${k}`);
      const expenses = Array.from({ length: random() % 15 }, () => ({
        amount: 1 + (random() % 50_000),
        paidBy: members[random() % members.length],
        splitAmong: members.filter(() => random() % 3 !== 0).concat(members[0]),
      }));

      const { balances, transfers } = settle(members, expenses);

      assert.ok(transfers.length <= members.length - 1);
      for (const t of transfers) {
        assert.ok(Number.isInteger(t.amount) && t.amount > 0);
      }
      for (const value of applyTransfers(balances, transfers).values()) {
        assert.equal(value, 0);
      }
    }
  });
});

describe("parseAmountToCents", () => {
  it("convierte texto a céntimos sin coma flotante", () => {
    assert.equal(parseAmountToCents("12"), 1200);
    assert.equal(parseAmountToCents("12,5"), 1250);
    assert.equal(parseAmountToCents("0.10"), 10);
    assert.equal(parseAmountToCents(" 19.99 "), 1999);
  });

  it("rechaza formatos inválidos, cero y negativos", () => {
    for (const input of ["", "abc", "1.234", "-5", "0", "0,00", "1e3"]) {
      assert.equal(parseAmountToCents(input), null, input);
    }
  });
});
