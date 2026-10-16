import type { Expense } from "../types";

/**
 * Eventos que el servidor emite por SSE. Compartido entre servidor y
 * cliente, por eso no importa nada exclusivo de servidor.
 */
export type GroupEvent =
  | { type: "expense_added"; expense: Expense }
  | { type: "member_added"; member: string };

export type GroupEventType = GroupEvent["type"];

export const GROUP_EVENT_TYPES = [
  "expense_added",
  "member_added",
] as const satisfies readonly GroupEventType[];
