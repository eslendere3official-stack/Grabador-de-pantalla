/**
 * Módulo del Dashboard para SCREENREC
 * Controla la interfaz principal de la aplicación.
 */

import { recorder } from "@/core";
import {
  DEFAULT_CONFIG,
  ORIENTATIONS,
  RESOLUTIONS,
  FRAMERATES,
  BITRATES,
  ERROR_MESSAGES,
} from "@/config/constants";
import { detectBestFormat, isBrowserSupported } from "@/utils/detect";
import { Select } from "./components/Select";
import { Toggle } from "./components/Toggle";
import type { RecordingConfig, RecordingResult } from "@/types";

/**
 * Clase principal del Dashboard.
 */
export class Dashboard {
  // Elementos del DOM
  private videoStage!: HTMLElement;
  private placeholderText!: HTMLElement;
  private liveIndicator!: HTMLElement;
  private statusBadge!: HTMLElement;
  private previewVideo!: HTMLVideoElement;
  private resultVideo!: HTMLVideoElement;
  private downloadLink!: HTMLAnchorElement;
  private discardBtn!: HTMLButtonElement;
  private startBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private panControl!: HTMLElement;
  private panSlider!: HTMLInputElement;

  // Componentes
  private orientationSelect!: Select;
  private resolutionSelect!: Select;
  private framerateSelect!: Select;
  private qualitySelect!: Select;
  private audioToggle!: Toggle;

  // Estado
  private currentRecording: RecordingResult | null = null;
  private isRecording = false;

  constructor() {
    // Validar soporte del navegador
    if (!isBrowserSupported()) {
      this.showUnsupportedBrowserError();
      return;
    }

    // Inicializar elementos del DOM
    this.initElements();

    // Inicializar componentes
    this.initComponents();

    // Configurar event listeners
    this.setupEventListeners();

    // Actualizar información del formato
    this.updateFormatInfo();
  }

  /**
   * Inicializa los elementos del DOM.
   */
  private initElements(): void {
    this.videoStage = document.getElementById("videoStage")!;
    this.placeholderText = document.getElementById("placeholderText")!;
    this.liveIndicator = document.getElementById("liveIndicator")!;
    this.statusBadge = document.getElementById("statusBadge")!;
    this.previewVideo = document.getElementById("previewVideo") as HTMLVideoElement;
    this.resultVideo = document.getElementById("resultVideo") as HTMLVideoElement;
    this.downloadLink = document.getElementById("downloadLink") as HTMLAnchorElement;
    this.discardBtn = document.getElementById("discardBtn") as HTMLButtonElement;
    this.startBtn = document.getElementById("startBtn") as HTMLButtonElement;
    this.stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
    this.panControl = document.getElementById("panControl")!;
    this.panSlider = document.getElementById("panSlider") as HTMLInputElement;
  }

  /**
   * Inicializa los componentes de UI.
   */
  private initComponents(): void {
    // Select de orientación
    this.orientationSelect = new Select({
      id: "orientation",
      label: "Orientación del Video",
      options: Object.entries(ORIENTATIONS).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.orientation,
      onChange: (value) => this.handleOrientationChange(value as "horizontal" | "vertical"),
    });

    // Select de resolución
    this.resolutionSelect = new Select({
      id: "resolution",
      label: "Resolución Base",
      options: Object.entries(RESOLUTIONS).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.resolution,
    });

    // Select de FPS
    this.framerateSelect = new Select({
      id: "framerate",
      label: "Fotogramas por segundo",
      options: Object.entries(FRAMERATES).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.framerate,
    });

    // Select de bitrate
    this.qualitySelect = new Select({
      id: "quality",
      label: "Calidad de Video (Bitrate)",
      options: Object.entries(BITRATES).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.bitrate,
    });

    // Toggle de audio
    this.audioToggle = new Toggle({
      id: "recordAudio",
      label: "Incluir Audio del Sistema",
      checked: DEFAULT_CONFIG.includeAudio,
    });

    // Reemplazar elementos del DOM con los componentes
    const orientationContainer = document.getElementById("orientation");
    if (orientationContainer) {
      orientationContainer.replaceWith(this.orientationSelect.getElement());
    }

    const resolutionContainer = document.getElementById("resolution");
    if (resolutionContainer) {
      resolutionContainer.replaceWith(this.resolutionSelect.getElement());
    }

    const framerateContainer = document.getElementById("framerate");
    if (framerateContainer) {
      framerateContainer.replaceWith(this.framerateSelect.getElement());
    }

    const qualityContainer = document.getElementById("quality");
    if (qualityContainer) {
      qualityContainer.replaceWith(this.qualitySelect.getElement());
    }

    const audioToggleContainer = document.getElementById("audioToggleWrapper");
    if (audioToggleContainer) {
      audioToggleContainer.replaceWith(this.audioToggle.getElement());
    }
  }

  /**
   * Configura los event listeners.
   */
  private setupEventListeners(): void {
    // Botón de iniciar grabación
    this.startBtn.addEventListener("click", () => this.handleStartRecording());

    // Botón de detener grabación
    this.stopBtn.addEventListener("click", () => this.handleStopRecording());

    // Botón de descartar
    this.discardBtn.addEventListener("click", () => this.handleDiscard());

    // Slider de pan
    this.panSlider.addEventListener("input", () => {
      const panValue = parseFloat(this.panSlider.value) / 100;
      recorder.updatePanValue(panValue);
    });

    // Suscribirse a eventos del grabador
    recorder.subscribe((event, data) => {
      switch (event) {
        case "start":
          this.handleRecordingStart();
          break;
        case "stop":
          this.handleRecordingStop(data as RecordingResult);
          break;
        case "error":
          this.handleRecordingError(data as Error);
          break;
      }
    });
  }

  /**
   * Actualiza la información del formato de video soportado.
   */
  private updateFormatInfo(): void {
    const formatInfo = document.getElementById("formatInfo");
    if (!formatInfo) return;

    const { ext, label } = detectBestFormat();
    const isMP4 = ext === "mp4";

    formatInfo.innerHTML = isMP4
      ? `✅ Formato de salida: <strong>${label}</strong> (Ideal para edición)`
      : `⚠️ Formato de salida: <strong>${label}</strong> (Tu navegador no soporta MP4)`;

    formatInfo.style.borderColor = isMP4 ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)";
    formatInfo.style.background = isMP4 ? "rgba(34, 197, 94, 0.1)" : "rgba(234, 179, 8, 0.1)";
    formatInfo.style.color = isMP4 ? "#86efac" : "#fde047";
  }

  /**
   * Maneja el cambio de orientación.
   * @param {Orientation} orientation - Nueva orientación.
   */
  private handleOrientationChange(orientation: "horizontal" | "vertical"): void {
    this.videoStage.classList.toggle("vertical", orientation === "vertical");
    this.panControl.style.display = orientation === "vertical" ? "block" : "none";
  }

  /**
   * Maneja el inicio de la grabación.
   */
  private async handleStartRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      // Bloquear controles
      this.lockControls(true);

      // Actualizar UI
      this.updateUIForRecording();

      // Configuración
      const config: RecordingConfig = {
        orientation: this.orientationSelect.getValue() as "horizontal" | "vertical",
        resolution: this.resolutionSelect.getValue() as "1080" | "1440" | "2160",
        framerate: this.framerateSelect.getValue() as "30" | "60",
        bitrate: this.qualitySelect.getValue() as "8000000" | "16000000" | "30000000",
        includeAudio: this.audioToggle.getChecked(),
      };

      // Iniciar grabación
      this.isRecording = true;
      this.currentRecording = await recorder.startRecording(config, this.previewVideo);
    } catch (error) {
      console.error("Error al iniciar grabación:", error);
      this.handleRecordingError(error as Error);
      this.lockControls(false);
    }
  }

  /**
   * Maneja la detención de la grabación.
   */
  private async handleStopRecording(): Promise<void> {
    if (!this.isRecording) return;

    try {
      await recorder.stopRecording();
    } catch (error) {
      console.error("Error al detener grabación:", error);
      this.handleRecordingError(error as Error);
    }
  }

  /**
   * Maneja el evento de inicio de grabación.
   */
  private handleRecordingStart(): void {
    this.isRecording = true;
  }

  /**
   * Maneja el evento de finalización de grabación.
   * @param {RecordingResult} result - Resultado de la grabación.
   */
  private handleRecordingStop(result: RecordingResult): void {
    this.isRecording = false;
    this.currentRecording = result;

    // Mostrar resultado
    this.showResult(result);

    // Desbloquear controles
    this.lockControls(false);
  }

  /**
   * Maneja errores de grabación.
   * @param {Error} error - Error ocurrido.
   */
  private handleRecordingError(error: Error): void {
    this.isRecording = false;
    this.lockControls(false);
    this.resetUI();

    // Mostrar mensaje de error
    const message = error.message || ERROR_MESSAGES.RECORDING_FAILED;
    alert(`Error: ${message}`);
  }

  /**
   * Muestra el resultado de la grabación.
   * @param {RecordingResult} result - Resultado de la grabación.
   */
  private showResult(result: RecordingResult): void {
    this.previewVideo.style.display = "none";
    this.liveIndicator.style.display = "none";
    this.resultVideo.src = result.url;
    this.resultVideo.style.display = "block";
    this.panControl.style.display = "none";

    this.downloadLink.href = result.url;
    this.downloadLink.download = result.filename;
    this.downloadLink.style.display = "flex";
    this.discardBtn.style.display = "flex";
    this.stopBtn.style.display = "none";
    this.startBtn.style.display = "flex";
    this.statusBadge.classList.remove("active");
    this.statusBadge.innerHTML = "Captura Finalizada";
  }

  /**
   * Maneja el descartar del video.
   */
  private handleDiscard(): void {
    if (this.currentRecording) {
      URL.revokeObjectURL(this.currentRecording.url);
      this.currentRecording = null;
    }
    this.resetUI();
  }

  /**
   * Bloquea o desbloquea los controles de configuración.
   * @param {boolean} locked - Si es true, bloquea los controles.
   */
  private lockControls(locked: boolean): void {
    this.orientationSelect.setDisabled(locked);
    this.resolutionSelect.setDisabled(locked);
    this.framerateSelect.setDisabled(locked);
    this.qualitySelect.setDisabled(locked);
    this.audioToggle.setDisabled(locked);
  }

  /**
   * Actualiza la UI para el estado de grabación.
   */
  private updateUIForRecording(): void {
    this.placeholderText.style.display = "none";
    this.previewVideo.style.display = "block";
    this.liveIndicator.style.display = "flex";
    this.startBtn.style.display = "none";
    this.stopBtn.style.display = "flex";
    this.downloadLink.style.display = "none";
    this.discardBtn.style.display = "none";
    this.statusBadge.classList.add("active");
    this.statusBadge.innerHTML = '<div class="pulse-dot"></div> Grabando...';

    // Mostrar control de pan solo en modo vertical
    const isVertical = this.orientationSelect.getValue() === "vertical";
    this.panControl.style.display = isVertical ? "block" : "none";
    this.videoStage.classList.toggle("vertical", isVertical);
  }

  /**
   * Resetea la UI al estado inicial.
   */
  private resetUI(): void {
    this.placeholderText.style.display = "block";
    this.previewVideo.style.display = "none";
    this.resultVideo.style.display = "none";
    this.liveIndicator.style.display = "none";
    this.stopBtn.style.display = "none";
    this.downloadLink.style.display = "none";
    this.discardBtn.style.display = "none";
    this.startBtn.style.display = "flex";
    this.panControl.style.display = "none";
    this.statusBadge.classList.remove("active");
    this.statusBadge.innerHTML = "En Espera";

    // Restaurar orientación
    const isVertical = this.orientationSelect.getValue() === "vertical";
    this.videoStage.classList.toggle("vertical", isVertical);

    // Limpiar videos
    this.previewVideo.srcObject = null;
    this.resultVideo.src = "";
  }

  /**
   * Muestra un error de navegador no soportado.
   */
  private showUnsupportedBrowserError(): void {
    const errorMessage = document.createElement("div");
    errorMessage.className = "error-message";
    errorMessage.innerHTML = `
      <h2>⚠️ Navegador no soportado</h2>
      <p>${ERROR_MESSAGES.UNSUPPORTED_BROWSER}</p>
      <p>Por favor, usa Google Chrome, Microsoft Edge o Firefox para usar SCREENREC.</p>
    `;
    errorMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      z-index: 1000;
      max-width: 80%;
    `;
    document.body.innerHTML = "";
    document.body.appendChild(errorMessage);
  }
}

/**
 * Inicializa el dashboard cuando el DOM esté listo.
 */
export function initDashboard(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new Dashboard());
  } else {
    new Dashboard();
  }
}
