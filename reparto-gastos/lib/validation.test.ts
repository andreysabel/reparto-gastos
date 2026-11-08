import { describe, expect, it } from "vitest";
import { normalizeText, parseMemberList, sameName } from "./validation";

describe("normalizeText", () => {
  it("recorta y colapsa espacios", () => {
    expect(normalizeText("  Ana   María \n")).toBe("Ana María");
  });

  it("devuelve cadena vacía si el campo no es texto", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(new File([], "x.txt"))).toBe("");
  });
});

describe("parseMemberList", () => {
  it("separa por comas y saltos de línea", () => {
    expect(parseMemberList("Ana, Luis\nEva")).toEqual(["Ana", "Luis", "Eva"]);
  });

  it("descarta vacíos y duplicados ignorando mayúsculas, conservando el primero", () => {
    expect(parseMemberList("Ana,, ana ,LUIS,luis,\n")).toEqual(["Ana", "LUIS"]);
  });

  it("devuelve lista vacía si no hay nombres", () => {
    expect(parseMemberList("")).toEqual([]);
    expect(parseMemberList(" , \n ")).toEqual([]);
  });
});

describe("sameName", () => {
  it("ignora mayúsculas pero no tildes", () => {
    expect(sameName("Ana", "ANA")).toBe(true);
    expect(sameName("Jose", "José")).toBe(false);
    expect(sameName("Ana", "Eva")).toBe(false);
  });
});
