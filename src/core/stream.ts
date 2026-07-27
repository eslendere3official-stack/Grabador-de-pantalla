/**
 * Módulo para manejo de streams de video en SCREENREC
 */

import {
  ERROR_MESSAGES,
  AUDIO_SAMPLE_RATE,
  WEBCAM_SIZES,
  WEBCAM_MARGIN_RATIO,
} from "@/config/constants";
import type { RecordingConfig, CanvasDimensions, WebcamPosition, WebcamSize } from "@/types";

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
      // El audio del sistema (música, vídeo, juegos) NO debe pasar por el
      // procesado de voz del navegador: la cancelación de eco, la supresión de
      // ruido y el control automático de ganancia están pensados para
      // micrófonos y degradan mucho la calidad. Se desactivan y se pide
      // 48 kHz en estéreo.
      audio: config.includeAudio
        ? {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: AUDIO_SAMPLE_RATE,
            channelCount: 2,
          }
        : false,
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
 * Obtiene el stream de la webcam para el modo creador.
 * @returns {Promise<MediaStream>} Stream de la cámara.
 * @throws {Error} Si no hay cámara o se deniega el permiso.
 */
export async function getWebcamStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Tu navegador no permite usar la cámara.");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        // Cuadrado: el recorte circular aprovecha mejor una imagen 1:1.
        width: { ideal: 720 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      throw new Error("No has dado permiso para usar la cámara.");
    }
    throw new Error("No se pudo acceder a la cámara.");
  }
}

/**
 * Obtiene el stream del micrófono para narrar.
 *
 * Aquí sí interesa el procesado de voz del navegador (cancelación de eco y
 * supresión de ruido), al contrario que con el audio del sistema.
 *
 * @returns {Promise<MediaStream>} Stream del micrófono.
 * @throws {Error} Si no hay micrófono o se deniega el permiso.
 */
export async function getMicStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Tu navegador no permite usar el micrófono.");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      throw new Error("No has dado permiso para usar el micrófono.");
    }
    throw new Error("No se pudo acceder al micrófono.");
  }
}

/**
 * Dibuja la webcam recortada en círculo sobre el canvas.
 *
 * Se recorta el centro del vídeo para que el círculo no deforme la imagen, y se
 * añade un borde y una sombra suaves para separarla del fondo.
 *
 * @param {HTMLVideoElement} webcamVideo - Vídeo de la cámara.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {CanvasDimensions} canvasDims - Dimensiones del canvas.
 * @param {WebcamPosition} position - Esquina donde colocarla.
 * @param {WebcamSize} size - Tamaño relativo del círculo.
 */
export function drawWebcamOverlay(
  webcamVideo: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  canvasDims: CanvasDimensions,
  position: WebcamPosition,
  size: WebcamSize
): void {
  const vw = webcamVideo.videoWidth;
  const vh = webcamVideo.videoHeight;
  if (vw === 0 || vh === 0) return;

  const minSide = Math.min(canvasDims.width, canvasDims.height);
  const ratio = WEBCAM_SIZES.find((option) => option.value === size)?.ratio ?? 0.22;
  const diameter = Math.round(minSide * ratio);
  const radius = diameter / 2;
  const margin = Math.round(minSide * WEBCAM_MARGIN_RATIO);

  // Posición del círculo según la esquina elegida.
  const isRight = position.endsWith("right");
  const isBottom = position.startsWith("bottom");
  const cx = isRight ? canvasDims.width - margin - radius : margin + radius;
  const cy = isBottom ? canvasDims.height - margin - radius : margin + radius;

  // Recorte central cuadrado de la cámara, para no deformar la imagen.
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  ctx.save();

  // Sombra suave para despegar el círculo del fondo.
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = Math.round(diameter * 0.12);
  ctx.shadowOffsetY = Math.round(diameter * 0.03);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  // El relleno proyecta la sombra; la imagen se dibuja encima.
  ctx.fillStyle = "#000";
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.clip();
  ctx.drawImage(webcamVideo, sx, sy, side, side, cx - radius, cy - radius, diameter, diameter);
  ctx.restore();

  // Borde del círculo.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(2, Math.round(diameter * 0.025));
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.stroke();
  ctx.restore();
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
  originalStream: MediaStream,
  micStream?: MediaStream | null
): { stream: MediaStream; audioContext: AudioContext | null } {
  const combinedStream = new MediaStream();

  // Añadir pistas de video del canvas
  canvasStream.getVideoTracks().forEach((track) => {
    combinedStream.addTrack(track);
  });

  const systemTracks = originalStream.getAudioTracks();
  const micTracks = micStream?.getAudioTracks() ?? [];

  if (systemTracks.length === 0 && micTracks.length === 0) {
    return { stream: combinedStream, audioContext: null };
  }

  // Ruta preferida: mezclar las fuentes con AudioContext.
  try {
    const AudioCtx = window.AudioContext;
    if (AudioCtx) {
      // Fijar 48 kHz para que el contexto no remuestree el audio original.
      const audioContext = new AudioCtx({ sampleRate: AUDIO_SAMPLE_RATE });
      const destination = audioContext.createMediaStreamDestination();

      // Ambas fuentes se conectan al mismo destino, por lo que se mezclan en
      // una única pista: así el vídeo lleva el audio del sistema y la voz.
      if (systemTracks.length > 0) {
        const systemSource = audioContext.createMediaStreamSource(new MediaStream(systemTracks));
        systemSource.connect(destination);
      }

      if (micTracks.length > 0) {
        const micSource = audioContext.createMediaStreamSource(new MediaStream(micTracks));
        // La voz se realza un poco para que no la tape el audio del sistema.
        const micGain = audioContext.createGain();
        micGain.gain.value = 1.3;
        micSource.connect(micGain);
        micGain.connect(destination);
      }

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
    console.warn("No se pudo mezclar el audio con AudioContext, se usará la pista directa:", error);
  }

  // Fallback: añadir las pistas directamente (sin mezcla).
  [...systemTracks, ...micTracks].forEach((track) => {
    combinedStream.addTrack(track);
  });

  return { stream: combinedStream, audioContext: null };
}
