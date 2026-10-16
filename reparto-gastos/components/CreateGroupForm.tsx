"use client";

import { useActionState } from "react";
import { createGroup } from "@/lib/actions/groups";
import type { ActionState } from "@/lib/types";
import { Button, FormMessage, inputClass } from "./ui";

const initialState: ActionState = { status: "idle" };

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState(createGroup, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nombre del grupo
        <input
          name="name"
          required
          maxLength={40}
          placeholder="Viaje a Lisboa"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Miembros <span className="font-normal text-zinc-500">(opcional, separados por comas)</span>
        <textarea
          name="members"
          rows={2}
          placeholder="Ana, Luis, Eva"
          className={inputClass}
        />
      </label>
      <FormMessage state={state} />
      <Button type="submit" pending={pending}>
        Crear grupo
      </Button>
    </form>
  );
}
