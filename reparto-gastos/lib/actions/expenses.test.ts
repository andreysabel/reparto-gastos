import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertExpense } from "../db/expenses";
import { findGroupBySlug } from "../db/groups";
import { publish } from "../realtime/event-bus";
import type { ActionState, Expense, Group } from "../types";
import { addExpense } from "./expenses";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../db/groups", () => ({ findGroupBySlug: vi.fn() }));
vi.mock("../db/expenses", () => ({ insertExpense: vi.fn() }));
vi.mock("../realtime/event-bus", () => ({ publish: vi.fn() }));

const GROUP: Group = {
  id: "65f000000000000000000001",
  name: "Piso",
  slug: "piso-abc123",
  members: ["Ana", "Luis", "Eva"],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const idle: ActionState = { status: "idle" };

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of [value].flat()) data.append(key, v);
  }
  return data;
}

const valid = {
  amount: "30,50",
  description: "  Cena   del sábado ",
  paidBy: "Ana",
  splitAmong: ["Eva", "Ana"],
};

beforeEach(() => {
  vi.mocked(findGroupBySlug).mockResolvedValue(GROUP);
  vi.mocked(insertExpense).mockImplementation(
    async (input): Promise<Expense> => ({
      ...input,
      id: "exp1",
      groupId: input.groupId.toHexString(),
      createdAt: "2026-01-02T00:00:00.000Z",
    }),
  );
});

describe("addExpense", () => {
  it("guarda el gasto en céntimos, normalizado y en el orden del grupo", async () => {
    const state = await addExpense(GROUP.slug, idle, form(valid));

    expect(state).toEqual({ status: "success", message: "Gasto añadido.", version: 1 });
    const input = vi.mocked(insertExpense).mock.calls[0][0];
    expect(input).toMatchObject({
      description: "Cena del sábado",
      amount: 3050,
      paidBy: "Ana",
      splitAmong: ["Ana", "Eva"],
    });
    expect(input.groupId.toHexString()).toBe(GROUP.id);
  });

  it("publica expense_added para los clientes SSE", async () => {
    await addExpense(GROUP.slug, idle, form(valid));

    expect(publish).toHaveBeenCalledWith(GROUP.slug, {
      type: "expense_added",
      expense: expect.objectContaining({ id: "exp1", amount: 3050 }),
    });
  });

  it("incrementa la versión respecto al estado anterior", async () => {
    const prev: ActionState = { status: "error", message: "x", version: 4 };
    const state = await addExpense(GROUP.slug, prev, form(valid));
    expect(state).toMatchObject({ status: "success", version: 5 });
  });

  it.each([
    ["el importe no es válido", { amount: "12,345" }, /importe positivo/],
    ["el importe es cero", { amount: "0" }, /importe positivo/],
    ["falta la descripción", { description: "   " }, /descripción/],
    ["la descripción es demasiado larga", { description: "x".repeat(101) }, /100 caracteres/],
    ["el pagador no es miembro", { paidBy: "Intruso" }, /quién ha pagado/],
    ["no hay participantes válidos", { splitAmong: ["Intruso"] }, /al menos un participante/],
  ])("falla si %s", async (_, override, message) => {
    const state = await addExpense(GROUP.slug, idle, form({ ...valid, ...override }));

    expect(state).toMatchObject({ status: "error", message: expect.stringMatching(message) });
    expect(insertExpense).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("falla si el grupo no existe", async () => {
    vi.mocked(findGroupBySlug).mockResolvedValue(null);

    const state = await addExpense("no-existe", idle, form(valid));

    expect(state).toMatchObject({ status: "error", message: "El grupo no existe." });
    expect(insertExpense).not.toHaveBeenCalled();
  });
});
