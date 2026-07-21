/**
 * Funciones de formateo para SCREENREC
 */

import { APP_NAME } from "@/config/constants";

/**
 * Formatea una fecha para el nombre del archivo.
 * @returns {string} Timestamp en formato YYYY-MM-DD_HH-MM
 */
export function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

/**
 * Genera un nombre de archivo único para la grabación.
 * @param {string} ext - Extensión del archivo (mp4, webm).
 * @returns {string} Nombre de archivo.
 */
export function generateFilename(ext: string): string {
  return `${APP_NAME}_${formatTimestamp()}.${ext}`;
}

/**
 * Formatea un número como tamaño de archivo legible.
 * @param {number} bytes - Tamaño en bytes.
 * @returns {string} Tamaño formateado (ej: "1.2 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formatea un tiempo en segundos a HH:MM:SS.
 * @param {number} seconds - Tiempo en segundos.
 * @returns {string} Tiempo formateado.
 */
export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
}

/**
 * Capitaliza la primera letra de un string.
 * @param {string} str - String a capitalizar.
 * @returns {string} String capitalizado.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
