/**
 * Verificación por código OTP para desbloquear SCREENREC Pro.
 *
 * Flujo:
 * 1. El usuario introduce su correo (validado: solo proveedores conocidos).
 * 2. Se genera un código aleatorio de 6 dígitos.
 * 3. El código se envía mediante Formspree.
 * 4. El usuario introduce el código; si coincide, se activa el modo Pro.
 *
 * NOTA: al ser un sitio estático, el código se genera y compara en el navegador.
 * Es suficiente para validar que el correo existe y frenar abusos casuales, pero
 * un usuario técnico podría eludirlo. Para seguridad real haría falta un backend.
 */

import { FORMSPREE_ENDPOINT, EMAILJS, OTP_LENGTH, OTP_TTL_MS, APP_NAME } from "@/config/constants";
import type { OtpChannel } from "@/config/constants";

const EMAILJS_API = "https://api.emailjs.com/api/v1.0/email/send";

/**
 * Determina cómo se puede entregar el código con la configuración actual.
 * @returns {OtpChannel} Canal disponible.
 */
export function getOtpChannel(): OtpChannel {
  if (EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey) {
    return "visitor";
  }
  if (FORMSPREE_ENDPOINT) {
    return "owner";
  }
  return "none";
}

export interface OtpChallenge {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "no-challenge" | "expired" | "mismatch" | "too-many-attempts" };

// Máximo de intentos por código
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Genera un código numérico aleatorio de N dígitos usando crypto si está disponible.
 * @param {number} [length] - Longitud del código.
 * @returns {string} Código generado.
 */
export function generateOtpCode(length: number = OTP_LENGTH): string {
  const digits: number[] = [];

  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buffer = new Uint32Array(length);
    cryptoObj.getRandomValues(buffer);
    for (let i = 0; i < length; i += 1) {
      digits.push(buffer[i] % 10);
    }
  } else {
    for (let i = 0; i < length; i += 1) {
      digits.push(Math.floor(Math.random() * 10));
    }
  }

  // Evitar que el primer dígito sea 0 para que el código tenga siempre N dígitos.
  if (digits[0] === 0) digits[0] = 1;

  return digits.join("");
}

/**
 * Gestor del reto OTP en curso.
 */
export class OtpService {
  private challenge: OtpChallenge | null = null;

  /**
   * Crea un nuevo reto OTP y lo entrega por el canal disponible.
   * @param {string} email - Correo del usuario (ya validado).
   * @returns {Promise<{ sent: boolean; code: string; channel: OtpChannel }>} Resultado del envío, el código y el canal usado.
   */
  public async createChallenge(
    email: string
  ): Promise<{ sent: boolean; code: string; channel: OtpChannel }> {
    const code = generateOtpCode();
    const channel = getOtpChannel();

    this.challenge = {
      email,
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    };

    let sent = false;
    if (channel === "visitor") {
      sent = await this.sendWithEmailJs(email, code);
    } else if (channel === "owner") {
      // El código no puede llegar al visitante: se notifica la solicitud al dueño.
      sent = await this.notifyOwner(email);
    } else {
      console.warn("Verificación no configurada: falta EmailJS o Formspree.");
    }

    return { sent, code, channel };
  }

  /**
   * Hora de caducidad del código en formato local (para la variable {{time}}).
   * @returns {string} Hora tipo "18:45".
   */
  private formatExpiryTime(): string {
    const expiry = new Date(this.challenge?.expiresAt ?? Date.now() + OTP_TTL_MS);
    return expiry.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  }

  /**
   * Envía el código al correo del visitante mediante EmailJS.
   * @param {string} email - Correo destino.
   * @param {string} code - Código a enviar.
   * @returns {Promise<boolean>} true si el envío fue aceptado.
   */
  private async sendWithEmailJs(email: string, code: string): Promise<boolean> {
    try {
      const response = await fetch(EMAILJS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS.serviceId,
          template_id: EMAILJS.templateId,
          user_id: EMAILJS.publicKey,
          // Se envían varios alias para encajar con las plantillas de EmailJS:
          // la de "One-Time Password" usa {{passcode}} y {{time}}.
          template_params: {
            to_email: email,
            email,
            passcode: code,
            code,
            time: this.formatExpiryTime(),
            company_name: APP_NAME,
            app_name: APP_NAME,
          },
        }),
      });
      return response.ok;
    } catch (error) {
      console.error("Error al enviar el código con EmailJS:", error);
      return false;
    }
  }

  /**
   * Notifica al dueño la solicitud de Pro mediante Formspree.
   *
   * No se envía el código porque Formspree entrega los mensajes al propietario
   * del formulario, no al visitante.
   *
   * @param {string} email - Correo del solicitante.
   * @returns {Promise<boolean>} true si el envío fue aceptado.
   */
  private async notifyOwner(email: string): Promise<boolean> {
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          _subject: `${APP_NAME} - Nueva solicitud de Pro`,
          message: `${email} quiere desbloquear ${APP_NAME} Pro.`,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error("Error al notificar la solicitud de Pro:", error);
      return false;
    }
  }

  /**
   * Verifica el código introducido por el usuario.
   * @param {string} input - Código introducido.
   * @returns {OtpVerifyResult} Resultado de la verificación.
   */
  public verify(input: string): OtpVerifyResult {
    if (!this.challenge) {
      return { ok: false, reason: "no-challenge" };
    }

    if (Date.now() > this.challenge.expiresAt) {
      this.challenge = null;
      return { ok: false, reason: "expired" };
    }

    if (this.challenge.attempts >= OTP_MAX_ATTEMPTS) {
      this.challenge = null;
      return { ok: false, reason: "too-many-attempts" };
    }

    this.challenge.attempts += 1;

    if (input.trim() !== this.challenge.code) {
      return { ok: false, reason: "mismatch" };
    }

    this.challenge = null;
    return { ok: true };
  }

  /**
   * Correo del reto en curso.
   * @returns {string | null} Correo o null.
   */
  public getPendingEmail(): string | null {
    return this.challenge?.email ?? null;
  }

  /**
   * Indica si hay un reto activo y no expirado.
   * @returns {boolean} true si hay reto pendiente.
   */
  public hasPendingChallenge(): boolean {
    return !!this.challenge && Date.now() <= this.challenge.expiresAt;
  }

  /**
   * Cancela el reto en curso.
   */
  public reset(): void {
    this.challenge = null;
  }
}

// Instancia compartida
export const otpService = new OtpService();
