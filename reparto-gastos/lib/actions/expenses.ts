"use server";

import { revalidatePath } from "next/cache";
import { insertExpense } from "../db/expenses";
import { findGroupBySlug } from "../db/groups";
import { parseAmountToCents } from "../money";
import { publish } from "../realtime/event-bus";
import type { ActionState } from "../types";
import { MAX_DESCRIPTION_LENGTH, normalizeText } from "../validation";
import { ObjectId } from "mongodb";

/**
 * Registra un gasto:
 *  1. Valida importe (→ céntimos), descripción, pagador y participantes
 *     contra los miembros reales del grupo (nunca se confía en el cliente).
 *  2. Lo inserta en `expenses`.
 *  3. Revalida la página del grupo para quien hizo el cambio.
 *  4. Publica `expense_added` para el resto de clientes conectados por SSE.
 */
export async function addExpense(
  slug: string,
  prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const version = prev.status === "idle" ? 1 : prev.version + 1;
  const fail = (message: string): ActionState => ({
    status: "error",
    message,
    version,
  });

  const group = await findGroupBySlug(slug);
  if (!group) return fail("El grupo no existe.");

  const amount = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (amount === null) {
    return fail("Introduce un importe positivo con como mucho 2 decimales (p. ej. 12,50).");
  }

  const description = normalizeText(formData.get("description"));
  if (!description) return fail("Añade una descripción.");
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`La descripción admite como mucho ${MAX_DESCRIPTION_LENGTH} caracteres.`);
  }

  const paidBy = String(formData.get("paidBy") ?? "");
  if (!group.members.includes(paidBy)) {
    return fail("Elige quién ha pagado.");
  }

  // Se conserva el orden del grupo para que el reparto sea determinista
  // (ver splitEvenly en lib/settlement.ts).
  const selected = new Set(formData.getAll("splitAmong").map(String));
  const splitAmong = group.members.filter((m) => selected.has(m));
  if (splitAmong.length === 0) {
    return fail("Selecciona al menos un participante.");
  }

  const expense = await insertExpense({
    groupId: new ObjectId(group.id),
    description,
    amount,
    paidBy,
    splitAmong,
  });

  revalidatePath(`/group/${slug}`);
  publish(slug, { type: "expense_added", expense });

  return { status: "success", message: "Gasto añadido.", version };
}
