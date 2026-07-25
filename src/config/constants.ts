import type { Orientation, Resolution, Framerate, Bitrate, VideoFormat } from "@/types";

// Nombre de la aplicación
export const APP_NAME = "SCREENREC";
export const APP_VERSION = "2.0.0";
export const APP_DESCRIPTION = "Grabador de pantalla profesional con superpoderes";

// ============================================
// Plan gratuito y monetización
// ============================================

// Segundos gratuitos por día (3 minutos)
export const FREE_DAILY_SECONDS = 180;

// Claves de almacenamiento local
export const STORAGE_KEYS = {
  USAGE: "screenrec_usage_v1",
  PRO: "screenrec_pro_v1",
  SUBSCRIBER: "screenrec_subscriber_v1",
  SIDEBAR: "screenrec_sidebar_v1",
} as const;

// Configuración del plan Pro.
// Pega aquí tu enlace de pago (Lemon Squeezy / Stripe Payment Link) cuando lo tengas.
export const PRO = {
  priceLabel: "4,99 €/mes",
  checkoutUrl: "#", // TODO: reemplazar por tu enlace de pago real
  features: [
    "Grabación ilimitada (sin límite de 3 minutos)",
    "Resolución hasta 4K y 60 FPS",
    "Sin marca de agua",
    "Formato MP4 y WebM de máxima calidad",
    "Soporte prioritario",
  ],
} as const;

// Endpoint opcional para recibir suscripciones por correo (ej: Formspree).
// Si queda vacío, la suscripción se guarda solo localmente.
export const EMAIL_ENDPOINT = "";

// ============================================
// Verificación por código (OTP) vía Formspree
// ============================================

// Endpoint de Formspree. Recibe las solicitudes de Pro en el correo del dueño.
// IMPORTANTE: Formspree entrega los envíos al propietario del formulario, no al
// visitante, por lo que NO sirve para hacerle llegar el código a él.
export const FORMSPREE_ENDPOINT = "https://formspree.io/f/mdaqpaln";

// EmailJS (opcional): sí permite enviar el código al correo del visitante.
// Rellena los tres valores desde https://dashboard.emailjs.com para activar la
// verificación en autoservicio. La plantilla debe usar las variables
// {{to_email}} y {{code}}.
export const EMAILJS = {
  serviceId: "service_wl9ruq2",
  templateId: "template_1e492ud",
  publicKey: "3D12xyOp5zP5x-I1-",
} as const;

/**
 * Canal de entrega del código de verificación:
 * - "visitor": EmailJS configurado, el código llega al usuario (autoservicio).
 * - "owner": solo Formspree, la solicitud llega al dueño (activación manual).
 * - "none": nada configurado.
 */
export type OtpChannel = "visitor" | "owner" | "none";

// Longitud del código de verificación
export const OTP_LENGTH = 6;

// Validez del código (15 minutos, igual que el texto de la plantilla de EmailJS)
export const OTP_TTL_MS = 15 * 60 * 1000;

// Duración máxima de una sola grabación en el plan gratuito (3 minutos)
export const FREE_MAX_RECORDING_SECONDS = 180;

// Opciones del selector de formato de salida
export const FORMAT_OPTIONS: { value: "mp4" | "webm"; label: string }[] = [
  { value: "mp4", label: "MP4 (H.264) - Premiere / CapCut" },
  { value: "webm", label: "WebM (VP9) - Máxima compatibilidad web" },
];

// ============================================
// Iconos SVG (inline, sin dependencias)
// ============================================
export const ICONS: Record<string, string> = {
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  record:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  library:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H4z"/><path d="M2 20h20"/><path d="m10 8 5 3-5 3V8z" fill="currentColor" stroke="none"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  support:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  orientation:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M18 9v6"/><path d="M21 11v2"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  monitor:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  sparkles:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.9 5.8L19.7 11l-5.8 1.9L12 19l-1.9-6.1L4.3 11l5.8-2.2L12 3z"/></svg>',
  volume:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
  download:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  expand:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  chevronLeft:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
};

// Beneficios que rota el banner superior
export const APP_BENEFITS: { icon: string; title: string; text: string }[] = [
  {
    icon: "🎥",
    title: "Graba en calidad profesional",
    text: "Hasta 4K y 60 FPS directamente desde tu navegador.",
  },
  {
    icon: "📱",
    title: "Horizontal y vertical",
    text: "Formato 16:9 para YouTube o 9:16 para Reels y TikTok.",
  },
  {
    icon: "⚡",
    title: "Sin instalar nada",
    text: "Todo funciona online, sin programas ni extensiones.",
  },
  {
    icon: "🔒",
    title: "100% privado",
    text: "Tus grabaciones se procesan en tu equipo, no se suben a ningún servidor.",
  },
  { icon: "✨", title: "Hazte Pro", text: "Desbloquea grabación ilimitada y sin marca de agua." },
];

// Elementos de navegación del panel lateral.
// `action: "modal"` abre la biblioteca en una ventana en vez de cambiar de vista.
export const NAV_ITEMS: { id: string; label: string; icon: string; action?: "view" | "modal" }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", action: "view" },
  { id: "record", label: "Grabar", icon: "record", action: "view" },
  { id: "library", label: "Biblioteca", icon: "library", action: "modal" },
  { id: "settings", label: "Ajustes", icon: "settings", action: "view" },
  { id: "support", label: "Soporte", icon: "support", action: "view" },
];

// Proveedores de correo permitidos (dominios conocidos)
export const ALLOWED_EMAIL_PROVIDERS: string[] = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.es",
  "ymail.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
];

// Dominios de correo temporal/desechable bloqueados
export const DISPOSABLE_EMAIL_DOMAINS: string[] = [
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mailnesia.com",
];

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
  "30000000": { label: "Sin pérdidas (30 Mbps)", bps: 30_000_000 },
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
  format: "mp4" as VideoFormat,
};

// Duración de los chunks de grabación (ms)
export const CHUNK_DURATION_MS = 1000;

// ============================================
// Calidad de audio
// ============================================

// Bitrate de audio (192 kbps: calidad de música en estéreo).
// Sin especificarlo, los navegadores usan valores bajos pensados para voz.
export const AUDIO_BITRATE = 192_000;

// Frecuencia de muestreo estándar de audio digital (48 kHz).
// Coincidir con la fuente evita remuestreos que degradan el sonido.
export const AUDIO_SAMPLE_RATE = 48_000;

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
