"use client";

import { useState } from "react";

export function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/group/${slug}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 font-mono text-xs text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      title="Copiar enlace para compartir"
    >
      {copied ? "¡Enlace copiado!" : `/group/${slug}`}
    </button>
  );
}
