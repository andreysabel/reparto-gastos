// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { addExpense } from "@/lib/actions/expenses";
import { AddExpenseForm } from "./AddExpenseForm";

vi.mock("@/lib/actions/expenses", () => ({ addExpense: vi.fn() }));

const MEMBERS = ["Ana", "Luis", "Eva"];

/** Último FormData recibido por la Server Action. */
function submitted(): FormData {
  const calls = vi.mocked(addExpense).mock.calls;
  return calls[calls.length - 1][2];
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Importe (€)"), "12,50");
  await user.type(screen.getByLabelText("Descripción"), "Pizza");
  await user.click(screen.getByRole("button", { name: "Añadir gasto" }));
}

describe("AddExpenseForm", () => {
  it("pide añadir miembros si el grupo está vacío", () => {
    render(<AddExpenseForm slug="piso" members={[]} />);
    expect(screen.getByText(/Añade al menos un miembro/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("por defecto paga el primer miembro y participan todos", () => {
    render(<AddExpenseForm slug="piso" members={MEMBERS} />);

    expect((screen.getByLabelText("Pagado por") as HTMLSelectElement).value).toBe("Ana");
    for (const m of MEMBERS) {
      expect((screen.getByRole("checkbox", { name: m }) as HTMLInputElement).checked).toBe(true);
    }
    expect(screen.getByText("(3/3)")).toBeTruthy();
  });

  it("envía a la Server Action el slug y los datos del formulario", async () => {
    vi.mocked(addExpense).mockResolvedValue({ status: "success", message: "Gasto añadido.", version: 1 });
    const user = userEvent.setup();
    render(<AddExpenseForm slug="piso" members={MEMBERS} />);

    await user.selectOptions(screen.getByLabelText("Pagado por"), "Luis");
    await user.click(screen.getByRole("checkbox", { name: "Eva" }));
    await fillAndSubmit(user);

    await waitFor(() => expect(addExpense).toHaveBeenCalledOnce());
    expect(vi.mocked(addExpense).mock.calls[0][0]).toBe("piso");
    const data = submitted();
    expect(data.get("amount")).toBe("12,50");
    expect(data.get("description")).toBe("Pizza");
    expect(data.get("paidBy")).toBe("Luis");
    expect(data.getAll("splitAmong")).toEqual(["Ana", "Luis"]);
  });

  it("el botón Ninguno/Todos alterna todos los participantes", async () => {
    const user = userEvent.setup();
    render(<AddExpenseForm slug="piso" members={MEMBERS} />);

    await user.click(screen.getByRole("button", { name: "Ninguno" }));
    expect(screen.getByText("(0/3)")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByText("(3/3)")).toBeTruthy();
  });

  it("muestra el error devuelto por el servidor y conserva lo escrito", async () => {
    vi.mocked(addExpense).mockResolvedValue({ status: "error", message: "Elige quién ha pagado.", version: 1 });
    const user = userEvent.setup();
    render(<AddExpenseForm slug="piso" members={MEMBERS} />);

    await fillAndSubmit(user);

    expect((await screen.findByRole("alert")).textContent).toBe("Elige quién ha pagado.");
    expect((screen.getByLabelText("Descripción") as HTMLInputElement).value).toBe("Pizza");
  });

  it("limpia los campos tras guardar con éxito", async () => {
    vi.mocked(addExpense).mockResolvedValue({ status: "success", message: "Gasto añadido.", version: 1 });
    const user = userEvent.setup();
    render(<AddExpenseForm slug="piso" members={MEMBERS} />);

    await fillAndSubmit(user);

    expect((await screen.findByRole("status")).textContent).toBe("Gasto añadido.");
    expect((screen.getByLabelText("Descripción") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Importe (€)") as HTMLInputElement).value).toBe("");
  });
});
