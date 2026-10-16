import type { ComponentProps, ReactNode } from "react";
import type { ActionState } from "@/lib/types";

/** Piezas visuales compartidas para mantener el estilo consistente. */

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950";

export function Button({
  pending,
  children,
  className = "",
  ...props
}: ComponentProps<"button"> & { pending?: boolean }) {
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className={`inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`text-sm ${isError ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
    >
      {state.message}
    </p>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
