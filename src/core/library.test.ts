import { describe, it, expect, beforeEach, vi } from "vitest";
import { SessionLibrary } from "@/core/library";

beforeEach(() => {
  // jsdom no implementa revokeObjectURL.
  URL.revokeObjectURL = vi.fn();
});

/**
 * Crea una entrada de prueba.
 * @param {string} name - Nombre del archivo.
 * @returns {object} Datos de la grabación.
 */
function entry(name: string): {
  filename: string;
  url: string;
  size: number;
  durationSeconds: number;
} {
  return { filename: name, url: `blob:${name}`, size: 1024, durationSeconds: 30 };
}

describe("SessionLibrary", () => {
  it("empieza vacía", () => {
    const lib = new SessionLibrary();
    expect(lib.count()).toBe(0);
    expect(lib.getAll()).toEqual([]);
  });

  it("añade elementos con id y fecha, en orden inverso", () => {
    const lib = new SessionLibrary();
    lib.add(entry("uno.mp4"));
    const second = lib.add(entry("dos.mp4"));

    expect(lib.count()).toBe(2);
    expect(lib.getAll()[0].filename).toBe("dos.mp4");
    expect(second.id).toBeTruthy();
    expect(second.createdAt).toBeInstanceOf(Date);
  });

  it("elimina elementos y libera la memoria del vídeo", () => {
    const lib = new SessionLibrary();
    const item = lib.add(entry("uno.mp4"));

    expect(lib.remove(item.id)).toBe(true);
    expect(lib.count()).toBe(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:uno.mp4");
  });

  it("devuelve false al eliminar un id inexistente", () => {
    const lib = new SessionLibrary();
    expect(lib.remove("no-existe")).toBe(false);
  });

  it("has() indica si un elemento existe", () => {
    const lib = new SessionLibrary();
    const item = lib.add(entry("uno.mp4"));
    expect(lib.has(item.id)).toBe(true);
    expect(lib.has("otro")).toBe(false);
  });

  it("clear() vacía la biblioteca", () => {
    const lib = new SessionLibrary();
    lib.add(entry("uno.mp4"));
    lib.add(entry("dos.mp4"));
    lib.clear();
    expect(lib.count()).toBe(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("notifica a los suscriptores en cada cambio", () => {
    const lib = new SessionLibrary();
    const listener = vi.fn();
    const unsubscribe = lib.subscribe(listener);

    const item = lib.add(entry("uno.mp4"));
    expect(listener).toHaveBeenCalledTimes(1);

    lib.remove(item.id);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    lib.add(entry("tres.mp4"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("renombra conservando la extensión original", () => {
    const lib = new SessionLibrary();
    const item = lib.add(entry("SCREENREC_2026.mp4"));

    expect(lib.rename(item.id, "Mi tutorial")).toBe(true);
    expect(lib.getAll()[0].filename).toBe("Mi tutorial.mp4");
  });

  it("no duplica la extensión si ya se incluye", () => {
    const lib = new SessionLibrary();
    const item = lib.add(entry("video.webm"));

    lib.rename(item.id, "clip.webm");
    expect(lib.getAll()[0].filename).toBe("clip.webm");
  });

  it("elimina caracteres no válidos para un nombre de archivo", () => {
    const lib = new SessionLibrary();
    const item = lib.add(entry("video.mp4"));

    lib.rename(item.id, 'a/b:c*d?e"f<g>h|i');
    expect(lib.getAll()[0].filename).toBe("abcdefghi.mp4");
  });

  it("rechaza nombres vacíos y ids inexistentes", () => {
    const lib = new SessionLibrary();
    const item = lib.add(entry("video.mp4"));

    expect(lib.rename(item.id, "   ")).toBe(false);
    expect(lib.rename("no-existe", "algo")).toBe(false);
    expect(lib.getAll()[0].filename).toBe("video.mp4");
  });

  it("notifica al renombrar", () => {
    const lib = new SessionLibrary();
    const item = lib.add(entry("video.mp4"));
    const listener = vi.fn();
    lib.subscribe(listener);

    lib.rename(item.id, "nuevo");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("getAll devuelve una copia (no muta el estado interno)", () => {
    const lib = new SessionLibrary();
    lib.add(entry("uno.mp4"));
    const snapshot = lib.getAll();
    snapshot.pop();
    expect(lib.count()).toBe(1);
  });
});
