import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateOtpCode, OtpService, OTP_MAX_ATTEMPTS } from "@/core/otp";
import { OTP_LENGTH } from "@/config/constants";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("generateOtpCode", () => {
  it("genera un código con la longitud configurada", () => {
    const code = generateOtpCode();
    expect(code).toHaveLength(OTP_LENGTH);
  });

  it("genera solo dígitos", () => {
    expect(generateOtpCode()).toMatch(/^\d+$/);
  });

  it("respeta una longitud personalizada", () => {
    expect(generateOtpCode(4)).toHaveLength(4);
  });

  it("nunca empieza por cero", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateOtpCode().startsWith("0")).toBe(false);
    }
  });
});

describe("OtpService.verify", () => {
  let service: OtpService;

  beforeEach(() => {
    service = new OtpService();
  });

  it("falla si no hay reto activo", () => {
    const result = service.verify("123456");
    expect(result).toEqual({ ok: false, reason: "no-challenge" });
  });

  it("acepta el código correcto", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
    const { code } = await service.createChallenge("test@gmail.com");
    expect(service.verify(code)).toEqual({ ok: true });
  });

  it("rechaza un código incorrecto", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
    const { code } = await service.createChallenge("test@gmail.com");
    const wrong = code === "111111" ? "222222" : "111111";
    expect(service.verify(wrong)).toEqual({ ok: false, reason: "mismatch" });
  });

  it("bloquea tras demasiados intentos fallidos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
    const { code } = await service.createChallenge("test@gmail.com");
    const wrong = code === "111111" ? "222222" : "111111";

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      service.verify(wrong);
    }
    expect(service.verify(code)).toEqual({ ok: false, reason: "too-many-attempts" });
  });

  it("expira el código pasado el tiempo de validez", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
    const { code } = await service.createChallenge("test@gmail.com");

    // Avanzar el reloj más allá del TTL.
    const future = Date.now() + 11 * 60 * 1000;
    vi.spyOn(Date, "now").mockReturnValue(future);

    expect(service.verify(code)).toEqual({ ok: false, reason: "expired" });
  });

  it("reset() cancela el reto en curso", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
    const { code } = await service.createChallenge("test@gmail.com");
    service.reset();
    expect(service.verify(code)).toEqual({ ok: false, reason: "no-challenge" });
  });

  it("expone el correo pendiente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
    await service.createChallenge("persona@gmail.com");
    expect(service.getPendingEmail()).toBe("persona@gmail.com");
  });

  it("indica sent=false si el envío falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { sent } = await service.createChallenge("test@gmail.com");
    expect(sent).toBe(false);
  });
});
