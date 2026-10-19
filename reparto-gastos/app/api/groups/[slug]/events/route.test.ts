import { beforeEach, describe, expect, it, vi } from "vitest";
import { findGroupBySlug } from "@/lib/db/groups";
import { publish } from "@/lib/realtime/event-bus";
import type { Group } from "@/lib/types";
import { GET } from "./route";

vi.mock("@/lib/db/groups", () => ({ findGroupBySlug: vi.fn() }));

const GROUP: Group = {
  id: "65f000000000000000000001",
  name: "Piso",
  slug: "piso-abc123",
  members: ["Ana"],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const bus = () =>
  (globalThis as { _groupEventBus?: Map<string, Set<unknown>> })._groupEventBus;

function open(slug: string) {
  const controller = new AbortController();
  const request = new Request(`http://localhost/api/groups/${slug}/events`, {
    signal: controller.signal,
  });
  const ctx = { params: Promise.resolve({ slug }) } as Parameters<typeof GET>[1];
  return { response: GET(request, ctx), abort: () => controller.abort() };
}

/** Lee del stream hasta haber recibido `count` mensajes SSE completos. */
async function readMessages(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  count: number,
): Promise<string[]> {
  const decoder = new TextDecoder();
  let text = "";
  while (text.split("\n\n").length - 1 < count) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  return text.split("\n\n").filter(Boolean);
}

beforeEach(() => {
  vi.mocked(findGroupBySlug).mockResolvedValue(GROUP);
});

describe("GET /api/groups/[slug]/events", () => {
  it("responde 404 si el grupo no existe", async () => {
    vi.mocked(findGroupBySlug).mockResolvedValue(null);

    const response = await open("no-existe").response;

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Grupo no encontrado" });
  });

  it("abre un stream text/event-stream sin caché", async () => {
    const { response, abort } = open(GROUP.slug);
    const res = await response;

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toContain("no-cache");
    abort();
  });

  it("envía retry + connected y después solo los eventos de su grupo", async () => {
    const { response, abort } = open(GROUP.slug);
    const reader = (await response).body!.getReader();

    expect(await readMessages(reader, 2)).toEqual([
      "retry: 3000",
      `event: connected\ndata: {"slug":"${GROUP.slug}"}`,
    ]);

    publish("otro-grupo", { type: "member_added", member: "Nadie" });
    publish(GROUP.slug, { type: "member_added", member: "Eva" });

    expect(await readMessages(reader, 1)).toEqual([
      'event: member_added\ndata: {"type":"member_added","member":"Eva"}',
    ]);
    abort();
  });

  it("libera la suscripción y cierra el stream cuando el cliente se desconecta", async () => {
    const { response, abort } = open(GROUP.slug);
    const reader = (await response).body!.getReader();
    await readMessages(reader, 2);
    expect(bus()?.get(GROUP.slug)?.size).toBe(1);

    abort();

    expect(bus()?.has(GROUP.slug)).toBe(false);
    expect((await reader.read()).done).toBe(true);
  });
});
