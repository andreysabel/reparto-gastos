import { describe, expect, it } from "vitest";
import { generateGroupSlug, slugify, SLUG_PATTERN } from "./slug";

describe("slugify", () => {
  it.each([
    ["Viaje a Lisboa 2026!", "viaje-a-lisboa-2026"],
    ["  Cañas & Tapas  ", "canas-tapas"],
    ["Ñandú Café", "nandu-cafe"],
    ["---", ""],
    ["🍕🍕", ""],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("limita la longitud a 40 caracteres", () => {
    expect(slugify("a".repeat(100))).toHaveLength(40);
  });
});

describe("generateGroupSlug", () => {
  it("añade un sufijo aleatorio de 6 caracteres al nombre", () => {
    expect(generateGroupSlug("Viaje a Lisboa")).toMatch(/^viaje-a-lisboa-[a-z0-9]{6}$/);
  });

  it("usa 'grupo' cuando el nombre no tiene caracteres válidos", () => {
    expect(generateGroupSlug("🎉")).toMatch(/^grupo-[a-z0-9]{6}$/);
  });

  it("genera slugs distintos para el mismo nombre", () => {
    const slugs = new Set(Array.from({ length: 200 }, () => generateGroupSlug("Piso")));
    expect(slugs.size).toBe(200);
  });

  it("propiedad: el slug generado siempre es aceptado al buscar el grupo", () => {
    // Si no, la redirección tras crear el grupo acabaría en un 404.
    for (let i = 0; i < 2000; i++) {
      expect(generateGroupSlug("Viaje a Lisboa 2026")).toMatch(SLUG_PATTERN);
    }
  });
});
