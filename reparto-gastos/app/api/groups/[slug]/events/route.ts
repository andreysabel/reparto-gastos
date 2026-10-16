import { findGroupBySlug } from "@/lib/db/groups";
import { subscribe } from "@/lib/realtime/event-bus";
import type { GroupEvent } from "@/lib/realtime/events";

const HEARTBEAT_MS = 25_000;
const encoder = new TextEncoder();

/** Formato de mensaje SSE: `event: <tipo>\ndata: <json>\n\n`. */
function sseMessage(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * GET /api/groups/[slug]/events
 *
 * Mantiene abierta una respuesta `text/event-stream` y empuja al cliente
 * cada evento publicado para el grupo (`expense_added`, `member_added`).
 * Un comentario de heartbeat cada 25 s evita que proxies cierren la
 * conexión por inactividad. Al desconectarse el cliente se libera todo.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/groups/[slug]/events">,
) {
  const { slug } = await ctx.params;
  const group = await findGroupBySlug(slug);
  if (!group) {
    return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
  }

  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          cleanup();
        }
      };

      // El cliente reintenta a los 3 s si se corta la conexión.
      send(encoder.encode("retry: 3000\n\n"));
      send(sseMessage("connected", { slug }));

      const unsubscribe = subscribe(slug, (event: GroupEvent) => {
        send(sseMessage(event.type, event));
      });

      const heartbeat = setInterval(() => {
        send(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
      }, HEARTBEAT_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ya estaba cerrado
        }
      };

      request.signal.addEventListener("abort", () => cleanup(), { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Desactiva el buffering de proxies tipo nginx.
      "X-Accel-Buffering": "no",
    },
  });
}
