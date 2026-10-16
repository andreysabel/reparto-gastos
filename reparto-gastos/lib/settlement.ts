/**
 * Algoritmo de liquidación de deudas (debt simplification).
 *
 * 1. `splitEvenly`: reparte un importe en céntimos a partes iguales; los
 *    céntimos indivisibles los asume quien pagó.
 * 2. `computeBalances`: balance neto por miembro = pagado − consumido.
 * 3. `simplifyDebts`: algoritmo codicioso con dos punteros sobre deudores y
 *    acreedores ordenados que salda todos los balances con, como mucho,
 *    n − 1 transferencias.
 *
 * Todo trabaja con enteros (céntimos): no hay ningún redondeo.
 * El módulo no depende de Next.js ni de MongoDB para poder testearlo aislado.
 */

export type MemberId = string;
export type Cents = number;

/** Lo mínimo que el algoritmo necesita de un gasto. */
export interface SettlementExpense {
  readonly amount: Cents;
  readonly paidBy: MemberId;
  readonly splitAmong: readonly MemberId[];
}

export interface MemberBalance {
  readonly member: MemberId;
  /** Positivo: le deben dinero. Negativo: debe dinero. */
  readonly balance: Cents;
}

/** "from le debe amount a to". */
export interface Transfer {
  readonly from: MemberId;
  readonly to: MemberId;
  readonly amount: Cents;
}

function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} debe ser un entero en céntimos: ${value}`);
  }
}

/**
 * Divide `amount` céntimos entre `participants` a partes iguales.
 *
 * Cada uno recibe `floor(amount / n)`. Los `amount % n` céntimos que no se
 * pueden repartir (p. ej. 125,00 € / 3 = 41,666… €) los asume `payer`, que
 * es quien ha adelantado el dinero: así todos los demás pagan exactamente
 * lo mismo y nadie paga más de su parte exacta.
 *
 * Si `payer` no participa en el gasto, el sobrante se reparte de céntimo en
 * céntimo entre los primeros participantes (diferencia máxima: 1 céntimo).
 * La suma de las partes es siempre exactamente `amount`.
 *
 * @example splitEvenly(12500, ["Luis", "Carla", "Efrain"], "Carla")
 *   // Map { "Luis" => 4166, "Carla" => 4168, "Efrain" => 4166 }
 */
export function splitEvenly(
  amount: Cents,
  participants: readonly MemberId[],
  payer?: MemberId,
): Map<MemberId, Cents> {
  assertCents(amount, "amount");
  const unique = [...new Set(participants)];
  if (unique.length === 0) {
    throw new RangeError("Un gasto debe repartirse entre al menos un miembro");
  }

  const base = Math.floor(amount / unique.length);
  const remainder = amount - base * unique.length;
  const shares = new Map(unique.map((member) => [member, base]));

  if (payer !== undefined && shares.has(payer)) {
    shares.set(payer, base + remainder);
  } else {
    unique.slice(0, remainder).forEach((member) => shares.set(member, base + 1));
  }
  return shares;
}

/**
 * Calcula el balance neto de cada miembro: lo que pagó menos lo que consumió.
 *
 * Los miembros sin gastos aparecen con balance 0. La suma de todos los
 * balances es siempre 0 (el dinero ni se crea ni se destruye).
 */
export function computeBalances(
  members: readonly MemberId[],
  expenses: readonly SettlementExpense[],
): MemberBalance[] {
  const balances = new Map<MemberId, Cents>(members.map((m) => [m, 0]));
  const add = (member: MemberId, delta: Cents) =>
    balances.set(member, (balances.get(member) ?? 0) + delta);

  for (const expense of expenses) {
    add(expense.paidBy, expense.amount);
    for (const [member, share] of splitEvenly(
      expense.amount,
      expense.splitAmong,
      expense.paidBy,
    )) {
      add(member, -share);
    }
  }

  return [...balances].map(([member, balance]) => ({ member, balance }));
}

/**
 * Convierte balances netos en la lista de transferencias que los salda.
 *
 * Estrategia codiciosa con dos punteros:
 *  - Se separan acreedores (balance > 0) y deudores (balance < 0) y se
 *    ordenan de mayor a menor importe absoluto.
 *  - En cada paso el mayor deudor paga al mayor acreedor el mínimo de
 *    ambas cantidades. Al menos uno de los dos queda saldado y su puntero
 *    avanza, por lo que se generan como mucho (deudores + acreedores − 1)
 *    transferencias.
 *
 * Encontrar el mínimo absoluto de transferencias es NP-difícil en general;
 * esta heurística es la estándar (la que usan apps tipo Splitwise) y en la
 * práctica da el óptimo o queda muy cerca.
 */
export function simplifyDebts(balances: readonly MemberBalance[]): Transfer[] {
  for (const { member, balance } of balances) {
    assertCents(balance, `balance de ${member}`);
  }
  const total = balances.reduce((sum, b) => sum + b.balance, 0);
  if (total !== 0) {
    throw new RangeError(`Los balances no suman 0 (suman ${total})`);
  }

  // Desempate por nombre para que el resultado sea determinista.
  const byAmountDesc = (a: Mutable, b: Mutable) =>
    b.amount - a.amount || a.member.localeCompare(b.member);

  const creditors: Mutable[] = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ member: b.member, amount: b.balance }))
    .sort(byAmountDesc);
  const debtors: Mutable[] = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ member: b.member, amount: -b.balance }))
    .sort(byAmountDesc);

  const transfers: Transfer[] = [];
  let i = 0; // puntero de deudores
  let j = 0; // puntero de acreedores

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    transfers.push({ from: debtor.member, to: creditor.member, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return transfers;
}

interface Mutable {
  member: MemberId;
  amount: Cents;
}

/** Atajo: de miembros + gastos directamente a balances y transferencias. */
export function settle(
  members: readonly MemberId[],
  expenses: readonly SettlementExpense[],
): { balances: MemberBalance[]; transfers: Transfer[] } {
  const balances = computeBalances(members, expenses);
  return { balances, transfers: simplifyDebts(balances) };
}
