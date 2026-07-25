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
const RESOLUTION_PIXELS = {
  "1080": 1080,
  "1440": 1440,
  "2160": 2160,
} as const;

/**
 * Redondea a un número par (algunos codificadores requieren dimensiones pares).
 * @param {number} n - Número a redondear.
 * @returns {number} Número par más cercano (mínimo 2).
 */
function toEven(n: number): number {
  const rounded = Math.round(n);
  return Math.max(2, rounded % 2 === 0 ? rounded : rounded + 1);
}

/**
 * Calcula las dimensiones del canvas basado en la configuración.
 *
 * - Horizontal: si se conocen las dimensiones reales de la captura, se respeta
 *   su proporción exacta (sin recortar) y se escala para que el alto no supere
 *   la resolución objetivo. Si no se conocen, se usa 16:9 como referencia.
 * - Vertical: se fuerza 9:16 (el recorte se aplica intencionalmente en drawFrame).
 *
 * @param {RecordingConfig} config - Configuración de la grabación.
 * @param {number} [sourceWidth] - Ancho real del video capturado.
 * @param {number} [sourceHeight] - Alto real del video capturado.
 * @returns {CanvasDimensions} Dimensiones del canvas.
 */
export function calculateCanvasDimensions(
  config: RecordingConfig,
  sourceWidth?: number,
  sourceHeight?: number
): CanvasDimensions {
  const baseRes = RESOLUTION_PIXELS[config.resolution as keyof typeof RESOLUTION_PIXELS];
  const isVertical = config.orientation === "vertical";

  if (isVertical) {
    // Para vertical: ancho = baseRes, alto = baseRes * (16/9) para mantener 9:16
    return {
      width: toEven(baseRes),
      height: toEven(baseRes * (16 / 9)),
    };
  }

  // Horizontal: respetar la proporción real de la captura para NO recortar.
  if (sourceWidth && sourceHeight && sourceWidth > 0 && sourceHeight > 0) {
    // Escalar para que el alto sea como máximo baseRes, sin ampliar más allá del original.
    const scale = Math.min(1, baseRes / sourceHeight);
    return {
      width: toEven(sourceWidth * scale),
      height: toEven(sourceHeight * scale),
    };
  }

  // Sin dimensiones reales todavía: usar 16:9 como referencia.
  return {
    width: toEven(baseRes * (16 / 9)),
    height: toEven(baseRes),
  };
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
 *
 * El video del canvas (`captureStream`) no arrastra el audio de la captura de
 * pantalla. Añadir la pista original directamente falla en algunos navegadores,
 * por lo que se enruta el audio a través de un `AudioContext` con un
 * `MediaStreamDestination`: así se obtiene una pista de audio nueva y estable
 * que sí se inyecta correctamente en el stream que grabará MediaRecorder.
 *
 * @param {MediaStream} canvasStream - Stream del canvas (solo video).
 * @param {MediaStream} originalStream - Stream original de la captura (con audio).
 * @returns {{ stream: MediaStream; audioContext: AudioContext | null }} Stream combinado y el AudioContext creado (para poder cerrarlo después).
 */
export function combineStreams(
  canvasStream: MediaStream,
  originalStream: MediaStream
): { stream: MediaStream; audioContext: AudioContext | null } {
  const combinedStream = new MediaStream();

  // Añadir pistas de video del canvas
  canvasStream.getVideoTracks().forEach((track) => {
    combinedStream.addTrack(track);
  });

  const audioTracks = originalStream.getAudioTracks();
  if (audioTracks.length === 0) {
    return { stream: combinedStream, audioContext: null };
  }

  // Ruta preferida: reencaminar el audio con AudioContext.
  try {
    const AudioCtx = window.AudioContext;
    if (AudioCtx) {
      const audioContext = new AudioCtx();
      const destination = audioContext.createMediaStreamDestination();

      // Solo el audio, para evitar que el navegador intente reproducir el video.
      const audioOnly = new MediaStream(audioTracks);
      const source = audioContext.createMediaStreamSource(audioOnly);
      source.connect(destination);

      destination.stream.getAudioTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });

      // Algunos navegadores crean el contexto en estado "suspended".
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }

      return { stream: combinedStream, audioContext };
    }
  } catch (error) {
    console.warn("No se pudo enrutar el audio con AudioContext, se usará la pista directa:", error);
  }

  // Fallback: añadir la pista de audio original directamente.
  audioTracks.forEach((track) => {
    combinedStream.addTrack(track);
  });

  return { stream: combinedStream, audioContext: null };
}
