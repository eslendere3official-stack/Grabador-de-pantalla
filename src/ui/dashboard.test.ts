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

  it("avisa del fallback cuando el formato elegido no está soportado", () => {
    new Dashboard();
    // MediaRecorder solo soporta webm, y el formato por defecto es mp4.
    const info = document.getElementById("formatInfo")!;
    expect(info.textContent).toMatch(/no soporta/i);
    expect(info.textContent).toMatch(/WebM/i);
  });
});
