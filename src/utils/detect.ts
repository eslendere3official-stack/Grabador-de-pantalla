/**
 * Funciones de detección de capacidades del navegador para SCREENREC
 */

import { VIDEO_FORMATS } from "@/config/constants";

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
