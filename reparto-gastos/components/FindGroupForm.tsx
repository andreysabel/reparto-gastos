"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, inputClass } from "./ui";

/** Acepta el slug o la URL completa del grupo. */
function extractSlug(input: string): string {
  const value = input.trim();
  const match = /\/group\/([^/?#]+)/.exec(value);
  return (match ? match[1] : value).toLowerCase();
}

export function FindGroupForm() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const slug = extractSlug(value);
        if (slug) router.push(`/group/${encodeURIComponent(slug)}`);
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Enlace o código del grupo
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          placeholder="viaje-a-lisboa-k3f9x2"
          className={inputClass}
        />
      </label>
      <Button type="submit" className="bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600">
        Abrir grupo
      </Button>
    </form>
  );
}
