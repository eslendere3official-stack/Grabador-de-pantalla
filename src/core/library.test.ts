import { describe, it, expect, beforeEach, vi } from "vitest";
import { RecordingLibrary } from "@/core/library";
import { MemoryStore, type RecordingStore } from "@/core/storage";

beforeEach(() => {
  // jsdom no implementa las URLs de objeto.
  URL.createObjectURL = vi.fn(
    (blob: Blob) => `blob:${(blob as Blob & { _name?: string })._name ?? "x"}`
  );
  URL.revokeObjectURL = vi.fn();
});

/**
 * Crea una entrada de prueba.
 * @param {string} name - Nombre del archivo.
 * @returns {object} Datos de la grabación.
 */
function entry(name: string): { filename: string; blob: Blob; durationSeconds: number } {
  const blob = new Blob(["contenido-de-video"], { type: "video/mp4" });
  Object.defineProperty(blob, "_name", { value: name });
  return { filename: name, blob, durationSeconds: 30 };
}

/**
 * Crea una biblioteca con almacén en memoria.
 * @returns {RecordingLibrary} Biblioteca lista para usar.
 */
function makeLibrary(): RecordingLibrary {
  return new RecordingLibrary(new MemoryStore());
}

describe("RecordingLibrary", () => {
  it("empieza vacía", () => {
    const lib = makeLibrary();
    expect(lib.count()).toBe(0);
    expect(lib.getAll()).toEqual([]);
  });

  it("añade elementos con id y fecha, en orden inverso", async () => {
    const lib = makeLibrary();
    await lib.add(entry("uno.mp4"));
    const second = await lib.add(entry("dos.mp4"));

    expect(lib.count()).toBe(2);
    expect(lib.getAll()[0].filename).toBe("dos.mp4");
    expect(second.id).toBeTruthy();
    expect(second.createdAt).toBeInstanceOf(Date);
  });

  it("elimina elementos y libera la memoria del vídeo", async () => {
    const lib = makeLibrary();
    const item = await lib.add(entry("uno.mp4"));

    expect(await lib.remove(item.id)).toBe(true);
    expect(lib.count()).toBe(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(item.url);
  });

  it("devuelve false al eliminar un id inexistente", async () => {
    const lib = makeLibrary();
    expect(await lib.remove("no-existe")).toBe(false);
  });

  it("has() indica si un elemento existe", async () => {
    const lib = makeLibrary();
    const item = await lib.add(entry("uno.mp4"));
    expect(lib.has(item.id)).toBe(true);
    expect(lib.has("otro")).toBe(false);
  });

  it("clear() vacía la biblioteca", async () => {
    const lib = makeLibrary();
    await lib.add(entry("uno.mp4"));
    await lib.add(entry("dos.mp4"));
    await lib.clear();
    expect(lib.count()).toBe(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("notifica a los suscriptores en cada cambio", async () => {
    const lib = makeLibrary();
    const listener = vi.fn();
    const unsubscribe = lib.subscribe(listener);

    const item = await lib.add(entry("uno.mp4"));
    expect(listener).toHaveBeenCalledTimes(1);

    await lib.remove(item.id);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await lib.add(entry("tres.mp4"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("calcula el tamaño total ocupado", async () => {
    const lib = makeLibrary();
    await lib.add(entry("uno.mp4"));
    await lib.add(entry("dos.mp4"));
    expect(lib.totalSize()).toBeGreaterThan(0);
    expect(lib.totalSize()).toBe(lib.getAll().reduce((sum, i) => sum + i.size, 0));
  });

  it("getAll devuelve una copia (no muta el estado interno)", async () => {
    const lib = makeLibrary();
    await lib.add(entry("uno.mp4"));
    const snapshot = lib.getAll();
    snapshot.pop();
    expect(lib.count()).toBe(1);
  });
});

describe("RecordingLibrary - renombrar", () => {
  it("renombra conservando la extensión original", async () => {
    const lib = makeLibrary();
    const item = await lib.add(entry("SCREENREC_2026.mp4"));

    expect(await lib.rename(item.id, "Mi tutorial")).toBe(true);
    expect(lib.getAll()[0].filename).toBe("Mi tutorial.mp4");
  });

  it("no duplica la extensión si ya se incluye", async () => {
    const lib = makeLibrary();
    const item = await lib.add(entry("video.webm"));

    await lib.rename(item.id, "clip.webm");
    expect(lib.getAll()[0].filename).toBe("clip.webm");
  });

  it("elimina caracteres no válidos para un nombre de archivo", async () => {
    const lib = makeLibrary();
    const item = await lib.add(entry("video.mp4"));

    await lib.rename(item.id, 'a/b:c*d?e"f<g>h|i');
    expect(lib.getAll()[0].filename).toBe("abcdefghi.mp4");
  });

  it("rechaza nombres vacíos y ids inexistentes", async () => {
    const lib = makeLibrary();
    const item = await lib.add(entry("video.mp4"));

    expect(await lib.rename(item.id, "   ")).toBe(false);
    expect(await lib.rename("no-existe", "algo")).toBe(false);
    expect(lib.getAll()[0].filename).toBe("video.mp4");
  });
});

describe("RecordingLibrary - persistencia", () => {
  it("recupera las grabaciones guardadas en una sesión anterior", async () => {
    const store = new MemoryStore();

    // Primera sesión: se guarda una grabación.
    const first = new RecordingLibrary(store);
    await first.add(entry("importante.mp4"));

    // Segunda sesión: misma "base de datos", nueva instancia.
    const second = new RecordingLibrary(store);
    expect(second.count()).toBe(0);
    await second.init();

    expect(second.count()).toBe(1);
    expect(second.getAll()[0].filename).toBe("importante.mp4");
  });

  it("el renombrado persiste entre sesiones", async () => {
    const store = new MemoryStore();
    const first = new RecordingLibrary(store);
    const item = await first.add(entry("video.mp4"));
    await first.rename(item.id, "clase de matemáticas");

    const second = new RecordingLibrary(store);
    await second.init();
    expect(second.getAll()[0].filename).toBe("clase de matemáticas.mp4");
  });

  it("lo eliminado no reaparece al recargar", async () => {
    const store = new MemoryStore();
    const first = new RecordingLibrary(store);
    const item = await first.add(entry("video.mp4"));
    await first.remove(item.id);

    const second = new RecordingLibrary(store);
    await second.init();
    expect(second.count()).toBe(0);
  });

  it("propaga el error si no se puede guardar (por ejemplo, sin espacio)", async () => {
    const failing: RecordingStore = {
      persistent: true,
      getAll: async () => [],
      put: async () => {
        throw new Error("QuotaExceededError");
      },
      update: async () => undefined,
      delete: async () => undefined,
      clear: async () => undefined,
    };

    const lib = new RecordingLibrary(failing);
    await expect(lib.add(entry("grande.mp4"))).rejects.toThrow(/Quota/);
    // No debe quedar registrada si no se pudo guardar.
    expect(lib.count()).toBe(0);
  });

  it("arranca vacía y sin lanzar si el almacenamiento falla al leer", async () => {
    const failing: RecordingStore = {
      persistent: true,
      getAll: async () => {
        throw new Error("sin acceso");
      },
      put: async () => undefined,
      update: async () => undefined,
      delete: async () => undefined,
      clear: async () => undefined,
    };

    const lib = new RecordingLibrary(failing);
    await expect(lib.init()).resolves.toBeUndefined();
    expect(lib.count()).toBe(0);
  });

  it("informa de si el almacén es persistente", () => {
    expect(new RecordingLibrary(new MemoryStore()).isPersistent).toBe(false);
  });
});
