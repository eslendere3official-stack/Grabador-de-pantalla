// Tipos globales para SCREENREC

export type Orientation = "horizontal" | "vertical";
export type Resolution = "1080" | "1440" | "2160"; // FHD, QHD, UHD
export type Framerate = "30" | "60"; // FPS
export type Bitrate = "8000000" | "16000000" | "30000000"; // 8, 16, 30 Mbps
export type VideoFormat = "mp4" | "webm";

// Configuración de la grabación
export interface RecordingConfig {
  orientation: Orientation;
  resolution: Resolution;
  framerate: Framerate;
  bitrate: Bitrate;
  includeAudio: boolean;
  /** Formato preferido de salida. Si el navegador no lo soporta, se hace fallback. */
  format: VideoFormat;

  // ===== Modo creador de contenido =====
  /** Superpone la webcam en un círculo sobre la grabación. */
  webcam: boolean;
  /** Esquina donde se coloca el círculo de la webcam. */
  webcamPosition: WebcamPosition;
  /** Tamaño del círculo de la webcam, relativo al vídeo. */
  webcamSize: WebcamSize;
  /** Graba también el micrófono (para narrar). */
  includeMic: boolean;
  /** Segundos de cuenta atrás antes de empezar a grabar. */
  countdown: boolean;
}

export type WebcamPosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";
export type WebcamSize = "small" | "medium" | "large";

// Formato resuelto por el detector
export interface ResolvedFormat {
  mimeType: string;
  ext: VideoFormat;
  label: string;
  /** true si hubo que cambiar el formato pedido por falta de soporte */
  fellBack: boolean;
}

// Resultado de la grabación
export interface RecordingResult {
  blob: Blob;
  filename: string;
  ext: VideoFormat;
  url: string;
}

// Estado del grabador
export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  currentTime: number;
  error: Error | null;
  panValue: number;
}

// Dimensiones del canvas
export interface CanvasDimensions {
  width: number;
  height: number;
}

// Eventos del grabador
export type RecorderEvent = "start" | "stop" | "pause" | "resume" | "error";

// Callback para eventos
export type RecorderEventCallback = (event: RecorderEvent, data?: unknown) => void;
