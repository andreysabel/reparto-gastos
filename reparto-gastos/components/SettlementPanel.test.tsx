// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BalancesList, SettlementPanel } from "./SettlementPanel";

/** Texto visible con los espacios duros de Intl normalizados. */
const text = (el: Element) => el.textContent!.replace(/\s/g, " ");

describe("SettlementPanel", () => {
  it("indica que todo está saldado si no hay transferencias", () => {
    render(<SettlementPanel transfers={[]} />);
    expect(screen.getByText(/Todo saldado/)).toBeTruthy();
  });

  it("lista cada transferencia con su importe", () => {
    render(
      <SettlementPanel
        transfers={[
          { from: "Eva", to: "Ana", amount: 1500 },
          { from: "Luis", to: "Ana", amount: 500 },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem").map(text);
    expect(items).toEqual(["Eva le debe a Ana15,00 €", "Luis le debe a Ana5,00 €"]);
  });
});

describe("BalancesList", () => {
  it("muestra + para acreedores y - para deudores", () => {
    render(
      <BalancesList
        balances={[
          { member: "Ana", balance: 2000 },
          { member: "Luis", balance: 0 },
          { member: "Eva", balance: -2000 },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem").map(text);
    expect(items).toEqual(["Ana+20,00 €", "Luis0,00 €", "Eva-20,00 €"]);
  });

  it("indica si no hay miembros", () => {
    render(<BalancesList balances={[]} />);
    expect(screen.getByText("Sin miembros.")).toBeTruthy();
  });
});
