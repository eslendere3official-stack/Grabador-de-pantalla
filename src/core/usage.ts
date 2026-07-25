/**
 * Módulo de control del plan gratuito para SCREENREC.
 *
 * Gestiona los créditos diarios de grabación gratuita (3 minutos) usando
 * localStorage. Los créditos se reinician automáticamente cada día.
 *
 * NOTA: al ser un sitio estático (sin servidor), este control vive en el
 * navegador y es evitable por usuarios avanzados. Es suficiente para un MVP;
 * para un control estricto se necesitaría un backend.
 */

import { FREE_DAILY_SECONDS, FREE_MAX_RECORDING_SECONDS, STORAGE_KEYS } from "@/config/constants";

interface UsageRecord {
  date: string;
  usedSeconds: number;
}

/**
 * Devuelve la fecha de hoy como clave YYYY-MM-DD (hora local).
 * @returns {string} Fecha actual.
 */
function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Indica si localStorage está disponible.
 * @returns {boolean} true si se puede usar localStorage.
 */
function hasStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Carga el registro de uso del día actual (reinicia si cambió el día).
 * @returns {UsageRecord} Registro de uso de hoy.
 */
function loadUsage(): UsageRecord {
  const today = getTodayKey();
  const fallback: UsageRecord = { date: today, usedSeconds: 0 };

  if (!hasStorage()) {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USAGE);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<UsageRecord>;
    if (parsed.date !== today || typeof parsed.usedSeconds !== "number") {
      return fallback;
    }
    return { date: today, usedSeconds: Math.max(0, parsed.usedSeconds) };
  } catch {
    return fallback;
  }
}

/**
 * Guarda el registro de uso.
 * @param {UsageRecord} record - Registro a guardar.
 */
function saveUsage(record: UsageRecord): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(record));
  } catch {
    // Silencioso: almacenamiento no disponible o lleno.
  }
}

/**
 * Indica si el usuario tiene el plan Pro activo (desbloqueo local).
 * @returns {boolean} true si es Pro.
 */
export function isPro(): boolean {
  if (!hasStorage()) return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.PRO) === "true";
  } catch {
    return false;
  }
}

/**
 * Activa o desactiva el plan Pro (desbloqueo local).
 * @param {boolean} value - true para activar Pro.
 */
export function setPro(value: boolean): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.PRO, value ? "true" : "false");
  } catch {
    // Silencioso.
  }
}

/**
 * Límite diario de segundos gratuitos.
 * @returns {number} Segundos del plan gratuito por día.
 */
export function getDailyLimitSeconds(): number {
  return FREE_DAILY_SECONDS;
}

/**
 * Segundos ya consumidos hoy.
 * @returns {number} Segundos usados hoy.
 */
export function getUsedSeconds(): number {
  return loadUsage().usedSeconds;
}

/**
 * Segundos restantes hoy. Los usuarios Pro tienen tiempo ilimitado.
 * @returns {number} Segundos restantes (Infinity si es Pro).
 */
export function getRemainingSeconds(): number {
  if (isPro()) return Infinity;
  const used = getUsedSeconds();
  return Math.max(0, FREE_DAILY_SECONDS - used);
}

/**
 * Indica si el usuario todavía puede grabar (tiene crédito o es Pro).
 * @returns {boolean} true si puede grabar.
 */
export function canRecord(): boolean {
  return getRemainingSeconds() > 0;
}

/**
 * Consume segundos del crédito diario (no aplica a usuarios Pro).
 * @param {number} seconds - Segundos a consumir.
 * @returns {number} Segundos restantes tras el consumo.
 */
export function consumeSeconds(seconds: number): number {
  if (isPro() || seconds <= 0) {
    return getRemainingSeconds();
  }
  const record = loadUsage();
  record.usedSeconds = Math.min(FREE_DAILY_SECONDS, record.usedSeconds + Math.round(seconds));
  saveUsage(record);
  return getRemainingSeconds();
}

/**
 * Calcula el límite en segundos para la grabación que va a comenzar.
 *
 * En el plan gratuito es el menor entre el máximo por grabación (3 min) y el
 * crédito diario restante. Los usuarios Pro no tienen límite.
 *
 * @returns {number} Segundos máximos de la próxima grabación (Infinity si es Pro).
 */
export function getRecordingLimitSeconds(): number {
  if (isPro()) return Infinity;
  return Math.min(FREE_MAX_RECORDING_SECONDS, getRemainingSeconds());
}

/**
 * Reinicia el uso de hoy (útil para pruebas).
 */
export function resetUsage(): void {
  saveUsage({ date: getTodayKey(), usedSeconds: 0 });
}
