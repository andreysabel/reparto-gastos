import { formatCents } from "@/lib/money";
import type { MemberBalance, Transfer } from "@/lib/settlement";

export function BalancesList({ balances }: { balances: MemberBalance[] }) {
  if (balances.length === 0) {
    return <p className="text-sm text-zinc-500">Sin miembros.</p>;
  }
  const max = Math.max(1, ...balances.map((b) => Math.abs(b.balance)));

  return (
    <ul className="flex flex-col gap-2">
      {balances.map(({ member, balance }) => {
        const width = `${(Math.abs(balance) / max) * 50}%`;
        const positive = balance > 0;
        return (
          <li key={member} className="grid grid-cols-[6rem_1fr_6rem] items-center gap-2 text-sm">
            <span className="truncate">{member}</span>
            <div className="relative h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-300 dark:bg-zinc-600" />
              {balance !== 0 && (
                <div
                  className={`absolute inset-y-0 rounded-full ${positive ? "left-1/2 bg-emerald-500" : "right-1/2 bg-rose-500"}`}
                  style={{ width }}
                />
              )}
            </div>
            <span
              className={`text-right font-mono tabular-nums ${
                positive
                  ? "text-emerald-700 dark:text-emerald-400"
                  : balance < 0
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-zinc-500"
              }`}
            >
              {positive ? "+" : ""}
              {formatCents(balance)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SettlementPanel({ transfers }: { transfers: Transfer[] }) {
  if (transfers.length === 0) {
    return (
      <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        Todo saldado. Nadie debe nada a nadie.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {transfers.map((t) => (
        <li
          key={`${t.from}->${t.to}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
        >
          <span>
            <strong>{t.from}</strong>
            <span className="text-zinc-500"> le debe a </span>
            <strong>{t.to}</strong>
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {formatCents(t.amount)}
          </span>
        </li>
      ))}
    </ol>
  );
}
