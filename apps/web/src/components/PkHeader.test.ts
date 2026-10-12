import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PkHeader } from "./PkHeader";

function renderHeader(props: Parameters<typeof PkHeader>[0]) {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(PkHeader, props)),
  );
}

describe("PkHeader profile menu", () => {
  it("puts billing balance and logout inside the profile submenu", () => {
    const html = renderHeader({
      me: { name: "Антон", email: "a@example.com" },
      onOut: () => undefined,
      billing: {
        paymentsEnabled: true,
        freeAvailable: false,
        credits: 1,
        plan: "free",
        planUntil: null,
        label: "",
        prices: { creditRub: 199, monthRub: 399 },
      },
    });

    expect(html).toContain("head-profile");
    expect(html).toContain("Антон");
    expect(html).toContain("Осталось: 1 презентации");
    expect(html).toContain("Выйти");
    expect(html).toMatch(/head-profile-menu[\s\S]*Осталось: 1 презентации[\s\S]*Выйти/);
    expect(html).not.toMatch(/<\/details>[\s\S]*Выйти/);
  });

  it("hides billing row when payments are disabled", () => {
    const html = renderHeader({
      me: { email: "a@example.com" },
      onOut: () => undefined,
      billing: {
        paymentsEnabled: false,
        freeAvailable: true,
        credits: 0,
        plan: "free",
        planUntil: null,
        label: "",
        prices: { creditRub: 199, monthRub: 399 },
      },
    });

    expect(html).toContain("Выйти");
    expect(html).not.toContain("Осталось:");
  });
});
