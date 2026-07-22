import { describe, it, expect, afterEach, vi } from "vitest";
import {
  isDisplayMediaSupported,
  isMediaRecorderSupported,
  isCanvasCaptureStreamSupported,
  isAudioContextSupported,
  detectBestFormat,
  isBrowserSupported,
  getBrowserSupportInfo,
} from "@/utils/detect";
import { VIDEO_FORMATS } from "@/config/constants";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isDisplayMediaSupported", () => {
  it("devuelve true cuando getDisplayMedia está disponible", () => {
    vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia: vi.fn() } });
    expect(isDisplayMediaSupported()).toBe(true);
  });

  it("devuelve false cuando mediaDevices no existe", () => {
    vi.stubGlobal("navigator", {});
    expect(isDisplayMediaSupported()).toBe(false);
  });
});

describe("isMediaRecorderSupported", () => {
  it("refleja la presencia de window.MediaRecorder", () => {
    vi.stubGlobal("MediaRecorder", vi.fn());
    expect(isMediaRecorderSupported()).toBe(true);
  });
});

describe("isCanvasCaptureStreamSupported", () => {
  it("devuelve un booleano", () => {
    expect(typeof isCanvasCaptureStreamSupported()).toBe("boolean");
  });
});

describe("isAudioContextSupported", () => {
  it("devuelve true cuando AudioContext existe", () => {
    vi.stubGlobal("AudioContext", vi.fn());
    expect(isAudioContextSupported()).toBe(true);
  });
});

describe("detectBestFormat", () => {
  it("devuelve el primer formato soportado según el orden de preferencia", () => {
    const first = VIDEO_FORMATS[0];
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) => type === first.mimeType,
    });
    expect(detectBestFormat()).toEqual(first);
  });

  it("hace fallback a WebM cuando nada está soportado", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: () => false,
    });
    expect(detectBestFormat().ext).toBe("webm");
  });
});

describe("isBrowserSupported", () => {
  it("devuelve true solo si las tres APIs clave están disponibles", () => {
    vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia: vi.fn() } });
    vi.stubGlobal("MediaRecorder", vi.fn());
    // jsdom no implementa captureStream; lo definimos temporalmente.
    const proto = HTMLCanvasElement.prototype as unknown as { captureStream?: unknown };
    const original = proto.captureStream;
    proto.captureStream = vi.fn(() => ({}) as MediaStream);
    expect(isBrowserSupported()).toBe(true);
    proto.captureStream = original;
  });
});

describe("getBrowserSupportInfo", () => {
  it("devuelve un objeto con las cuatro claves esperadas", () => {
    const info = getBrowserSupportInfo();
    expect(Object.keys(info).sort()).toEqual(
      ["audioContext", "canvasCaptureStream", "displayMedia", "mediaRecorder"].sort()
    );
    Object.values(info).forEach((value) => expect(typeof value).toBe("boolean"));
  });
});
