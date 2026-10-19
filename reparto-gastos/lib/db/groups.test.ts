import { MongoServerError, ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { groupsCollection } from "../mongodb";
import { findGroupBySlug, insertGroup, pushMember } from "./groups";

vi.mock("../mongodb", () => ({ groupsCollection: vi.fn() }));

const collection = {
  findOne: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
};

const duplicateKey = () =>
  new MongoServerError({ message: "E11000 duplicate key", code: 11000 });

beforeEach(() => {
  vi.mocked(groupsCollection).mockResolvedValue(
    collection as unknown as Awaited<ReturnType<typeof groupsCollection>>,
  );
});

describe("findGroupBySlug", () => {
  it("no consulta la base de datos si el slug no es válido", async () => {
    expect(await findGroupBySlug("../$where")).toBeNull();
    expect(collection.findOne).not.toHaveBeenCalled();
  });

  it("convierte el documento en un objeto serializable", async () => {
    const _id = new ObjectId();
    collection.findOne.mockResolvedValue({
      _id,
      name: "Piso",
      slug: "piso-abc123",
      members: ["Ana"],
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(await findGroupBySlug("piso-abc123")).toEqual({
      id: _id.toHexString(),
      name: "Piso",
      slug: "piso-abc123",
      members: ["Ana"],
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("devuelve null si no existe", async () => {
    collection.findOne.mockResolvedValue(null);
    expect(await findGroupBySlug("piso-abc123")).toBeNull();
  });
});

describe("insertGroup", () => {
  it("reintenta con otro slug si choca con el índice único", async () => {
    collection.insertOne.mockRejectedValueOnce(duplicateKey()).mockResolvedValueOnce({});

    const group = await insertGroup("Piso", ["Ana"]);

    expect(collection.insertOne).toHaveBeenCalledTimes(2);
    const [first, second] = collection.insertOne.mock.calls.map(([doc]) => doc.slug);
    expect(group).toMatchObject({ name: "Piso", members: ["Ana"], slug: second });
    expect(group.slug).toMatch(/^piso-[a-z0-9]{6}$/);
    expect(first).not.toBe(second);
  });

  it("se rinde tras 5 colisiones seguidas", async () => {
    collection.insertOne.mockRejectedValue(duplicateKey());

    await expect(insertGroup("Piso", [])).rejects.toThrow(/slug único/);
    expect(collection.insertOne).toHaveBeenCalledTimes(5);
  });

  it("propaga otros errores de MongoDB sin reintentar", async () => {
    collection.insertOne.mockRejectedValue(new Error("conexión perdida"));

    await expect(insertGroup("Piso", [])).rejects.toThrow("conexión perdida");
    expect(collection.insertOne).toHaveBeenCalledOnce();
  });
});

describe("pushMember", () => {
  it("usa un filtro atómico que evita duplicados concurrentes", async () => {
    collection.updateOne.mockResolvedValue({ modifiedCount: 1 });

    expect(await pushMember("piso-abc123", "Eva")).toBe(true);
    expect(collection.updateOne).toHaveBeenCalledWith(
      { slug: "piso-abc123", members: { $ne: "Eva" } },
      { $push: { members: "Eva" } },
    );
  });

  it("devuelve false si no se modificó nada", async () => {
    collection.updateOne.mockResolvedValue({ modifiedCount: 0 });
    expect(await pushMember("piso-abc123", "Ana")).toBe(false);
  });
});
