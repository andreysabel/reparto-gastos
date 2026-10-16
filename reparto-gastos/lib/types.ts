import type { ObjectId } from "mongodb";

/**
 * Documentos tal y como se guardan en MongoDB.
 * Todos los importes son enteros en céntimos.
 */
export interface GroupDoc {
  _id: ObjectId;
  name: string;
  /** Identificador único para la URL: /group/[slug] */
  slug: string;
  /** Nombres de los participantes (únicos dentro del grupo). */
  members: string[];
  createdAt: Date;
}

export interface ExpenseDoc {
  _id: ObjectId;
  groupId: ObjectId;
  description: string;
  /** Importe total en céntimos (entero > 0). */
  amount: number;
  /** Miembro que pagó. */
  paidBy: string;
  /** Miembros entre los que se reparte a partes iguales. */
  splitAmong: string[];
  createdAt: Date;
}

/**
 * Versiones serializables (sin ObjectId ni Date) que viajan de los
 * Server Components a los Client Components y por el canal SSE.
 */
export interface Group {
  id: string;
  name: string;
  slug: string;
  members: string[];
  createdAt: string;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  createdAt: string;
}

/** Estado devuelto por las Server Actions usadas con useActionState. */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string; version: number }
  | { status: "error"; message: string; version: number };
