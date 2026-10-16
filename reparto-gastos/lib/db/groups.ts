import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { groupsCollection } from "../mongodb";
import { generateGroupSlug, SLUG_PATTERN } from "../slug";
import type { Group, GroupDoc } from "../types";

export function toGroup(doc: GroupDoc): Group {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    slug: doc.slug,
    members: doc.members,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function findGroupBySlug(slug: string): Promise<Group | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const doc = await (await groupsCollection()).findOne({ slug });
  return doc ? toGroup(doc) : null;
}

const DUPLICATE_KEY = 11000;

/** Inserta el grupo; si el slug choca con el índice único, reintenta. */
export async function insertGroup(
  name: string,
  members: string[],
): Promise<Group> {
  const groups = await groupsCollection();

  for (let attempt = 0; attempt < 5; attempt++) {
    const doc: GroupDoc = {
      _id: new ObjectId(),
      name,
      slug: generateGroupSlug(name),
      members,
      createdAt: new Date(),
    };
    try {
      await groups.insertOne(doc);
      return toGroup(doc);
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("No se pudo generar un slug único para el grupo");
}

/**
 * Añade un miembro de forma atómica. El filtro `members: { $ne: member }`
 * evita duplicados exactos incluso con peticiones concurrentes.
 * Devuelve false si el grupo no existe o el miembro ya estaba.
 */
export async function pushMember(
  slug: string,
  member: string,
): Promise<boolean> {
  const result = await (
    await groupsCollection()
  ).updateOne(
    { slug, members: { $ne: member } },
    { $push: { members: member } },
  );
  return result.modifiedCount === 1;
}
