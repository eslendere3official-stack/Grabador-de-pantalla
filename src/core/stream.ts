/**
 * Módulo para manejo de streams de video en SCREENREC
 */

import { ERROR_MESSAGES } from "@/config/constants";
import type { RecordingConfig, CanvasDimensions } from "@/types";

/**
 * Calcula las dimensiones del canvas basado en la configuración.
 * @param {RecordingConfig} config - Configuración de la grabación.
 * @returns {CanvasDimensions} Dimensiones del canvas.
 */
export function calculateCanvasDimensions(config: RecordingConfig): CanvasDimensions {
  // Importar aquí para evitar dependencia circular
  const RESOLUTIONS = {
    "1080": { label: "1080p (Full HD)", pixels: 1080 },
    "1440": { label: "1440p (2K)", pixels: 1440 },
    "2160": { label: "2160p (4K)", pixels: 2160 },
  } as const;

  const baseRes = RESOLUTIONS[config.resolution as keyof typeof RESOLUTIONS].pixels;
  const isVertical = config.orientation === "vertical";

  if (isVertical) {
    // Para vertical: ancho = baseRes, alto = baseRes * (16/9) para mantener proporción
    return {
      width: baseRes,
      height: Math.round(baseRes * (16 / 9)),
    };
  } else {
    // Para horizontal: ancho = baseRes * (16/9), alto = baseRes
    return {
      width: Math.round(baseRes * (16 / 9)),
      height: baseRes,
    };
  }
}

/**
 * Obtiene un stream de pantalla con la configuración especificada.
 * @param {RecordingConfig} config - Configuración de la grabación.
 * @returns {Promise<MediaStream>} Stream de pantalla.
 * @throws {Error} Si no se puede obtener el stream.
 */
export async function getDisplayStream(config: RecordingConfig): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_BROWSER);
  }

  // Importar aquí para evitar dependencia circular
  const FRAMERATES = {
    "30": { label: "30 FPS (Estándar)", fps: 30 },
    "60": { label: "60 FPS (Ultra fluido)", fps: 60 },
  } as const;

  const fps = FRAMERATES[config.framerate as keyof typeof FRAMERATES].fps;

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: fps },
        // Intentar obtener la resolución deseada
        width: { ideal: calculateCanvasDimensions(config).width },
        height: { ideal: calculateCanvasDimensions(config).height },
      },
      audio: config.includeAudio,
    });

    // Validar que haya al menos una pista de video
    if (stream.getVideoTracks().length === 0) {
      throw new Error(ERROR_MESSAGES.NO_VIDEO_TRACKS);
    }

    return stream;
  } catch (error) {
    // Manejar error de permiso
    if (error instanceof Error && error.name === "NotAllowedError") {
      throw new Error(ERROR_MESSAGES.PERMISSION_DENIED);
    }
    throw new Error(`${ERROR_MESSAGES.RECORDING_FAILED}: ${error}`);
  }
}

/**
 * Crea un canvas y su contexto para procesar el stream.
 * @param {CanvasDimensions} dimensions - Dimensiones del canvas.
 * @returns {{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }} Canvas y contexto.
 */
export function createCanvas(dimensions: CanvasDimensions): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

/**
 * Dibuja un frame del video en el canvas, aplicando recorte si es necesario.
 * @param {HTMLVideoElement} sourceVideo - Elemento de video fuente.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {CanvasDimensions} canvasDims - Dimensiones del canvas.
 * @param {number} panValue - Valor de pan horizontal (0 a 1).
 */
export function drawFrame(
  sourceVideo: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  canvasDims: CanvasDimensions,
  panValue: number
): void {
  const vw = sourceVideo.videoWidth;
  const vh = sourceVideo.videoHeight;

  if (vw === 0 || vh === 0) {
    return;
  }

  const canvasRatio = canvasDims.width / canvasDims.height;
  const videoRatio = vw / vh;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoRatio > canvasRatio) {
    // El video es más ancho que el canvas (ej: pantalla horizontal en modo vertical)
    sh = vh;
    sw = vh * canvasRatio;
    sx = (vw - sw) * panValue; // Aplicar pan horizontal
    sy = 0;
  } else if (videoRatio < canvasRatio) {
    // El video es más alto que el canvas
    sw = vw;
    sh = vw / canvasRatio;
    sx = 0;
    sy = (vh - sh) / 2;
  }

  // Limpiar el canvas antes de dibujar
  ctx.clearRect(0, 0, canvasDims.width, canvasDims.height);

  // Dibujar el frame recortado
  ctx.drawImage(sourceVideo, sx, sy, sw, sh, 0, 0, canvasDims.width, canvasDims.height);
}

/**
 * Crea un stream a partir de un canvas.
 * @param {HTMLCanvasElement} canvas - Canvas a capturar.
 * @param {number} fps - Fotogramas por segundo.
 * @returns {MediaStream} Stream del canvas.
 */
export function createCanvasStream(canvas: HTMLCanvasElement, fps: number): MediaStream {
  return canvas.captureStream(fps);
}

/**
 * Combina el stream del canvas con el audio del stream original.
 * @param {MediaStream} canvasStream - Stream del canvas.
 * @param {MediaStream} originalStream - Stream original (con audio).
 * @returns {MediaStream} Stream combinado.
 */
export function combineStreams(
  canvasStream: MediaStream,
  originalStream: MediaStream
): MediaStream {
  const combinedStream = new MediaStream();

  // Añadir pistas de video del canvas
  canvasStream.getVideoTracks().forEach((track) => {
    combinedStream.addTrack(track);
  });

  // Añadir pistas de audio del stream original
  originalStream.getAudioTracks().forEach((track) => {
    combinedStream.addTrack(track.clone());
  });

  return combinedStream;
}
