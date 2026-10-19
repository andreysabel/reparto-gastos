// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FindGroupForm } from "./FindGroupForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("FindGroupForm", () => {
  it.each([
    ["el código del grupo", "Piso-ABC123", "/group/piso-abc123"],
    ["la URL completa compartida", "https://app.test/group/piso-abc123?x=1", "/group/piso-abc123"],
    ["un enlace relativo", "  /group/viaje-k3f9x2#gastos ", "/group/viaje-k3f9x2"],
  ])("navega al grupo a partir de %s", async (_, input, expected) => {
    const user = userEvent.setup();
    render(<FindGroupForm />);

    await user.type(screen.getByLabelText("Enlace o código del grupo"), input);
    await user.click(screen.getByRole("button", { name: "Abrir grupo" }));

    expect(push).toHaveBeenCalledWith(expected);
  });
});
