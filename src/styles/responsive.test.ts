/**
 * Contrato de la maquetación adaptable.
 *
 * No se puede comprobar el resultado renderizado desde las pruebas, así que se
 * verifica que las reglas clave del diseño adaptable existan y sean coherentes.
 * Sirve para detectar regresiones como la proporción del vídeo en móvil.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS_PATH = resolve(__dirname, "./main.css");
const HTML_PATH = resolve(__dirname, "../../index.html");

let css = "";
let html = "";

/**
 * Extrae el contenido de una media query.
 * @param {string} condition - Condición, p. ej. "max-width: 680px".
 * @returns {string} Contenido del bloque.
 */
function mediaBlock(condition: string): string {
  const start = css.indexOf(`@media (${condition})`);
  if (start === -1) return "";

  // Recorre el bloque contando llaves para respetar las reglas anidadas.
  let depth = 0;
  let i = css.indexOf("{", start);
  const from = i;
  for (; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(from, i);
    }
  }
  return "";
}

beforeAll(() => {
  css = readFileSync(CSS_PATH, "utf-8");
  html = readFileSync(HTML_PATH, "utf-8");
});

describe("Estructura adaptable", () => {
  it("declara los puntos de ruptura de tablet y móvil", () => {
    expect(css).toContain("@media (max-width: 1024px)");
    expect(css).toContain("@media (max-width: 680px)");
  });

  it("incluye el viewport con soporte para pantallas con muesca", () => {
    expect(html).toMatch(/name="viewport"[^>]*width=device-width/);
    expect(html).toMatch(/viewport-fit=cover/);
  });

  it("permite el desplazamiento vertical fuera del escritorio", () => {
    // En escritorio se bloquea el scroll (layout de pantalla completa),
    // pero al apilarse el contenido debe poder desplazarse.
    expect(css).toMatch(/body \{[^}]*overflow: hidden/s);
    expect(mediaBlock("max-width: 1024px")).toMatch(/body \{\s*overflow: auto/);
  });

  it("apila las columnas en tablet y móvil", () => {
    const tablet = mediaBlock("max-width: 1024px");
    expect(tablet).toMatch(/flex-direction: column/);
    expect(tablet).toMatch(/min-height: 100vh/);
  });

  it("convierte las rejillas en una sola columna en móvil", () => {
    const mobile = mediaBlock("max-width: 680px");
    ["col-2", "stat-grid", "panel-grid", "faq-layout", "data-list-split", "gallery-grid"].forEach(
      (cls) => {
        expect(mobile, `falta el ajuste de .${cls}`).toContain(cls);
      }
    );
    expect(mobile).toMatch(/grid-template-columns: 1fr/);
  });
});

describe("Menú inferior en móvil", () => {
  it("fija el menú abajo de la pantalla", () => {
    const mobile = mediaBlock("max-width: 680px");
    expect(mobile).toMatch(/\.sidebar \{[^}]*position: fixed/s);
    expect(mobile).toMatch(/\.sidebar \{[^}]*bottom: 0/s);
  });

  it("muestra las etiquetas de navegación en la barra inferior", () => {
    const mobile = mediaBlock("max-width: 680px");
    expect(mobile).toMatch(/\.nav-label,\s*\.app\.collapsed \.nav-label \{\s*display: block/);
  });

  it("respeta el área segura del dispositivo", () => {
    const mobile = mediaBlock("max-width: 680px");
    expect(mobile).toContain("env(safe-area-inset-bottom");
  });

  it("coloca el botón de grabar encima del menú, no debajo", () => {
    const mobile = mediaBlock("max-width: 680px");
    expect(mobile).toMatch(/\.stage-actions \{[^}]*position: fixed/s);
    expect(mobile).toMatch(/bottom: calc\(var\(--mobile-nav-h\)/);
  });

  it("evita que las ventanas queden tapadas por el menú", () => {
    const mobile = mediaBlock("max-width: 680px");
    expect(mobile).toMatch(/\.modal-overlay \{[^}]*var\(--mobile-nav-h\)/s);
  });
});

describe("Proporción del vídeo en móvil", () => {
  it("usa 16:9 por defecto y 9:16 solo en vertical", () => {
    const mobile = mediaBlock("max-width: 680px");

    const base = mobile.match(/\.video-stage \{([^}]*)\}/s)?.[1] ?? "";
    const vertical = mobile.match(/\.video-stage\.vertical \{([^}]*)\}/s)?.[1] ?? "";

    // Este era el fallo: se forzaba 9:16 aunque se grabara en horizontal.
    expect(base).toMatch(/aspect-ratio: 16 \/ 9/);
    expect(vertical).toMatch(/aspect-ratio: 9 \/ 16/);
  });

  it("limita la altura para que quepan los controles", () => {
    const mobile = mediaBlock("max-width: 680px");
    expect(mobile).toMatch(/max-height: \d+vh/);
  });
});

describe("Limpieza de estilos obsoletos", () => {
  it("no quedan referencias a contenedores ya eliminados", () => {
    // Estos bloques se reemplazaron; si reaparecen, hay estilos huérfanos.
    [
      "config-foot",
      "collapse-item",
      "stage-footer",
      "pill-ghost",
      "tool-row",
      "tool-status-ok",
      "plan-summary",
      "faq-columns",
      "tools-info",
      "tools-grid",
      "settings-actions",
      "detail-row",
    ].forEach((cls) => {
      expect(css, `.${cls} debería haberse eliminado del CSS`).not.toContain(`.${cls}`);
    });
  });
});

describe("Alineación de los paneles", () => {
  it("las tarjetas no se estiran a la altura de la más alta", () => {
    // Era la causa del aspecto irregular: las tarjetas de una fila se
    // estiraban hasta igualar la más alta, dejando huecos desparejos.
    const panelGrid = css.match(/\.panel-grid \{([^}]*)\}/s)?.[1] ?? "";
    const faqLayout = css.match(/\.faq-layout \{([^}]*)\}/s)?.[1] ?? "";

    expect(panelGrid).toMatch(/align-items: start/);
    expect(faqLayout).toMatch(/align-items: start/);
  });

  it("los valores de las listas de datos quedan alineados en rejilla", () => {
    const dataRow = css.match(/\.data-row \{([^}]*)\}/s)?.[1] ?? "";
    expect(dataRow).toMatch(/display: grid/);
    expect(dataRow).toMatch(/grid-template-columns: 1fr auto/);
  });

  it("las tarjetas de panel usan un sangrado uniforme", () => {
    const head = css.match(/\.panel-card-head \{([^}]*)\}/s)?.[1] ?? "";
    const body = css.match(/\.panel-card-body \{([^}]*)\}/s)?.[1] ?? "";

    // Misma sangría horizontal en cabecera y cuerpo: bordes exactos.
    const horizontal = (rule: string): string =>
      rule.match(/padding: *[\d.]+px +([\d.]+px)/)?.[1] ?? "";
    expect(horizontal(head)).toBe(horizontal(body));
    expect(horizontal(head)).not.toBe("");
  });
});
