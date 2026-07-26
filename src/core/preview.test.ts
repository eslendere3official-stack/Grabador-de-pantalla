/**
 * La vista previa debe mostrar el CANVAS, no la captura original.
 *
 * Antes se enchufaba el stream de la pantalla directamente al vídeo de vista
 * previa, así que el recorte vertical y el control de enfoque no se veían
 * mientras grababas: solo aparecían en el archivo final. Mostrando el canvas,
 * la vista previa refleja exactamente lo que se está grabando.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ScreenRecorder } from "@/core/recorder";
import { DEFAULT_CONFIG } from "@/config/constants";

/** Stream falso identificable. */
function fakeStream(label: string, withAudio = false): MediaStream {
  const audioTracks = withAudio ? [{ stop: vi.fn() }] : [];
  return {
    _label: label,
    getTracks: () => [{ stop: vi.fn() }, ...audioTracks],
    getVideoTracks: () => [{ stop: vi.fn(), onended: null }],
    getAudioTracks: () => audioTracks,
    addTrack: vi.fn(),
  } as unknown as MediaStream;
}

const displayStream = fakeStream("display");
const canvasStream = fakeStream("canvas");

beforeEach(() => {
  vi.stubGlobal("navigator", {
    mediaDevices: { getDisplayMedia: vi.fn().mockResolvedValue(displayStream) },
  });

  // MediaRecorder mínimo que no emite datos.
  class FakeRecorder {
    public state = "recording";
    public ondataavailable: unknown = null;
    public onstop: unknown = null;
    public onerror: unknown = null;
    public start = vi.fn();
    public stop = vi.fn();
    static isTypeSupported = (type: string): boolean => type.includes("webm");
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);

  // El canvas devuelve un stream reconocible.
  (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream = vi.fn(
    () => canvasStream
  );
  (HTMLCanvasElement.prototype as unknown as { getContext?: unknown }).getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
  }));

  // El vídeo fuente debe poder reproducirse y reportar dimensiones.
  vi.spyOn(HTMLVideoElement.prototype, "play").mockResolvedValue(undefined);
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
    value: 1920,
    configurable: true,
  });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
    value: 1080,
    configurable: true,
  });

  vi.stubGlobal("requestAnimationFrame", vi.fn());
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  ScreenRecorder.releaseInstance();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Vista previa durante la grabación", () => {
  it("muestra el canvas recortado, no la captura original", async () => {
    const recorder = ScreenRecorder.getInstance();
    const preview = document.createElement("video");

    void recorder.startRecording({ ...DEFAULT_CONFIG, orientation: "vertical" }, preview);
    // Dar tiempo a que se resuelvan las promesas internas del arranque.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Esto es lo que se rompía: la vista previa recibía el stream de pantalla.
    expect(preview.srcObject).toBe(canvasStream);
    expect(preview.srcObject).not.toBe(displayStream);
    expect(preview.style.display).toBe("block");
  });

  it("el control de enfoque limita el valor entre 0 y 1", () => {
    const recorder = ScreenRecorder.getInstance();

    recorder.updatePanValue(0.75);
    expect(recorder.getState().panValue).toBe(0.75);

    recorder.updatePanValue(-3);
    expect(recorder.getState().panValue).toBe(0);

    recorder.updatePanValue(9);
    expect(recorder.getState().panValue).toBe(1);
  });
});
