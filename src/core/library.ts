/**
 * Biblioteca de grabaciones de SCREENREC.
 *
 * Las grabaciones se guardan en el navegador (IndexedDB), por lo que
 * **sobreviven a recargar o cerrar la página**. Todo permanece en el equipo del
 * usuario: nada se sube a ningún servidor.
 */

import { createRecordingStore, type RecordingStore, type StoredRecording } from "./storage";

export interface LibraryItem {
  id: string;
  filename: string;
  /** URL temporal para reproducir/descargar. Se regenera en cada sesión. */
  url: string;
  size: number;
  durationSeconds: number;
  createdAt: Date;
}

type LibraryListener = (items: LibraryItem[]) => void;

/**
 * Gestor de la biblioteca de grabaciones.
 */
export class RecordingLibrary {
  private items: LibraryItem[] = [];
  private listeners: Set<LibraryListener> = new Set();
  private store: RecordingStore;
  private ready = false;

  /**
   * @param {RecordingStore} [store] - Almacén a usar (por defecto, el del navegador).
   */
  constructor(store: RecordingStore = createRecordingStore()) {
    this.store = store;
  }

  /**
   * Indica si las grabaciones se conservan al cerrar la página.
   * @returns {boolean} true si el almacenamiento es persistente.
   */
  public get isPersistent(): boolean {
    return this.store.persistent;
  }

  /**
   * Carga las grabaciones guardadas en sesiones anteriores.
   *
   * Es tolerante a fallos: si el almacenamiento no está disponible, la app
   * sigue funcionando con la biblioteca vacía.
   *
   * @returns {Promise<void>} Se resuelve cuando la biblioteca está lista.
   */
  public async init(): Promise<void> {
    if (this.ready) return;

    try {
      const stored = await this.store.getAll();
      this.items = stored.map((record) => this.toItem(record));
    } catch (error) {
      console.warn("No se pudieron cargar las grabaciones guardadas:", error);
      this.items = [];
    }

    this.ready = true;
    this.notify();
  }

  /**
   * Convierte un registro almacenado en un elemento de la biblioteca.
   * @param {StoredRecording} record - Registro del almacén.
   * @returns {LibraryItem} Elemento con URL reproducible.
   */
  private toItem(record: StoredRecording): LibraryItem {
    return {
      id: record.id,
      filename: record.filename,
      url: URL.createObjectURL(record.blob),
      size: record.size,
      durationSeconds: record.durationSeconds,
      createdAt: new Date(record.createdAt),
    };
  }

  /**
   * Suscribe un listener a los cambios de la biblioteca.
   * @param {LibraryListener} listener - Callback invocado con la lista actual.
   * @returns {() => void} Función para desuscribirse.
   */
  public subscribe(listener: LibraryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notifica a los suscriptores.
   */
  private notify(): void {
    const snapshot = this.getAll();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("Error en listener de biblioteca:", error);
      }
    });
  }

  /**
   * Añade una grabación y la guarda en el navegador.
   *
   * @param {object} entry - Datos de la grabación.
   * @param {string} entry.filename - Nombre del archivo.
   * @param {Blob} entry.blob - Contenido del vídeo.
   * @param {number} entry.durationSeconds - Duración en segundos.
   * @returns {Promise<LibraryItem>} Elemento añadido.
   * @throws {Error} Si no hay espacio suficiente para guardarlo.
   */
  public async add(entry: {
    filename: string;
    blob: Blob;
    durationSeconds: number;
  }): Promise<LibraryItem> {
    const record: StoredRecording = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      filename: entry.filename,
      blob: entry.blob,
      size: entry.blob.size,
      durationSeconds: entry.durationSeconds,
      createdAt: Date.now(),
    };

    // Si falla el guardado (por ejemplo, sin espacio) se propaga el error para
    // poder avisar al usuario en lugar de fingir que se guardó.
    await this.store.put(record);

    const item = this.toItem(record);
    this.items.unshift(item);
    this.notify();
    return item;
  }

  /**
   * Renombra una grabación conservando la extensión original.
   * @param {string} id - Identificador del elemento.
   * @param {string} newName - Nombre nuevo (con o sin extensión).
   * @returns {Promise<boolean>} true si se renombró.
   */
  public async rename(id: string, newName: string): Promise<boolean> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return false;

    const clean = newName.trim().replace(/[\\/:*?"<>|]/g, "");
    if (!clean) return false;

    // Conservar la extensión original si el nombre nuevo no la incluye.
    const match = item.filename.match(/\.([a-z0-9]+)$/i);
    const ext = match ? match[0] : "";
    const filename = clean.toLowerCase().endsWith(ext.toLowerCase()) ? clean : `${clean}${ext}`;

    item.filename = filename;

    try {
      await this.store.update(id, { filename });
    } catch (error) {
      console.warn("No se pudo guardar el nombre nuevo:", error);
    }

    this.notify();
    return true;
  }

  /**
   * Elimina una grabación y libera su memoria.
   * @param {string} id - Identificador del elemento.
   * @returns {Promise<boolean>} true si se eliminó.
   */
  public async remove(id: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;

    const [removed] = this.items.splice(index, 1);
    this.revokeUrl(removed.url);

    try {
      await this.store.delete(id);
    } catch (error) {
      console.warn("No se pudo eliminar del almacenamiento:", error);
    }

    this.notify();
    return true;
  }

  /**
   * Vacía la biblioteca liberando la memoria de todos los vídeos.
   * @returns {Promise<void>} Se resuelve al terminar.
   */
  public async clear(): Promise<void> {
    this.items.forEach((item) => this.revokeUrl(item.url));
    this.items = [];

    try {
      await this.store.clear();
    } catch (error) {
      console.warn("No se pudo vaciar el almacenamiento:", error);
    }

    this.notify();
  }

  /**
   * Libera una URL temporal.
   * @param {string} url - URL a liberar.
   */
  private revokeUrl(url: string): void {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Silencioso.
    }
  }

  /**
   * Indica si un elemento existe en la biblioteca.
   * @param {string} id - Identificador.
   * @returns {boolean} true si existe.
   */
  public has(id: string): boolean {
    return this.items.some((item) => item.id === id);
  }

  /**
   * Devuelve todas las grabaciones guardadas.
   * @returns {LibraryItem[]} Copia de la lista.
   */
  public getAll(): LibraryItem[] {
    return [...this.items];
  }

  /**
   * Número de grabaciones guardadas.
   * @returns {number} Total de elementos.
   */
  public count(): number {
    return this.items.length;
  }

  /**
   * Espacio total ocupado por las grabaciones.
   * @returns {number} Bytes ocupados.
   */
  public totalSize(): number {
    return this.items.reduce((sum, item) => sum + item.size, 0);
  }
}

// Instancia compartida
export const library = new RecordingLibrary();
