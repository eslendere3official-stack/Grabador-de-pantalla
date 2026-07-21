/**
 * Módulo principal del grabador para SCREENREC
 * Implementa el patrón Singleton para garantizar una sola instancia.
 */

import { DEFAULT_CONFIG, CHUNK_DURATION_MS, ERROR_MESSAGES } from "@/config/constants";
import { detectBestFormat } from "@/utils/detect";
import { generateFilename } from "@/utils/format";
import { cleanupRecordingResources, clearCanvas } from "@/utils/cleanup";
import {
  getDisplayStream,
  calculateCanvasDimensions,
  createCanvas,
  drawFrame,
  createCanvasStream,
  combineStreams,
} from "./stream";
import type {
  RecordingConfig,
  RecordingResult,
  RecorderState,
  RecorderEvent,
  RecorderEventCallback,
} from "@/types";

/**
 * Clase principal del grabador (Singleton).
 */
export class ScreenRecorder {
  private static instance: ScreenRecorder | null = null;

  private recorder: MediaRecorder | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private sourceVideo: HTMLVideoElement | null = null;
  private displayStream: MediaStream | null = null;
  private canvasStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;

  private data: Blob[] = [];
  private animationFrameId: number | null = null;
  private state: RecorderState = {
    isRecording: false,
    isPaused: false,
    currentTime: 0,
    error: null,
    panValue: 0.5,
  };

  private eventCallbacks: Set<RecorderEventCallback> = new Set();

  private constructor() {
    // Constructor privado para Singleton
  }

  /**
   * Obtiene la instancia del grabador (Singleton).
   * @returns {ScreenRecorder} Instancia del grabador.
   */
  public static getInstance(): ScreenRecorder {
    if (!ScreenRecorder.instance) {
      ScreenRecorder.instance = new ScreenRecorder();
    }
    return ScreenRecorder.instance;
  }

  /**
   * Suscribe un callback a los eventos del grabador.
   * @param {RecorderEventCallback} callback - Función callback.
   * @returns {() => void} Función para desuscribirse.
   */
  public subscribe(callback: RecorderEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Emite un evento a todos los suscriptores.
   * @param {RecorderEvent} event - Evento a emitir.
   * @param {unknown} data - Datos adicionales.
   */
  private emitEvent(event: RecorderEvent, data?: unknown): void {
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error en callback de evento:", error);
      }
    });
  }

  /**
   * Obtiene el estado actual del grabador.
   * @returns {RecorderState} Estado actual.
   */
  public getState(): RecorderState {
    return { ...this.state };
  }

  /**
   * Inicia una nueva grabación.
   * @param {RecordingConfig} config - Configuración de la grabación.
   * @param {HTMLVideoElement} previewElement - Elemento para la vista previa.
   * @returns {Promise<RecordingResult>} Resultado de la grabación.
   * @throws {Error} Si no se puede iniciar la grabación.
   */
  public async startRecording(
    config: Partial<RecordingConfig> = {},
    previewElement?: HTMLVideoElement
  ): Promise<RecordingResult> {
    // Validar que no haya una grabación en curso
    if (this.state.isRecording) {
      throw new Error("Ya hay una grabación en curso.");
    }

    // Limpiar recursos previos
    this.cleanup();

    // Mergear configuración con valores por defecto
    const fullConfig: RecordingConfig = { ...DEFAULT_CONFIG, ...config };

    // Validar soporte del navegador
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error(ERROR_MESSAGES.UNSUPPORTED_BROWSER);
    }

    try {
      // Obtener stream de pantalla
      this.displayStream = await getDisplayStream(fullConfig);

      // Calcular dimensiones del canvas
      const canvasDims = calculateCanvasDimensions(fullConfig);

      // Crear canvas y contexto
      const { canvas, ctx } = createCanvas(canvasDims);
      this.canvas = canvas;
      this.ctx = ctx;

      // Crear elemento de video fuente
      this.sourceVideo = document.createElement("video");
      this.sourceVideo.srcObject = this.displayStream;
      this.sourceVideo.muted = true;
      this.sourceVideo.autoplay = true;
      await this.sourceVideo.play();

      // Mostrar vista previa si se proporciona un elemento
      if (previewElement) {
        previewElement.srcObject = this.displayStream;
        previewElement.style.display = "block";
      }

      // Crear stream del canvas
      const fps = fullConfig.framerate === "30" ? 30 : 60;
      this.canvasStream = createCanvasStream(this.canvas, fps);

      // Combinar streams (video del canvas + audio del original)
      if (fullConfig.includeAudio && this.displayStream.getAudioTracks().length > 0) {
        this.combinedStream = combineStreams(this.canvasStream, this.displayStream);
      } else {
        this.combinedStream = this.canvasStream;
      }

      // Detectar mejor formato
      const { mimeType, ext } = detectBestFormat();

      // Configurar MediaRecorder
      const bitrate =
        fullConfig.bitrate === "8000000"
          ? 8_000_000
          : fullConfig.bitrate === "16000000"
            ? 16_000_000
            : 30_000_000;
      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: bitrate,
      };

      this.recorder = new MediaRecorder(this.combinedStream, options);
      this.data = [];

      // Configurar event handlers
      this.recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.data.push(event.data);
        }
      };

      this.recorder.onerror = (event: Event) => {
        const error =
          (event as unknown as { error: Error }).error || new Error("Error desconocido");
        this.state.error = error;
        this.emitEvent("error", error);
        this.cleanup();
      };

      // Iniciar grabación
      this.recorder.start(CHUNK_DURATION_MS);
      this.state.isRecording = true;
      this.state.isPaused = false;
      this.state.error = null;

      this.emitEvent("start");

      // Iniciar bucle de renderizado
      this.startRenderLoop();

      // Manejar finalización de la captura (ej: usuario cierra la pestaña)
      this.displayStream.getVideoTracks()[0].onended = () => {
        if (this.recorder && this.recorder.state !== "inactive") {
          this.stopRecording();
        }
      };

      // Retornar una promesa que se resuelve cuando se detiene la grabación
      return new Promise((resolve, reject) => {
        this.recorder!.onstop = () => {
          try {
            this.stopRenderLoop();
            const blob = new Blob(this.data, { type: mimeType });
            const filename = generateFilename(ext as "mp4" | "webm");
            const url = URL.createObjectURL(blob);

            const result: RecordingResult = {
              blob,
              filename,
              ext: ext as "mp4" | "webm",
              url,
            };

            this.emitEvent("stop", result);
            resolve(result);
          } catch (error) {
            this.emitEvent("error", error);
            reject(error);
          } finally {
            this.cleanup();
          }
        };
      });
    } catch (error) {
      this.cleanup();
      this.emitEvent("error", error);
      throw error;
    }
  }

  /**
   * Detiene la grabación actual.
   * @returns {Promise<RecordingResult | null>} Resultado de la grabación o null si no había ninguna.
   */
  public async stopRecording(): Promise<RecordingResult | null> {
    if (!this.state.isRecording || !this.recorder) {
      return null;
    }

    this.stopRenderLoop();
    this.recorder.stop();
    return new Promise((resolve) => {
      // El onstop del recorder ya maneja la resolución
      setTimeout(() => resolve(null), 1000);
    });
  }

  /**
   * Pausa la grabación.
   */
  public pauseRecording(): void {
    if (!this.state.isRecording || this.state.isPaused) {
      return;
    }
    this.state.isPaused = true;
    this.emitEvent("pause");
  }

  /**
   * Reanuda la grabación.
   */
  public resumeRecording(): void {
    if (!this.state.isRecording || !this.state.isPaused) {
      return;
    }
    this.state.isPaused = false;
    this.emitEvent("resume");
  }

  /**
   * Inicia el bucle de renderizado del canvas.
   */
  private startRenderLoop(): void {
    const renderFrame = () => {
      if (!this.state.isRecording || !this.sourceVideo || !this.ctx || !this.canvas) {
        return;
      }

      const canvasDims = {
        width: this.canvas.width,
        height: this.canvas.height,
      };

      drawFrame(this.sourceVideo, this.ctx, canvasDims, this.state.panValue);
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };

    // Iniciar el bucle
    renderFrame();
  }

  /**
   * Detiene el bucle de renderizado.
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Actualiza el valor de pan (para modo vertical).
   * @param {number} value - Valor de pan (0 a 1).
   */
  public updatePanValue(value: number): void {
    // Clamp entre 0 y 1
    this.state.panValue = Math.max(0, Math.min(1, value));
  }

  /**
   * Limpia todos los recursos del grabador.
   */
  private cleanup(): void {
    // Detener el bucle de renderizado
    this.stopRenderLoop();

    // Limpiar recursos de grabación
    cleanupRecordingResources(null, this.displayStream, this.canvasStream);

    // Limpiar canvas
    clearCanvas(this.canvas);

    // Limpiar source video
    if (this.sourceVideo) {
      this.sourceVideo.srcObject = null;
      this.sourceVideo = null;
    }

    // Limpiar recorder
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onstop = null;
      this.recorder.onerror = null;
      this.recorder = null;
    }

    // Resetear estado
    this.data = [];
    this.state = {
      isRecording: false,
      isPaused: false,
      currentTime: 0,
      error: null,
      panValue: 0.5,
    };
  }

  /**
   * Libera la instancia del grabador (para pruebas).
   */
  public static releaseInstance(): void {
    if (ScreenRecorder.instance) {
      ScreenRecorder.instance.cleanup();
      ScreenRecorder.instance = null;
    }
  }
}

// Exportar instancia por defecto
export const recorder = ScreenRecorder.getInstance();
