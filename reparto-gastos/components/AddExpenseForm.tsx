"use client";

import { useActionState, useState } from "react";
import { addExpense } from "@/lib/actions/expenses";
import type { ActionState } from "@/lib/types";
import { Button, FormMessage, inputClass } from "./ui";

const initialState: ActionState = { status: "idle" };

export function AddExpenseForm({
  slug,
  members,
}: {
  slug: string;
  members: string[];
}) {
  const [state, formAction, pending] = useActionState(
    addExpense.bind(null, slug),
    initialState,
  );

  if (members.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Añade al menos un miembro para poder registrar gastos.
      </p>
    );
  }

  // Tras un alta correcta los campos se reinician remontando <ExpenseFields>.
  const resetKey = state.status === "success" ? state.version : 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ExpenseFields key={resetKey} members={members} />
      <FormMessage state={state} />
      <Button type="submit" pending={pending}>
        Añadir gasto
      </Button>
    </form>
  );
}

function ExpenseFields({ members }: { members: string[] }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]);
  // Se guardan los EXCLUIDOS: así, por defecto participan todos, incluidos
  // los miembros que se unan en tiempo real mientras se rellena el formulario.
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());

  const payer = members.includes(paidBy) ? paidBy : members[0];
  const participants = members.filter((m) => !excluded.has(m));

  const toggle = (member: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(member)) next.delete(member);
      else next.add(member);
      return next;
    });

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Importe (€)
          <input
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            inputMode="decimal"
            pattern="\d{1,9}([.,]\d{1,2})?"
            title="Importe con como mucho 2 decimales, p. ej. 12,50"
            placeholder="0,00"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Descripción
          <input
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={100}
            placeholder="Cena del sábado"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Pagado por
        <select
          name="paidBy"
          value={payer}
          onChange={(e) => setPaidBy(e.target.value)}
          className={inputClass}
        >
          {members.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
          <span>
            Dividir entre{" "}
            <span className="font-normal text-zinc-500">
              ({participants.length}/{members.length})
            </span>
          </span>
          <button
            type="button"
            className="text-xs font-normal text-emerald-700 hover:underline dark:text-emerald-400"
            onClick={() =>
              setExcluded(
                participants.length === members.length ? new Set(members) : new Set(),
              )
            }
          >
            {participants.length === members.length ? "Ninguno" : "Todos"}
          </button>
        </legend>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const checked = !excluded.has(m);
            return (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
                  checked
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                    : "border-zinc-300 text-zinc-500 dark:border-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  name="splitAmong"
                  value={m}
                  checked={checked}
                  onChange={() => toggle(m)}
                  className="accent-emerald-600"
                />
                {m}
              </label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
