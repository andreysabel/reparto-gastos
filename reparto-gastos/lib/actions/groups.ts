"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findGroupBySlug, insertGroup, pushMember } from "../db/groups";
import { publish } from "../realtime/event-bus";
import type { ActionState } from "../types";
import {
  MAX_NAME_LENGTH,
  normalizeText,
  parseMemberList,
  sameName,
} from "../validation";

function fail(message: string, prev: ActionState): ActionState {
  return { status: "error", message, version: nextVersion(prev) };
}

function nextVersion(prev: ActionState): number {
  return prev.status === "idle" ? 1 : prev.version + 1;
}

/**
 * Crea un grupo con un slug único y redirige a /group/[slug].
 * Los miembros iniciales son opcionales (se pueden añadir después).
 */
export async function createGroup(
  prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = normalizeText(formData.get("name"));
  const members = parseMemberList(String(formData.get("members") ?? ""));

  if (!name) return fail("El grupo necesita un nombre.", prev);
  if (name.length > MAX_NAME_LENGTH) {
    return fail(`El nombre admite como mucho ${MAX_NAME_LENGTH} caracteres.`, prev);
  }
  if (members.some((m) => m.length > MAX_NAME_LENGTH)) {
    return fail(`Cada nombre de miembro admite como mucho ${MAX_NAME_LENGTH} caracteres.`, prev);
  }

  const group = await insertGroup(name, members);
  // redirect() lanza una excepción de control: debe ir fuera de try/catch.
  redirect(`/group/${group.slug}`);
}

/** Añade un miembro al grupo y avisa a los clientes conectados. */
export async function addMember(
  slug: string,
  prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = normalizeText(formData.get("member"));

  if (!member) return fail("Escribe un nombre.", prev);
  if (member.length > MAX_NAME_LENGTH) {
    return fail(`El nombre admite como mucho ${MAX_NAME_LENGTH} caracteres.`, prev);
  }

  const group = await findGroupBySlug(slug);
  if (!group) return fail("El grupo no existe.", prev);
  if (group.members.some((m) => sameName(m, member))) {
    return fail(`${member} ya es miembro del grupo.`, prev);
  }

  if (!(await pushMember(slug, member))) {
    return fail(`${member} ya es miembro del grupo.`, prev);
  }

  revalidatePath(`/group/${slug}`);
  publish(slug, { type: "member_added", member });

  return {
    status: "success",
    message: `${member} se ha unido al grupo.`,
    version: nextVersion(prev),
  };
}
