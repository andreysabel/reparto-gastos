import { formatCents } from "@/lib/money";
import { splitEvenly } from "@/lib/settlement";
import type { Expense } from "@/lib/types";
import { Avatar } from "./ui";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

/** "41,66 € por persona · Carla asume 0,02 € de redondeo". */
function ShareNote({ expense }: { expense: Expense }) {
  const shares = splitEvenly(expense.amount, expense.splitAmong, expense.paidBy);
  const perPerson = Math.min(...shares.values());
  const extra = (shares.get(expense.paidBy) ?? perPerson) - perPerson;

  return (
    <p className="text-xs text-zinc-500">
      {formatCents(perPerson)} por persona
      {extra > 0 && ` · ${expense.paidBy} asume ${formatCents(extra)} de redondeo`}
    </p>
  );
}

export function ExpensesList({
  expenses,
  memberCount,
}: {
  expenses: Expense[];
  memberCount: number;
}) {
  if (expenses.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Sin gastos todavía. ¡Apunta el primero!
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {expenses.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-3">
          <Avatar name={e.paidBy} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{e.description}</p>
            <p className="text-xs text-zinc-500">
              Pagó <span className="font-medium text-zinc-700 dark:text-zinc-300">{e.paidBy}</span>
              {" · "}
              {e.splitAmong.length === memberCount
                ? "entre todos"
                : `entre ${e.splitAmong.join(", ")}`}
              {" · "}
              {dateFormatter.format(new Date(e.createdAt))}
            </p>
            <ShareNote expense={e} />
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatCents(e.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
