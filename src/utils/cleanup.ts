/**
 * Funciones de limpieza de recursos para SCREENREC
 * Garantiza que no haya fugas de memoria.
 */

/**
 * Revoca una ObjectURL y la elimina de la memoria.
 * @param {string | null} url - URL a revocar.
 */
export function revokeObjectUrl(url: string | null): void {
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn("Error al revocar ObjectURL:", error);
    }
  }
}

/**
 * Detiene todas las pistas de un MediaStream.
 * @param {MediaStream | null} stream - Stream a limpiar.
 */
export function stopMediaStreamTracks(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (error) {
        console.warn("Error al detener pista de media:", error);
      }
    });
  }
}

/**
 * Limpia todos los recursos relacionados con una grabación.
 * @param {string | null} url - ObjectURL a revocar.
 * @param {MediaStream | null} stream - Stream a detener.
 * @param {MediaStream | null} canvasStream - Stream del canvas a detener.
 */
export function cleanupRecordingResources(
  url: string | null,
  stream: MediaStream | null,
  canvasStream: MediaStream | null
): void {
  revokeObjectUrl(url);
  stopMediaStreamTracks(stream);
  stopMediaStreamTracks(canvasStream);
}

/**
 * Limpia un canvas y su contexto.
 * @param {HTMLCanvasElement | null} canvas - Canvas a limpiar.
 */
export function clearCanvas(canvas: HTMLCanvasElement | null): void {
  if (canvas) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 1;
    canvas.height = 1;
  }
}
