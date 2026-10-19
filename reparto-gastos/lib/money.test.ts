import { describe, expect, it } from "vitest";
import { formatCents, parseAmountToCents } from "./money";

/** Intl usa espacios duros (U+00A0) antes del símbolo €. */
const plain = (text: string) => text.replace(/\s/g, " ");

describe("parseAmountToCents", () => {
  it.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12.50", 1250],
    ["0,01", 1],
    ["999999999,99", 99_999_999_999],
  ])("%s → %i céntimos", (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each(["", " ", "12,", ",5", "12,345", "1.000,00", "+5", "Infinity", "NaN", "1234567890"])(
    "rechaza %j",
    (input) => {
      expect(parseAmountToCents(input)).toBeNull();
    },
  );
});

describe("formatCents", () => {
  it("formatea céntimos como euros en es-ES", () => {
    expect(plain(formatCents(1250))).toBe("12,50 €");
    expect(plain(formatCents(1))).toBe("0,01 €");
    expect(plain(formatCents(0))).toBe("0,00 €");
  });

  it("muestra el signo en importes negativos (balances deudores)", () => {
    expect(plain(formatCents(-500))).toBe("-5,00 €");
  });
});
