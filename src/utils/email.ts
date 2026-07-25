/**
 * Validación de correos para SCREENREC.
 *
 * Solo se aceptan proveedores conocidos (Gmail, Outlook, Yahoo, iCloud, Proton...)
 * y se bloquean los correos temporales/desechables.
 */

import { ALLOWED_EMAIL_PROVIDERS, DISPOSABLE_EMAIL_DOMAINS } from "@/config/constants";

export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
  domain?: string;
}

// Formato básico de correo.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Extrae el dominio (en minúsculas) de un correo.
 * @param {string} email - Correo electrónico.
 * @returns {string} Dominio o cadena vacía.
 */
export function getEmailDomain(email: string): string {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}

/**
 * Indica si un dominio es de correo temporal/desechable.
 * @param {string} domain - Dominio a comprobar.
 * @returns {boolean} true si es desechable.
 */
export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain.toLowerCase());
}

/**
 * Indica si un dominio pertenece a un proveedor permitido.
 * @param {string} domain - Dominio a comprobar.
 * @returns {boolean} true si está permitido.
 */
export function isAllowedProvider(domain: string): boolean {
  return ALLOWED_EMAIL_PROVIDERS.includes(domain.toLowerCase());
}

/**
 * Valida un correo: formato, no desechable y proveedor conocido.
 * @param {string} email - Correo a validar.
 * @returns {EmailValidationResult} Resultado de la validación.
 */
export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, reason: "Escribe tu correo electrónico." };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, reason: "El formato del correo no es válido." };
  }

  const domain = getEmailDomain(trimmed);

  if (isDisposableDomain(domain)) {
    return {
      valid: false,
      reason: "No se permiten correos temporales. Usa tu correo habitual.",
      domain,
    };
  }

  if (!isAllowedProvider(domain)) {
    return {
      valid: false,
      reason: "Usa un proveedor conocido: Gmail, Outlook, Yahoo, iCloud o Proton.",
      domain,
    };
  }

  return { valid: true, domain };
}
