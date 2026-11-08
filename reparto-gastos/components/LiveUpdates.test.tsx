// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupEvent } from "@/lib/realtime/events";
import { LiveUpdates } from "./LiveUpdates";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

/** EventSource falso: jsdom no lo implementa y así controlamos los eventos. */
class FakeEventSource extends EventTarget {
  static instances: FakeEventSource[] = [];
  closed = false;

  constructor(readonly url: string) {
    super();
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data?: unknown) {
    act(() => {
      this.dispatchEvent(
        data === undefined
          ? new Event(type)
          : new MessageEvent(type, { data: JSON.stringify(data) }),
      );
    });
  }
}

const source = () => FakeEventSource.instances[FakeEventSource.instances.length - 1];

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("LiveUpdates", () => {
  it("se conecta al stream SSE del grupo", () => {
    render(<LiveUpdates slug="piso abc" />);
    expect(source().url).toBe("/api/groups/piso%20abc/events");
    expect(screen.getByText("Conectando…")).toBeTruthy();
  });

  it("refleja el estado de la conexión", () => {
    render(<LiveUpdates slug="piso" />);

    source().emit("open");
    expect(screen.getByText("En vivo")).toBeTruthy();

    source().emit("error");
    expect(screen.getByText("Reconectando…")).toBeTruthy();
  });

  it("refresca la página y avisa al llegar un gasto nuevo", () => {
    render(<LiveUpdates slug="piso" />);
    const event: GroupEvent = {
      type: "expense_added",
      expense: {
        id: "e1",
        groupId: "g1",
        description: "Pizza",
        amount: 1250,
        paidBy: "Ana",
        splitAmong: ["Ana"],
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    };

    source().emit("expense_added", event);

    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent!.replace(/\s/g, " ")).toBe(
      "Ana añadió «Pizza» (12,50 €)",
    );
  });

  it("oculta el aviso a los 4 segundos", () => {
    vi.useFakeTimers();
    render(<LiveUpdates slug="piso" />);

    source().emit("member_added", { type: "member_added", member: "Eva" });
    expect(screen.getByRole("status").textContent).toBe("Eva se ha unido al grupo");

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("ignora mensajes con JSON inválido sin romper la página", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<LiveUpdates slug="piso" />);

    act(() => {
      source().dispatchEvent(new MessageEvent("member_added", { data: "{roto" }));
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("cierra la conexión al desmontarse", () => {
    const { unmount } = render(<LiveUpdates slug="piso" />);
    unmount();
    expect(source().closed).toBe(true);
  });
});
