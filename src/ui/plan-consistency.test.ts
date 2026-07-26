/**
 * Coherencia del estado del plan.
 *
 * Se detectó una contradicción en la interfaz: el banner ofrecía "Hazte Pro"
 * mientras el panel mostraba "Plan Pro", y el usuario aparecía como "Invitado"
 * con plan Pro. Estos tests fijan el comportamiento correcto.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STORAGE_KEYS } from "@/config/constants";

const HTML_PATH = resolve(__dirname, "../../index.html");

/**
 * Extrae el contenido del <body> del index.html real.
 * @returns {string} HTML interno del body sin scripts.
 */
function loadBodyMarkup(): string {
  const html = readFileSync(HTML_PATH, "utf-8");
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!match) throw new Error("No se encontró el <body> en index.html");
  return match[1].replace(/<script[\s\S]*?<\/script>/gi, "");
}

beforeEach(() => {
  document.body.innerHTML = loadBodyMarkup();
  localStorage.clear();
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36",
    userAgentData: { mobile: false },
    mediaDevices: { getDisplayMedia: vi.fn() },
  });
  vi.stubGlobal("MediaRecorder", { isTypeSupported: () => true });
  (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  vi.resetModules();
});

describe("Usuario del plan gratuito", () => {
  it("ve el banner con la oferta de Pro", async () => {
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    expect(document.getElementById("heroBanner")!.style.display).not.toBe("none");
    expect(document.getElementById("userPlan")!.textContent).toMatch(/gratuito/i);
    expect(document.getElementById("userName")!.textContent).toBe("Invitado");
  });

  it("muestra el botón de desbloquear Pro", async () => {
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    expect(document.getElementById("upgradeBtn")!.style.display).not.toBe("none");
  });
});

describe("Usuario Pro", () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEYS.PRO, "true");
  });

  it("no ve el banner de 'Hazte Pro' (era contradictorio)", async () => {
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    // Ofrecer Pro a quien ya lo tiene confunde y roba espacio a la vista previa.
    expect(document.getElementById("heroBanner")!.style.display).toBe("none");
    expect(document.querySelectorAll(".hero-slide").length).toBe(0);
  });

  it("no aparece como 'Invitado' teniendo plan Pro", async () => {
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    expect(document.getElementById("userPlan")!.textContent).toMatch(/pro/i);
    expect(document.getElementById("userName")!.textContent).not.toBe("Invitado");
  });

  it("muestra su correo verificado cuando existe", async () => {
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, "persona@gmail.com");
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    expect(document.getElementById("userName")!.textContent).toBe("persona");
  });

  it("oculta el botón de desbloquear Pro", async () => {
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    expect(document.getElementById("upgradeBtn")!.style.display).toBe("none");
  });

  it("no tiene opciones bloqueadas con candado", async () => {
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    const resolution = document.getElementById("resolutionSelect") as HTMLSelectElement;
    const labels = Array.from(resolution.options).map((o) => o.textContent ?? "");
    labels.forEach((label) => expect(label).not.toMatch(/Pro/));
  });
});
