/**
 * Prueba de humo del Dashboard.
 *
 * Carga el markup real de index.html en el DOM de pruebas e instancia el
 * Dashboard para verificar que todos los elementos que busca el código existen
 * (contrato HTML/JS) y que la interfaz se inicializa sin lanzar errores.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Dashboard } from "./dashboard";
import { NAV_ITEMS, APP_BENEFITS } from "@/config/constants";

const HTML_PATH = resolve(__dirname, "../../index.html");

/**
 * Extrae el contenido del <body> del index.html real.
 * @returns {string} HTML interno del body.
 */
function loadBodyMarkup(): string {
  const html = readFileSync(HTML_PATH, "utf-8");
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!match) throw new Error("No se encontró el <body> en index.html");
  // Quitar la etiqueta del script del bundle: no debe ejecutarse en la prueba.
  return match[1].replace(/<script[\s\S]*?<\/script>/gi, "");
}

beforeEach(() => {
  document.body.innerHTML = loadBodyMarkup();
  localStorage.clear();

  // APIs de grabación que jsdom no implementa.
  vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia: vi.fn() } });
  vi.stubGlobal("MediaRecorder", {
    isTypeSupported: (type: string) => type.includes("webm"),
  });
  (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("Dashboard (prueba de humo)", () => {
  it("se inicializa sin errores sobre el markup real", () => {
    expect(() => new Dashboard()).not.toThrow();
    // Si el navegador no fuese soportado, el body se reemplazaría por un aviso.
    expect(document.getElementById("app")).not.toBeNull();
  });

  it("rellena la navegación lateral con los elementos configurados", () => {
    new Dashboard();
    expect(document.querySelectorAll(".nav-item").length).toBe(NAV_ITEMS.length);
    // Los iconos SVG deben haberse inyectado.
    expect(document.querySelector(".nav-icon svg")).not.toBeNull();
  });

  it("sustituye los contenedores de configuración por controles reales", () => {
    new Dashboard();
    [
      "orientationSelect",
      "formatSelect",
      "resolutionSelect",
      "framerateSelect",
      "qualitySelect",
    ].forEach((id) => {
      expect(document.getElementById(id), `falta el select ${id}`).not.toBeNull();
    });
    expect(document.getElementById("recordAudio")).not.toBeNull();
  });

  it("construye el slider de beneficios del banner", () => {
    new Dashboard();
    expect(document.querySelectorAll(".hero-slide").length).toBe(APP_BENEFITS.length);
    expect(document.querySelectorAll(".hero-dot-nav").length).toBe(APP_BENEFITS.length);
  });

  it("muestra el contador del plan gratuito en la tarjeta de plan", () => {
    new Dashboard();
    expect(document.getElementById("planTimer")!.textContent).toBe("03:00");
    expect(document.getElementById("planBadge")!.textContent).toBe("Plan gratuito");
  });

  it("el badge de la biblioteca empieza oculto", () => {
    new Dashboard();
    const badge = document.querySelector(".nav-badge")!;
    expect(badge).not.toBeNull();
    expect(badge.classList.contains("visible")).toBe(false);
  });

  it("marca con candado las opciones Pro en el plan gratuito", () => {
    new Dashboard();

    const resolution = document.getElementById("resolutionSelect") as HTMLSelectElement;
    const framerate = document.getElementById("framerateSelect") as HTMLSelectElement;

    // 1080p es gratis; 2K y 4K deben estar marcadas.
    const labels = Array.from(resolution.options).map((o) => o.textContent ?? "");
    expect(labels.find((l) => l.includes("1080"))).not.toMatch(/Pro/);
    expect(labels.find((l) => l.includes("1440"))).toMatch(/Pro/);
    expect(labels.find((l) => l.includes("2160"))).toMatch(/Pro/);

    // El valor inicial del plan gratuito no debe ser una opción Pro.
    expect(resolution.value).toBe("1080");
    expect(framerate.value).toBe("30");
  });

  it("revierte la selección si un usuario gratuito elige una opción Pro", () => {
    new Dashboard();

    const resolution = document.getElementById("resolutionSelect") as HTMLSelectElement;
    resolution.value = "2160";
    resolution.dispatchEvent(new Event("change"));

    // Debe volver al valor permitido y ofrecer la mejora.
    expect(resolution.value).toBe("1080");
    expect(document.getElementById("modalOverlay")!.style.display).toBe("flex");
  });

  it("el sidebar se contrae y se vuelve a desplegar", () => {
    new Dashboard();

    const app = document.getElementById("app")!;
    const btn = document.getElementById("collapseBtn") as HTMLButtonElement;

    expect(app.classList.contains("collapsed")).toBe(false);

    btn.click();
    expect(app.classList.contains("collapsed")).toBe(true);

    // Este era el fallo: el botón quedaba inaccesible y no se podía desplegar.
    btn.click();
    expect(app.classList.contains("collapsed")).toBe(false);
  });

  it("construye el acordeón de preguntas frecuentes", async () => {
    const { FAQ_ITEMS } = await import("@/config/constants");
    new Dashboard();

    const items = document.querySelectorAll(".faq-item");
    expect(items.length).toBe(FAQ_ITEMS.length);

    // Las respuestas empiezan cerradas y se abren al pulsar.
    const first = items[0];
    expect(first.classList.contains("open")).toBe(false);
    first.querySelector<HTMLButtonElement>(".faq-question")!.click();
    expect(first.classList.contains("open")).toBe(true);
  });

  it("la galería muestra el estado vacío cuando no hay grabaciones", () => {
    new Dashboard();
    document.querySelector<HTMLButtonElement>('.nav-item[data-view="library"]')!.click();

    expect(document.getElementById("view-library")!.style.display).toBe("flex");
    expect(document.querySelector("#galleryGrid .empty-state")).not.toBeNull();
  });

  it("usa iconos planos (SVG) en el banner, sin emojis", () => {
    new Dashboard();

    const icons = document.querySelectorAll(".hero-slide-icon");
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => {
      expect(icon.querySelector("svg"), "cada beneficio debe usar un SVG").not.toBeNull();
    });

    // No deben quedar emojis en los títulos del banner.
    const titles = Array.from(document.querySelectorAll(".hero-slide-title"))
      .map((el) => el.textContent ?? "")
      .join(" ");
    expect(titles).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it("el chip de usuario abre la vista de perfil", () => {
    new Dashboard();

    document.getElementById("userChip")!.click();

    expect(document.getElementById("view-profile")!.style.display).toBe("flex");
    expect(document.getElementById("profileHero")!.textContent).toMatch(/Invitado/);
    // Debe mostrar las tarjetas de estadísticas.
    expect(document.querySelectorAll("#profileStats .stat-card").length).toBe(4);
  });

  it("el perfil indica los límites del plan gratuito", () => {
    new Dashboard();
    document.getElementById("userChip")!.click();

    const plan = document.getElementById("profilePlanCard")!.textContent ?? "";
    expect(plan).toMatch(/3 minutos/);
    expect(plan).toMatch(/1080p/);
  });

  it("libera la columna de ajustes en las vistas que no son de grabación", () => {
    new Dashboard();
    const app = document.getElementById("app")!;
    const configPanel = document.getElementById("configPanel")!;

    // En la vista de grabación se muestran los ajustes.
    expect(app.classList.contains("no-config")).toBe(false);

    // En biblioteca, ajustes, ayuda y perfil el contenido usa todo el ancho.
    ["library", "settings", "support"].forEach((view) => {
      document.querySelector<HTMLButtonElement>(`.nav-item[data-view="${view}"]`)!.click();
      expect(configPanel.style.display, `en ${view}`).toBe("none");
      expect(app.classList.contains("no-config"), `en ${view}`).toBe(true);
    });

    document.getElementById("userChip")!.click();
    expect(app.classList.contains("no-config")).toBe(true);

    // Al volver a grabar, reaparecen los ajustes.
    document.querySelector<HTMLButtonElement>('.nav-item[data-view="dashboard"]')!.click();
    expect(app.classList.contains("no-config")).toBe(false);
  });

  it("la galería explica dónde quedan guardadas las grabaciones", () => {
    new Dashboard();
    document.querySelector<HTMLButtonElement>('.nav-item[data-view="library"]')!.click();

    const warning = document.getElementById("galleryWarning")!;
    expect(warning.textContent?.trim().length).toBeGreaterThan(0);
    expect(warning.textContent).toMatch(/navegador/i);
  });

  it("no ofrece reiniciar el crédito diario en los ajustes", () => {
    new Dashboard();
    document.querySelector<HTMLButtonElement>('.nav-item[data-view="settings"]')!.click();

    const actions = document.getElementById("settingsActions")!.textContent ?? "";
    expect(actions).not.toMatch(/reiniciar/i);
  });

  it("avisa del fallback cuando el formato elegido no está soportado", () => {
    new Dashboard();
    // MediaRecorder solo admite webm, y el formato por defecto es mp4.
    const info = document.getElementById("formatInfo")!;
    expect(info.style.display).toBe("block");
    expect(info.textContent).toMatch(/no admite/i);
    expect(info.textContent).toMatch(/WebM/i);
  });

  it("no repite el formato elegido cuando sí está admitido", () => {
    // Con soporte para todo, el aviso no aporta nada y debe ocultarse.
    vi.stubGlobal("MediaRecorder", { isTypeSupported: () => true });
    new Dashboard();

    expect(document.getElementById("formatInfo")!.style.display).toBe("none");
  });

  it("muestra el botón de grabar junto a la vista previa, no en los ajustes", () => {
    new Dashboard();

    const startBtn = document.getElementById("startBtn")!;
    const stage = document.querySelector(".stage-card")!;
    const configPanel = document.getElementById("configPanel")!;

    expect(stage.contains(startBtn), "el CTA debe estar en el área de captura").toBe(true);
    expect(configPanel.contains(startBtn)).toBe(false);
  });

  it("la vista previa es pulsable para empezar a grabar", () => {
    new Dashboard();

    const placeholder = document.getElementById("placeholderText")!;
    expect(placeholder.tagName).toBe("BUTTON");
    expect(placeholder.textContent).toMatch(/pulsa aquí/i);
  });

  it("la barra de estado resume los ajustes activos", () => {
    new Dashboard();

    expect(document.getElementById("qualityPill")!.textContent).toBe("1080p · 30 FPS");
    expect(document.getElementById("orientationPill")!.textContent).toMatch(/16:9/);
    expect(document.getElementById("audioPill")!.textContent).toMatch(/Con audio/);
  });

  it("el punto de estado solo se enciende al grabar", () => {
    new Dashboard();
    // En reposo permanece neutro: el rojo se reserva para la grabación.
    expect(document.querySelector(".rec-dot")!.classList.contains("live")).toBe(false);
  });

  it("agrupa el perfil junto al menú, sin espacio muerto", () => {
    new Dashboard();

    const tail = document.querySelector(".sidebar-tail")!;
    expect(tail.contains(document.getElementById("userChip"))).toBe(true);
    // El control de ocultar el menú deja de estar pegado al logo.
    expect(tail.contains(document.getElementById("collapseBtn"))).toBe(true);
    expect(
      document.querySelector(".sidebar-head")!.contains(document.getElementById("collapseBtn"))
    ).toBe(false);
  });
});
