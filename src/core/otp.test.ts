import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateOtpCode, OtpService, OTP_MAX_ATTEMPTS, getOtpChannel } from "@/core/otp";
import { OTP_LENGTH, OTP_TTL_MS } from "@/config/constants";

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

describe("getOtpChannel", () => {
  it("devuelve 'owner' cuando solo hay Formspree configurado", () => {
    // La configuración actual del proyecto tiene Formspree pero no EmailJS.
    expect(getOtpChannel()).toBe("owner");
  });

  it("nunca devuelve un canal fuera de los valores previstos", () => {
    expect(["visitor", "owner", "none"]).toContain(getOtpChannel());
  });
});

describe("createChallenge (canal)", () => {
  it("en modo 'owner' notifica al dueño sin exponer el código en la petición", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const service = new OtpService();
    const { channel, sent, code } = await service.createChallenge("test@gmail.com");

    expect(channel).toBe("owner");
    expect(sent).toBe(true);

    // El cuerpo enviado no debe contener el código, porque el correo va al dueño.
    const body = String(fetchMock.mock.calls[0][1].body);
    expect(body).toContain("test@gmail.com");
    expect(body).not.toContain(code);
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

    // Avanzar el reloj más allá del tiempo de validez configurado.
    const future = Date.now() + OTP_TTL_MS + 1000;
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
