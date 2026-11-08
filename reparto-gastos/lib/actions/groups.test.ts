import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { findGroupBySlug, insertGroup, pushMember } from "../db/groups";
import { publish } from "../realtime/event-bus";
import type { ActionState, Group } from "../types";
import { addMember, createGroup } from "./groups";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  // Igual que Next: redirect() corta la ejecución lanzando una excepción.
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("../db/groups", () => ({
  findGroupBySlug: vi.fn(),
  insertGroup: vi.fn(),
  pushMember: vi.fn(),
}));
vi.mock("../realtime/event-bus", () => ({ publish: vi.fn() }));

const GROUP: Group = {
  id: "65f000000000000000000001",
  name: "Piso",
  slug: "piso-abc123",
  members: ["Ana", "Luis"],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const idle: ActionState = { status: "idle" };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

describe("createGroup", () => {
  it("crea el grupo con los miembros iniciales y redirige a su página", async () => {
    vi.mocked(insertGroup).mockResolvedValue(GROUP);

    await expect(
      createGroup(idle, form({ name: "  Piso  ", members: "Ana, Luis, ana" })),
    ).rejects.toThrow("NEXT_REDIRECT:/group/piso-abc123");

    expect(insertGroup).toHaveBeenCalledWith("Piso", ["Ana", "Luis"]);
    expect(redirect).toHaveBeenCalledWith("/group/piso-abc123");
  });

  it("permite crear un grupo sin miembros", async () => {
    vi.mocked(insertGroup).mockResolvedValue(GROUP);

    await expect(createGroup(idle, form({ name: "Piso" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(insertGroup).toHaveBeenCalledWith("Piso", []);
  });

  it.each([
    ["no tiene nombre", { name: "  " }, /necesita un nombre/],
    ["el nombre es demasiado largo", { name: "x".repeat(41) }, /40 caracteres/],
    ["un miembro tiene un nombre demasiado largo", { name: "Piso", members: "x".repeat(41) }, /miembro/],
  ])("falla si %s", async (_, fields, message) => {
    const state = await createGroup(idle, form(fields));

    expect(state).toMatchObject({
      status: "error",
      message: expect.stringMatching(message),
      version: 1,
    });
    expect(insertGroup).not.toHaveBeenCalled();
  });
});

describe("addMember", () => {
  beforeEach(() => {
    vi.mocked(findGroupBySlug).mockResolvedValue(GROUP);
    vi.mocked(pushMember).mockResolvedValue(true);
  });

  it("añade el miembro y avisa por SSE", async () => {
    const state = await addMember(GROUP.slug, idle, form({ member: " Eva " }));

    expect(state).toEqual({ status: "success", message: "Eva se ha unido al grupo.", version: 1 });
    expect(pushMember).toHaveBeenCalledWith(GROUP.slug, "Eva");
    expect(publish).toHaveBeenCalledWith(GROUP.slug, { type: "member_added", member: "Eva" });
  });

  it("rechaza nombres repetidos ignorando mayúsculas", async () => {
    const state = await addMember(GROUP.slug, idle, form({ member: "ANA" }));

    expect(state).toMatchObject({ status: "error", message: "ANA ya es miembro del grupo." });
    expect(pushMember).not.toHaveBeenCalled();
  });

  it("rechaza el duplicado si otra petición lo añadió a la vez", async () => {
    vi.mocked(pushMember).mockResolvedValue(false);

    const state = await addMember(GROUP.slug, idle, form({ member: "Eva" }));

    expect(state).toMatchObject({ status: "error", message: "Eva ya es miembro del grupo." });
    expect(publish).not.toHaveBeenCalled();
  });

  it.each([
    ["el nombre está vacío", "   ", /Escribe un nombre/],
    ["el nombre es demasiado largo", "x".repeat(41), /40 caracteres/],
  ])("falla si %s", async (_, member, message) => {
    const state = await addMember(GROUP.slug, idle, form({ member }));
    expect(state).toMatchObject({ status: "error", message: expect.stringMatching(message) });
  });

  it("falla si el grupo no existe", async () => {
    vi.mocked(findGroupBySlug).mockResolvedValue(null);

    const state = await addMember("no-existe", idle, form({ member: "Eva" }));

    expect(state).toMatchObject({ status: "error", message: "El grupo no existe." });
  });
});
