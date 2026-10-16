import "server-only";
import { io } from "next/cache";
import { MongoClient, type Collection, type Db } from "mongodb";
import type { ExpenseDoc, GroupDoc } from "./types";

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB ?? "reparto-gastos";

/**
 * Un único MongoClient por proceso. Se guarda en globalThis para que el
 * hot reload de `next dev` no abra una conexión nueva en cada recarga.
 */
const globalForMongo = globalThis as typeof globalThis & {
  _mongo?: { client: Promise<MongoClient>; indexes?: Promise<void> };
};

const mongo = (globalForMongo._mongo ??= {
  client: new MongoClient(uri).connect(),
});

/**
 * Índices recomendados (idempotentes: createIndex no hace nada si ya existen).
 *
 * - groups.slug único: búsqueda por URL y garantía de que no hay dos grupos
 *   con el mismo slug (el insert falla con E11000 y se reintenta).
 * - expenses { groupId, createdAt: -1 }: cubre "gastos de un grupo, los más
 *   recientes primero", que es la única consulta sobre gastos.
 */
async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db
      .collection<GroupDoc>("groups")
      .createIndex({ slug: 1 }, { unique: true, name: "slug_unique" }),
    db
      .collection<ExpenseDoc>("expenses")
      .createIndex(
        { groupId: 1, createdAt: -1 },
        { name: "groupId_createdAt" },
      ),
  ]);
}

export async function getDb(): Promise<Db> {
  // Next.js no reconoce el driver de MongoDB como E/S dinámica, y el driver
  // usa `new Date()` internamente. Con Cache Components eso rompe el
  // prerender; io() lo suspende aquí. En peticiones reales, Server Actions
  // y Route Handlers se resuelve al instante.
  await io();
  const db = (await mongo.client).db(dbName);
  await (mongo.indexes ??= ensureIndexes(db));
  return db;
}

export async function groupsCollection(): Promise<Collection<GroupDoc>> {
  return (await getDb()).collection<GroupDoc>("groups");
}

export async function expensesCollection(): Promise<Collection<ExpenseDoc>> {
  return (await getDb()).collection<ExpenseDoc>("expenses");
}
