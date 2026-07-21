import type { Orientation, Resolution, Framerate, Bitrate } from "@/types";

// Nombre de la aplicación
export const APP_NAME = "SCREENREC";
export const APP_VERSION = "1.0.0";
export const APP_DESCRIPTION = "Grabador de pantalla profesional con superpoderes";

// Opciones de orientación
export const ORIENTATIONS: Record<Orientation, { label: string; ratio: number }> = {
  horizontal: { label: "Horizontal 16:9 (YouTube)", ratio: 16 / 9 },
  vertical: { label: "Vertical 9:16 (Reels/TikTok)", ratio: 9 / 16 },
} as const;

// Opciones de resolución (píxeles verticales para horizontal, píxeles horizontales para vertical)
export const RESOLUTIONS: Record<Resolution, { label: string; pixels: number }> = {
  "1080": { label: "1080p (Full HD)", pixels: 1080 },
  "1440": { label: "1440p (2K)", pixels: 1440 },
  "2160": { label: "2160p (4K)", pixels: 2160 },
} as const;

// Opciones de FPS
export const FRAMERATES: Record<Framerate, { label: string; fps: number }> = {
  "30": { label: "30 FPS (Estándar)", fps: 30 },
  "60": { label: "60 FPS (Ultra fluido)", fps: 60 },
} as const;

// Opciones de bitrate (en bits por segundo)
export const BITRATES: Record<Bitrate, { label: string; bps: number }> = {
  "8000000": { label: "Alta (8 Mbps)", bps: 8_000_000 },
  "16000000": { label: "Extrema (16 Mbps)", bps: 16_000_000 },
  "30000000": { label: "Sin Pérdidas (30 Mbps)", bps: 30_000_000 },
} as const;

// Formatos de video soportados (en orden de preferencia)
export const VIDEO_FORMATS: { mimeType: string; ext: string; label: string }[] = [
  { mimeType: "video/mp4;codecs=avc1.42E01E", ext: "mp4", label: "MP4 (H.264, AVC)" },
  { mimeType: "video/mp4;codecs=h264", ext: "mp4", label: "MP4 (H.264)" },
  { mimeType: "video/mp4", ext: "mp4", label: "MP4" },
  { mimeType: "video/webm;codecs=vp9", ext: "webm", label: "WebM (VP9)" },
  { mimeType: "video/webm;codecs=vp8", ext: "webm", label: "WebM (VP8)" },
  { mimeType: "video/webm", ext: "webm", label: "WebM" },
];

// Configuración por defecto
export const DEFAULT_CONFIG = {
  orientation: "horizontal" as Orientation,
  resolution: "1080" as Resolution,
  framerate: "60" as Framerate,
  bitrate: "16000000" as Bitrate,
  includeAudio: true,
};

// Duración de los chunks de grabación (ms)
export const CHUNK_DURATION_MS = 1000;

// Tiempo máximo de grabación (ms) - 1 hora por defecto
export const MAX_RECORDING_DURATION_MS = 60 * 60 * 1000;

// Mensajes de error
export const ERROR_MESSAGES = {
  UNSUPPORTED_BROWSER: "Tu navegador no soporta la grabación de pantalla.",
  PERMISSION_DENIED: "Permiso denegado. Por favor, permite el acceso a la pantalla.",
  NO_VIDEO_TRACKS: "No se detectaron pistas de video.",
  RECORDING_FAILED: "Error al iniciar la grabación.",
  PROCESSING_FAILED: "Error al procesar el video.",
  UNSUPPORTED_FORMAT: "Formato de video no soportado.",
} as const;
