import "server-only";
import type { GroupEvent } from "./events";

type Listener = (event: GroupEvent) => void;

/**
 * Pub/sub en memoria: slug del grupo → conexiones SSE abiertas.
 *
 * Vive en globalThis porque la Server Action (que publica) y el Route
 * Handler (que escucha) se compilan como módulos distintos; así ambos ven
 * la misma instancia, también tras un hot reload en desarrollo.
 *
 * Limitación consciente: funciona con un único proceso de Node. Para
 * escalar a varias instancias se sustituiría por Redis Pub/Sub o por
 * MongoDB Change Streams sin tocar ni el endpoint ni el cliente.
 */
const globalForBus = globalThis as typeof globalThis & {
  _groupEventBus?: Map<string, Set<Listener>>;
};

const channels = (globalForBus._groupEventBus ??= new Map());

export function subscribe(slug: string, listener: Listener): () => void {
  let listeners = channels.get(slug);
  if (!listeners) {
    listeners = new Set();
    channels.set(slug, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) channels.delete(slug);
  };
}

export function publish(slug: string, event: GroupEvent): void {
  for (const listener of channels.get(slug) ?? []) {
    try {
      listener(event);
    } catch (error) {
      console.error(`[sse] listener de ${slug} falló`, error);
    }
  }
}
