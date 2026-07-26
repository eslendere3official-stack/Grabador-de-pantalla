/**
 * Comportamiento en móviles.
 *
 * Ningún navegador móvil permite capturar la pantalla desde una web, así que la
 * app debe explicarlo con claridad y seguir siendo utilizable (biblioteca,
 * perfil y ayuda) en lugar de mostrar un muro de "navegador no soportado".
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HTML_PATH = resolve(__dirname, "../../index.html");

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 15; SM-A366B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

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

/**
 * Simula un dispositivo concreto.
 * @param {string} userAgent - User agent a simular.
 * @param {boolean} mobile - Valor de userAgentData.mobile.
 */
function stubDevice(userAgent: string, mobile: boolean): void {
  vi.stubGlobal("navigator", {
    userAgent,
    userAgentData: { mobile },
    maxTouchPoints: mobile ? 5 : 0,
    mediaDevices: { getDisplayMedia: vi.fn() },
  });
}

beforeEach(() => {
  document.body.innerHTML = loadBodyMarkup();
  localStorage.clear();
  vi.stubGlobal("MediaRecorder", {
    isTypeSupported: (type: string) => type.includes("webm"),
  });
  (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  vi.resetModules();
});

describe("En un móvil Android", () => {
  it("detecta el dispositivo como móvil y descarta la captura de pantalla", async () => {
    stubDevice(ANDROID_UA, true);
    const { isMobileDevice, canCaptureScreen } = await import("@/utils/detect");

    expect(isMobileDevice()).toBe(true);
    // getDisplayMedia existe en Android pero siempre rechaza: no sirve.
    expect(canCaptureScreen()).toBe(false);
  });

  it("no bloquea la app: mantiene la interfaz y desactiva solo el grabar", async () => {
    stubDevice(ANDROID_UA, true);
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    // La app sigue en pie (antes se reemplazaba todo el body por un error).
    expect(document.getElementById("app")).not.toBeNull();
    expect(document.querySelectorAll(".nav-item").length).toBeGreaterThan(0);

    const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);
  });

  it("explica el motivo y qué hacer en su lugar", async () => {
    stubDevice(ANDROID_UA, true);
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    const notice = document.getElementById("captureNotice")!;
    expect(notice.style.display).toBe("flex");

    const text = notice.textContent ?? "";
    expect(text).toMatch(/móvil/i);
    expect(text).toMatch(/ordenador/i);
    // Debe sugerir el grabador integrado del teléfono.
    expect(text).toMatch(/grabador/i);
  });

  it("retira toda la interfaz de captura, dejando solo el aviso", async () => {
    stubDevice(ANDROID_UA, true);
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    // Sin posibilidad de grabar, la vista previa y los ajustes no aportan nada.
    const stage = document.querySelector<HTMLElement>(".stage-card")!;
    expect(stage.style.display).toBe("none");
    expect(document.getElementById("configPanel")!.style.display).toBe("none");

    // El aviso sí se muestra, dentro de la pestaña Grabar.
    const notice = document.getElementById("captureNotice")!;
    expect(notice.style.display).toBe("flex");
    expect(document.getElementById("view-dashboard")!.contains(notice)).toBe(true);

    // Y el layout deja de reservar la columna de configuración.
    expect(document.getElementById("app")!.classList.contains("no-config")).toBe(true);
    expect(document.getElementById("app")!.classList.contains("no-capture")).toBe(true);
  });

  it("permite seguir usando la biblioteca y la ayuda", async () => {
    stubDevice(ANDROID_UA, true);
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    document.querySelector<HTMLButtonElement>('.nav-item[data-view="library"]')!.click();
    expect(document.getElementById("view-library")!.style.display).toBe("flex");

    document.querySelector<HTMLButtonElement>('.nav-item[data-view="support"]')!.click();
    expect(document.querySelectorAll(".faq-item").length).toBeGreaterThan(0);
  });
});

describe("En un ordenador", () => {
  it("permite grabar y no muestra el aviso", async () => {
    stubDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      false
    );
    const { Dashboard } = await import("./dashboard");
    new Dashboard();

    const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
    expect(startBtn.disabled).toBe(false);
    expect(document.getElementById("captureNotice")!.style.display).toBe("none");
  });
});
