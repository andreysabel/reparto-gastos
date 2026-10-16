import "server-only";
import { ObjectId } from "mongodb";
import { expensesCollection } from "../mongodb";
import type { Expense, ExpenseDoc } from "../types";

export function toExpense(doc: ExpenseDoc): Expense {
  return {
    id: doc._id.toHexString(),
    groupId: doc.groupId.toHexString(),
    description: doc.description,
    amount: doc.amount,
    paidBy: doc.paidBy,
    splitAmong: doc.splitAmong,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Gastos del grupo, más recientes primero (usa el índice groupId_createdAt). */
export async function listExpenses(groupId: string): Promise<Expense[]> {
  const docs = await (await expensesCollection())
    .find({ groupId: new ObjectId(groupId) })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toExpense);
}

export async function insertExpense(
  input: Omit<ExpenseDoc, "_id" | "createdAt">,
): Promise<Expense> {
  const doc: ExpenseDoc = {
    _id: new ObjectId(),
    createdAt: new Date(),
    ...input,
  };
  await (await expensesCollection()).insertOne(doc);
  return toExpense(doc);
}
