"use client";

import { useActionState } from "react";
import { addMember } from "@/lib/actions/groups";
import type { ActionState } from "@/lib/types";
import { Button, FormMessage, inputClass } from "./ui";

const initialState: ActionState = { status: "idle" };

export function AddMemberForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(
    addMember.bind(null, slug),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="member"
          required
          maxLength={40}
          placeholder="Nuevo miembro"
          aria-label="Nombre del nuevo miembro"
          className={inputClass}
        />
        <Button type="submit" pending={pending} className="shrink-0">
          Añadir
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
