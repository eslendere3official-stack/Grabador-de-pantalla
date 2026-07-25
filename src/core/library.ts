/**
 * Biblioteca de sesión para SCREENREC.
 *
 * Guarda temporalmente las grabaciones que el usuario no descarga al momento.
 * Los vídeos viven en memoria (object URLs), por lo que se pierden al recargar
 * la página; se avisa de ello en la interfaz.
 */

export interface LibraryItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  durationSeconds: number;
  createdAt: Date;
}

type LibraryListener = (items: LibraryItem[]) => void;

/**
 * Gestor de la biblioteca de sesión.
 */
export class SessionLibrary {
  private items: LibraryItem[] = [];
  private listeners: Set<LibraryListener> = new Set();

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
   * Añade una grabación a la biblioteca.
   * @param {Omit<LibraryItem, "id" | "createdAt">} entry - Datos de la grabación.
   * @returns {LibraryItem} Elemento añadido.
   */
  public add(entry: Omit<LibraryItem, "id" | "createdAt">): LibraryItem {
    const item: LibraryItem = {
      ...entry,
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date(),
    };
    this.items.unshift(item);
    this.notify();
    return item;
  }

  /**
   * Elimina una grabación y libera su memoria.
   * @param {string} id - Identificador del elemento.
   * @returns {boolean} true si se eliminó.
   */
  public remove(id: string): boolean {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;

    const [removed] = this.items.splice(index, 1);
    try {
      URL.revokeObjectURL(removed.url);
    } catch {
      // Silencioso.
    }
    this.notify();
    return true;
  }

  /**
   * Renombra una grabación conservando la extensión original.
   * @param {string} id - Identificador del elemento.
   * @param {string} newName - Nombre nuevo (con o sin extensión).
   * @returns {boolean} true si se renombró.
   */
  public rename(id: string, newName: string): boolean {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return false;

    const clean = newName.trim().replace(/[\\/:*?"<>|]/g, "");
    if (!clean) return false;

    // Conservar la extensión original si el nombre nuevo no la incluye.
    const match = item.filename.match(/\.([a-z0-9]+)$/i);
    const ext = match ? match[0] : "";
    item.filename = clean.toLowerCase().endsWith(ext.toLowerCase()) ? clean : `${clean}${ext}`;

    this.notify();
    return true;
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
   * Vacía la biblioteca liberando la memoria de todos los vídeos.
   */
  public clear(): void {
    this.items.forEach((item) => {
      try {
        URL.revokeObjectURL(item.url);
      } catch {
        // Silencioso.
      }
    });
    this.items = [];
    this.notify();
  }
}

// Instancia compartida
export const library = new SessionLibrary();
