"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGroupEvents, type ConnectionStatus } from "@/hooks/useGroupEvents";
import { formatCents } from "@/lib/money";
import type { GroupEvent } from "@/lib/realtime/events";

function describe(event: GroupEvent): string {
  switch (event.type) {
    case "expense_added":
      return `${event.expense.paidBy} añadió «${event.expense.description}» (${formatCents(event.expense.amount)})`;
    case "member_added":
      return `${event.member} se ha unido al grupo`;
  }
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Conectando…",
  open: "En vivo",
  reconnecting: "Reconectando…",
};

/**
 * Escucha el stream SSE del grupo y, ante cada evento, pide al router que
 * vuelva a renderizar los Server Components (lista de gastos, balances y
 * liquidación) sin recargar la página ni perder el estado de los formularios.
 */
export function LiveUpdates({ slug }: { slug: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);

  const status = useGroupEvents(slug, (event) => {
    router.refresh();
    setNotice({ id: Date.now(), text: describe(event) });
  });

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [notice]);

  return (
    <>
      <span
        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
        title="Los cambios de otros miembros aparecen sin recargar (Server-Sent Events)"
      >
        <span
          className={`size-2 rounded-full ${
            status === "open" ? "animate-pulse bg-emerald-500" : "bg-amber-500"
          }`}
        />
        {STATUS_LABEL[status]}
      </span>

      {notice && (
        <div
          key={notice.id}
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {notice.text}
        </div>
      )}
    </>
  );
}
