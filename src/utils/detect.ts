/**
 * Funciones de detección de capacidades del navegador para SCREENREC
 */

import { VIDEO_FORMATS } from "@/config/constants";
import type { ResolvedFormat } from "@/types";

/**
 * Detecta si el navegador soporta la API getDisplayMedia.
 * @returns {boolean} True si está soportado.
 */
export function isDisplayMediaSupported(): boolean {
  return !!navigator.mediaDevices?.getDisplayMedia;
}

/**
 * Detecta si el navegador soporta MediaRecorder.
 * @returns {boolean} True si está soportado.
 */
export function isMediaRecorderSupported(): boolean {
  return !!window.MediaRecorder;
}

/**
 * Detecta si el navegador soporta la API Canvas captureStream.
 * @returns {boolean} True si está soportado.
 */
export function isCanvasCaptureStreamSupported(): boolean {
  return !!HTMLCanvasElement.prototype.captureStream;
}

/**
 * Detecta si el navegador soporta AudioContext.
 * @returns {boolean} True si está soportado.
 */
export function isAudioContextSupported(): boolean {
  return !!window.AudioContext;
}

/**
 * Detecta el mejor formato de video soportado por el navegador.
 * @returns {{ mimeType: string; ext: string; label: string }} Mejor formato soportado.
 */
export function detectBestFormat(): { mimeType: string; ext: string; label: string } {
  for (const format of VIDEO_FORMATS) {
    if (MediaRecorder.isTypeSupported(format.mimeType)) {
      return format;
    }
  }
  // Fallback a WebM si no se encuentra nada
  return VIDEO_FORMATS.find((f) => f.ext === "webm")!;
}

/**
 * Indica si un formato concreto (por extensión) está soportado.
 * @param {("mp4"|"webm")} ext - Extensión deseada.
 * @returns {boolean} True si hay algún mimeType soportado para esa extensión.
 */
export function isFormatSupported(ext: "mp4" | "webm"): boolean {
  return VIDEO_FORMATS.some(
    (format) => format.ext === ext && MediaRecorder.isTypeSupported(format.mimeType)
  );
}

/**
 * Resuelve el formato de salida a partir del preferido, con fallback inteligente.
 *
 * Si el formato pedido no está soportado por el navegador, se devuelve el mejor
 * formato disponible marcando `fellBack: true` para poder avisar en la interfaz.
 *
 * @param {("mp4"|"webm")} preferred - Formato solicitado por el usuario.
 * @returns {ResolvedFormat} Formato definitivo a usar.
 */
export function resolveFormat(preferred: "mp4" | "webm"): ResolvedFormat {
  const match = VIDEO_FORMATS.find(
    (format) => format.ext === preferred && MediaRecorder.isTypeSupported(format.mimeType)
  );

  if (match) {
    return { ...match, ext: match.ext as "mp4" | "webm", fellBack: false };
  }

  const best = detectBestFormat();
  return {
    ...best,
    ext: best.ext as "mp4" | "webm",
    fellBack: best.ext !== preferred,
  };
}

/**
 * Verifica si el navegador soporta todas las APIs necesarias para SCREENREC.
 * @returns {boolean} True si todo está soportado.
 */
export function isBrowserSupported(): boolean {
  return (
    isDisplayMediaSupported() && isMediaRecorderSupported() && isCanvasCaptureStreamSupported()
  );
}

/**
 * Obtiene información detallada sobre el soporte del navegador.
 * @returns {Record<string, boolean>} Objeto con el estado de cada API.
 */
export function getBrowserSupportInfo(): Record<string, boolean> {
  return {
    displayMedia: isDisplayMediaSupported(),
    mediaRecorder: isMediaRecorderSupported(),
    canvasCaptureStream: isCanvasCaptureStreamSupported(),
    audioContext: isAudioContextSupported(),
  };
}
