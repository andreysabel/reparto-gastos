import { describe, expect, it, vi } from "vitest";
import { publish, subscribe } from "./event-bus";
import type { GroupEvent } from "./events";

const memberAdded: GroupEvent = { type: "member_added", member: "Ana" };

describe("event-bus", () => {
  it("entrega los eventos a todos los suscriptores del grupo", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribe("piso", a);
    subscribe("piso", b);

    publish("piso", memberAdded);

    expect(a).toHaveBeenCalledWith(memberAdded);
    expect(b).toHaveBeenCalledWith(memberAdded);
  });

  it("aísla los canales por slug", () => {
    const listener = vi.fn();
    subscribe("piso", listener);

    publish("viaje", memberAdded);

    expect(listener).not.toHaveBeenCalled();
  });

  it("deja de entregar eventos tras cancelar la suscripción", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe("piso", listener);

    unsubscribe();
    publish("piso", memberAdded);

    expect(listener).not.toHaveBeenCalled();
  });

  it("un listener que falla no impide notificar al resto", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const healthy = vi.fn();
    subscribe("piso", () => {
      throw new Error("conexión rota");
    });
    subscribe("piso", healthy);

    expect(() => publish("piso", memberAdded)).not.toThrow();
    expect(healthy).toHaveBeenCalledOnce();
  });

  it("publicar en un grupo sin suscriptores no hace nada", () => {
    expect(() => publish("vacio", memberAdded)).not.toThrow();
  });
});
