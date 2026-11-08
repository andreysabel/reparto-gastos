// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import { ExpensesList } from "./ExpensesList";

const expense = (overrides: Partial<Expense>): Expense => ({
  id: "e1",
  groupId: "g1",
  description: "Cena",
  amount: 12500,
  paidBy: "Carla",
  splitAmong: ["Luis", "Carla", "Efrain"],
  createdAt: "2026-03-14T20:30:00.000Z",
  ...overrides,
});

const text = (el: Element) => el.textContent!.replace(/\s/g, " ");

describe("ExpensesList", () => {
  it("anima a apuntar el primer gasto si la lista está vacía", () => {
    render(<ExpensesList expenses={[]} memberCount={3} />);
    expect(screen.getByText(/Sin gastos todavía/)).toBeTruthy();
  });

  it("muestra la parte por persona y quién asume el redondeo", () => {
    render(<ExpensesList expenses={[expense({})]} memberCount={3} />);

    const item = text(screen.getByRole("listitem"));
    expect(item).toContain("Pagó Carla · entre todos");
    expect(item).toContain("41,66 € por persona · Carla asume 0,02 € de redondeo");
    expect(item).toContain("125,00 €");
  });

  it("nombra a los participantes si no son todos y omite el redondeo si es exacto", () => {
    render(
      <ExpensesList
        expenses={[expense({ amount: 1000, splitAmong: ["Luis", "Carla"] })]}
        memberCount={3}
      />,
    );

    const item = text(screen.getByRole("listitem"));
    expect(item).toContain("entre Luis, Carla");
    expect(item).toContain("5,00 € por persona");
    expect(item).not.toContain("redondeo");
  });
});
