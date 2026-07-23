/**
 * Módulo del Dashboard para SCREENREC (v2)
 * Controla la interfaz principal: sidebar, banner, grabador, plan gratuito y modales.
 */

import {
  recorder,
  isPro,
  getRemainingSeconds,
  getDailyLimitSeconds,
  consumeSeconds,
  canRecord,
} from "@/core";
import {
  DEFAULT_CONFIG,
  ORIENTATIONS,
  RESOLUTIONS,
  FRAMERATES,
  BITRATES,
  ERROR_MESSAGES,
  APP_BENEFITS,
  NAV_ITEMS,
  PRO,
  EMAIL_ENDPOINT,
  STORAGE_KEYS,
} from "@/config/constants";
import { detectBestFormat, isBrowserSupported, getBrowserSupportInfo } from "@/utils/detect";
import { formatTime, formatFileSize } from "@/utils/format";
import { validateEmail } from "@/utils/email";
import { Select } from "./components/Select";
import { Toggle } from "./components/Toggle";
import type { RecordingConfig, RecordingResult } from "@/types";

interface StoredRecording {
  filename: string;
  url: string;
  size: number;
  date: Date;
}

/**
 * Formatea segundos como MM:SS.
 * @param {number} seconds - Segundos.
 * @returns {string} Cadena MM:SS.
 */
function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Clase principal del Dashboard.
 */
export class Dashboard {
  // Elementos del escenario de video
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
  private actionFooter!: HTMLElement;
  private recTimer!: HTMLElement;
  private qualityPill!: HTMLElement;
  private fullscreenBtn!: HTMLButtonElement;

  // Sidebar / plan
  private appEl!: HTMLElement;
  private planTimer!: HTMLElement;
  private planBarFill!: HTMLElement;
  private planBadge!: HTMLElement;
  private planNote!: HTMLElement;
  private upgradeBtn!: HTMLButtonElement;

  // Modal
  private modalOverlay!: HTMLElement;
  private modalBox!: HTMLElement;

  // Componentes
  private orientationSelect!: Select;
  private formatSelect!: Select;
  private resolutionSelect!: Select;
  private framerateSelect!: Select;
  private qualitySelect!: Select;
  private audioToggle!: Toggle;

  // Estado
  private currentRecording: RecordingResult | null = null;
  private recordings: StoredRecording[] = [];
  private isRecording = false;
  private tickInterval: number | null = null;
  private recordStartTime = 0;
  private recordLimitSeconds = Infinity;
  private remainingAtStart = Infinity;
  private elapsedSeconds = 0;
  private limitReached = false;
  private benefitIndex = 0;
  private benefitInterval: number | null = null;

  constructor() {
    if (!isBrowserSupported()) {
      this.showUnsupportedBrowserError();
      return;
    }

    this.initElements();
    this.initNav();
    this.initSidebar();
    this.initComponents();
    this.initBanner();
    this.setupEventListeners();
    this.updateFormatInfo();
    this.updateQualityPill();
    this.updatePlanCard();
  }

  /**
   * Inicializa las referencias a elementos del DOM.
   */
  private initElements(): void {
    this.appEl = document.getElementById("app")!;
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
    this.actionFooter = document.getElementById("actionFooter")!;
    this.recTimer = document.getElementById("recTimer")!;
    this.qualityPill = document.getElementById("qualityPill")!;
    this.fullscreenBtn = document.getElementById("fullscreenBtn") as HTMLButtonElement;

    this.planTimer = document.getElementById("planTimer")!;
    this.planBarFill = document.getElementById("planBarFill")!;
    this.planBadge = document.getElementById("planBadge")!;
    this.planNote = document.getElementById("planNote")!;
    this.upgradeBtn = document.getElementById("upgradeBtn") as HTMLButtonElement;

    this.modalOverlay = document.getElementById("modalOverlay")!;
    this.modalBox = document.getElementById("modalBox")!;
  }

  /**
   * Construye la navegación del sidebar y el cambio de vistas.
   */
  private initNav(): void {
    const nav = document.getElementById("nav")!;
    NAV_ITEMS.forEach((item, index) => {
      const btn = document.createElement("button");
      btn.className = `nav-item ${index === 0 ? "active" : ""}`;
      btn.dataset.view = item.id;
      btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
      btn.addEventListener("click", () => this.switchView(item.id, btn));
      nav.appendChild(btn);
    });
  }

  /**
   * Cambia la vista visible en el área principal.
   * @param {string} viewId - Identificador de la vista.
   * @param {HTMLElement} btn - Botón de navegación pulsado.
   */
  private switchView(viewId: string, btn: HTMLElement): void {
    document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".view").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });
    const view = document.getElementById(`view-${viewId}`);
    if (view) view.style.display = "flex";

    if (viewId === "recordings") this.renderRecordings();
    if (viewId === "tools") this.renderTools();
  }

  /**
   * Configura el botón de contraer el sidebar (con persistencia).
   */
  private initSidebar(): void {
    const collapseBtn = document.getElementById("collapseBtn") as HTMLButtonElement;

    let collapsed = false;
    try {
      collapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR) === "collapsed";
    } catch {
      collapsed = false;
    }
    this.appEl.classList.toggle("collapsed", collapsed);
    collapseBtn.textContent = collapsed ? "»" : "«";

    collapseBtn.addEventListener("click", () => {
      const isCollapsed = this.appEl.classList.toggle("collapsed");
      collapseBtn.textContent = isCollapsed ? "»" : "«";
      try {
        localStorage.setItem(STORAGE_KEYS.SIDEBAR, isCollapsed ? "collapsed" : "expanded");
      } catch {
        // Silencioso.
      }
    });
  }

  /**
   * Inicializa los componentes de configuración (con iconos y sentence case).
   */
  private initComponents(): void {
    this.orientationSelect = new Select({
      id: "orientationSelect",
      label: "🎬 Orientación del video",
      options: Object.entries(ORIENTATIONS).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.orientation,
      onChange: (value) => this.handleOrientationChange(value as "horizontal" | "vertical"),
    });

    const detected = detectBestFormat();
    this.formatSelect = new Select({
      id: "formatSelect",
      label: "📁 Formato de archivo",
      options: [{ value: detected.ext, label: detected.label }],
      value: detected.ext,
      disabled: true,
    });

    this.resolutionSelect = new Select({
      id: "resolutionSelect",
      label: "🖥️ Resolución base",
      options: Object.entries(RESOLUTIONS).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.resolution,
      onChange: () => this.updateQualityPill(),
    });

    this.framerateSelect = new Select({
      id: "framerateSelect",
      label: "⚡ Fotogramas por segundo",
      options: Object.entries(FRAMERATES).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.framerate,
      onChange: () => this.updateQualityPill(),
    });

    this.qualitySelect = new Select({
      id: "qualitySelect",
      label: "✨ Calidad de video (bitrate)",
      options: Object.entries(BITRATES).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.bitrate,
    });

    this.audioToggle = new Toggle({
      id: "recordAudio",
      label: "🔊 Incluir audio del sistema",
      checked: DEFAULT_CONFIG.includeAudio,
    });

    this.replacePlaceholder("orientation", this.orientationSelect.getElement());
    this.replacePlaceholder("format", this.formatSelect.getElement());
    this.replacePlaceholder("resolution", this.resolutionSelect.getElement());
    this.replacePlaceholder("framerate", this.framerateSelect.getElement());
    this.replacePlaceholder("quality", this.qualitySelect.getElement());
    this.replacePlaceholder("audioToggleWrapper", this.audioToggle.getElement());
  }

  /**
   * Reemplaza un contenedor placeholder por el elemento de un componente.
   * @param {string} id - Id del contenedor.
   * @param {HTMLElement} element - Elemento a insertar.
   */
  private replacePlaceholder(id: string, element: HTMLElement): void {
    const container = document.getElementById(id);
    if (container) container.replaceWith(element);
  }

  /**
   * Inicializa el banner con el slider de beneficios.
   */
  private initBanner(): void {
    const container = document.getElementById("heroBenefits")!;
    const dotsContainer = document.getElementById("heroDots")!;

    APP_BENEFITS.forEach((benefit, index) => {
      const slide = document.createElement("div");
      slide.className = `hero-slide ${index === 0 ? "active" : ""}`;
      slide.innerHTML = `
        <div class="hero-slide-title"><span>${benefit.icon}</span> ${benefit.title}</div>
        <div class="hero-slide-text">${benefit.text}</div>
      `;
      container.appendChild(slide);

      const dot = document.createElement("button");
      dot.className = `hero-dot-nav ${index === 0 ? "active" : ""}`;
      dot.setAttribute("aria-label", `Beneficio ${index + 1}`);
      dot.addEventListener("click", () => this.showBenefit(index));
      dotsContainer.appendChild(dot);
    });

    this.startBenefitRotation();
  }

  /**
   * Muestra un beneficio concreto del banner.
   * @param {number} index - Índice del beneficio.
   */
  private showBenefit(index: number): void {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".hero-dot-nav");
    this.benefitIndex = (index + slides.length) % slides.length;

    slides.forEach((s, i) => s.classList.toggle("active", i === this.benefitIndex));
    dots.forEach((d, i) => d.classList.toggle("active", i === this.benefitIndex));

    this.startBenefitRotation();
  }

  /**
   * Inicia (o reinicia) la rotación automática del banner.
   */
  private startBenefitRotation(): void {
    if (this.benefitInterval) window.clearInterval(this.benefitInterval);
    this.benefitInterval = window.setInterval(() => {
      this.showBenefitInternal(this.benefitIndex + 1);
    }, 5000);
  }

  /**
   * Cambia el slide sin reiniciar el temporizador (uso interno).
   * @param {number} index - Índice objetivo.
   */
  private showBenefitInternal(index: number): void {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".hero-dot-nav");
    this.benefitIndex = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle("active", i === this.benefitIndex));
    dots.forEach((d, i) => d.classList.toggle("active", i === this.benefitIndex));
  }

  /**
   * Configura los listeners principales.
   */
  private setupEventListeners(): void {
    this.startBtn.addEventListener("click", () => this.handleStartRecording());
    this.stopBtn.addEventListener("click", () => this.handleStopRecording());
    this.discardBtn.addEventListener("click", () => this.handleDiscard());
    this.upgradeBtn.addEventListener("click", () => this.openProModal());
    this.fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());

    this.panSlider.addEventListener("input", () => {
      recorder.updatePanValue(parseFloat(this.panSlider.value) / 100);
    });

    this.modalOverlay.addEventListener("click", (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });

    recorder.subscribe((event, data) => {
      switch (event) {
        case "start":
          this.isRecording = true;
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
   * Actualiza el recuadro informativo del formato de salida.
   */
  private updateFormatInfo(): void {
    const formatInfo = document.getElementById("formatInfo");
    if (!formatInfo) return;

    const { ext, label } = detectBestFormat();
    const isMP4 = ext === "mp4";

    formatInfo.innerHTML = isMP4
      ? `✅ Formato de salida: <strong>${label}</strong>`
      : `ℹ️ Formato de salida: <strong>${label}</strong> (tu navegador no soporta MP4)`;
    formatInfo.style.borderColor = isMP4 ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)";
    formatInfo.style.color = isMP4 ? "#86efac" : "#a5b4fc";
  }

  /**
   * Actualiza el "pill" de calidad del footer del escenario.
   */
  private updateQualityPill(): void {
    if (!this.qualitySelect) return;
    const res = this.resolutionSelect.getValue();
    const fps = this.framerateSelect.getValue();
    const resLabel = res === "2160" ? "4K" : res === "1440" ? "2K" : "HD";
    this.qualityPill.textContent = `${resLabel} ${fps}`;
  }

  /**
   * Actualiza la tarjeta del plan (contador diario y estado Pro).
   * @param {number} [liveRemaining] - Segundos restantes en vivo (durante grabación).
   */
  private updatePlanCard(liveRemaining?: number): void {
    const limit = getDailyLimitSeconds();

    if (isPro()) {
      this.planBadge.textContent = "Plan Pro";
      this.planBadge.classList.add("pro");
      this.planTimer.textContent = "∞";
      this.planBarFill.style.width = "100%";
      this.planNote.textContent = "Grabación ilimitada. ¡Gracias por tu apoyo!";
      this.upgradeBtn.style.display = "none";
      return;
    }

    const remaining = liveRemaining ?? getRemainingSeconds();
    this.planBadge.textContent = "Plan gratuito";
    this.planBadge.classList.remove("pro");
    this.planTimer.textContent = formatClock(remaining);
    this.planBarFill.style.width = `${Math.max(0, Math.min(100, (remaining / limit) * 100))}%`;
    this.planNote.textContent =
      remaining > 0
        ? "Tienes 3 minutos gratis cada día. Se renuevan mañana."
        : "Sin crédito hoy. Vuelve mañana o hazte Pro para grabar sin límites.";
    this.upgradeBtn.style.display = "flex";
  }

  /**
   * Maneja el cambio de orientación.
   * @param {("horizontal"|"vertical")} orientation - Nueva orientación.
   */
  private handleOrientationChange(orientation: "horizontal" | "vertical"): void {
    const isVertical = orientation === "vertical";
    this.videoStage.classList.toggle("vertical", isVertical);
    this.panControl.style.display = isVertical && this.isRecording ? "block" : "none";
  }

  /**
   * Inicia la grabación (comprobando el crédito del plan gratuito).
   */
  private async handleStartRecording(): Promise<void> {
    if (this.isRecording) return;

    if (!canRecord()) {
      this.openProModal(true);
      return;
    }

    try {
      this.lockControls(true);
      this.updateUIForRecording();

      const config: RecordingConfig = {
        orientation: this.orientationSelect.getValue() as "horizontal" | "vertical",
        resolution: this.resolutionSelect.getValue() as "1080" | "1440" | "2160",
        framerate: this.framerateSelect.getValue() as "30" | "60",
        bitrate: this.qualitySelect.getValue() as "8000000" | "16000000" | "30000000",
        includeAudio: this.audioToggle.getChecked(),
      };

      this.isRecording = true;
      this.remainingAtStart = getRemainingSeconds();
      this.recordLimitSeconds = isPro() ? Infinity : this.remainingAtStart;
      this.limitReached = false;
      this.elapsedSeconds = 0;
      this.recordStartTime = Date.now();
      this.startTick();

      this.currentRecording = await recorder.startRecording(config, this.previewVideo);
    } catch (error) {
      console.error("Error al iniciar grabación:", error);
      this.stopTick();
      this.handleRecordingError(error as Error);
      this.lockControls(false);
    }
  }

  /**
   * Detiene la grabación manualmente.
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
   * Inicia el temporizador que actualiza el tiempo y aplica el límite del plan.
   */
  private startTick(): void {
    this.stopTick();
    this.tickInterval = window.setInterval(() => {
      this.elapsedSeconds = (Date.now() - this.recordStartTime) / 1000;
      this.recTimer.textContent = formatTime(this.elapsedSeconds);

      if (!isPro()) {
        const remaining = Math.max(0, this.remainingAtStart - this.elapsedSeconds);
        this.updatePlanCard(remaining);

        if (this.elapsedSeconds >= this.recordLimitSeconds) {
          this.limitReached = true;
          this.stopTick();
          void this.handleStopRecording();
        }
      }
    }, 250);
  }

  /**
   * Detiene el temporizador.
   */
  private stopTick(): void {
    if (this.tickInterval) {
      window.clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Maneja el fin de la grabación: consume crédito, guarda y muestra el resultado.
   * @param {RecordingResult} result - Resultado de la grabación.
   */
  private handleRecordingStop(result: RecordingResult): void {
    this.isRecording = false;
    this.stopTick();
    this.currentRecording = result;

    // Consumir el tiempo grabado del crédito diario.
    consumeSeconds(this.elapsedSeconds);
    this.updatePlanCard();

    // Guardar en la lista de grabaciones de la sesión.
    this.recordings.unshift({
      filename: result.filename,
      url: result.url,
      size: result.blob.size,
      date: new Date(),
    });

    this.showResult(result);
    this.lockControls(false);

    if (this.limitReached) {
      this.openProModal(true);
    }
  }

  /**
   * Maneja errores de grabación.
   * @param {Error} error - Error ocurrido.
   */
  private handleRecordingError(error: Error): void {
    this.isRecording = false;
    this.stopTick();
    this.lockControls(false);
    this.resetUI();
    alert(`Error: ${error.message || ERROR_MESSAGES.RECORDING_FAILED}`);
  }

  /**
   * Muestra el resultado de la grabación.
   * @param {RecordingResult} result - Resultado.
   */
  private showResult(result: RecordingResult): void {
    this.previewVideo.style.display = "none";
    this.liveIndicator.style.display = "none";
    this.resultVideo.src = result.url;
    this.resultVideo.style.display = "block";
    this.panControl.style.display = "none";

    this.downloadLink.href = result.url;
    this.downloadLink.download = result.filename;
    this.actionFooter.style.display = "grid";
    this.stopBtn.style.display = "none";
    this.startBtn.style.display = "flex";
    this.statusBadge.classList.remove("active");
    this.statusBadge.textContent = "Captura finalizada";
  }

  /**
   * Descarta la grabación actual.
   */
  private handleDiscard(): void {
    if (this.currentRecording) {
      this.currentRecording = null;
    }
    this.resetUI();
  }

  /**
   * Bloquea o desbloquea los controles de configuración.
   * @param {boolean} locked - true para bloquear.
   */
  private lockControls(locked: boolean): void {
    this.orientationSelect.setDisabled(locked);
    this.resolutionSelect.setDisabled(locked);
    this.framerateSelect.setDisabled(locked);
    this.qualitySelect.setDisabled(locked);
    this.audioToggle.setDisabled(locked);
  }

  /**
   * Prepara la UI para el estado "grabando".
   */
  private updateUIForRecording(): void {
    this.placeholderText.style.display = "none";
    this.resultVideo.style.display = "none";
    this.previewVideo.style.display = "block";
    this.liveIndicator.style.display = "flex";
    this.startBtn.style.display = "none";
    this.stopBtn.style.display = "flex";
    this.actionFooter.style.display = "none";
    this.recTimer.textContent = "00:00:00";
    this.statusBadge.classList.add("active");
    this.statusBadge.innerHTML = '<div class="pulse-dot"></div> Grabando...';

    const isVertical = this.orientationSelect.getValue() === "vertical";
    this.panControl.style.display = isVertical ? "block" : "none";
    this.videoStage.classList.toggle("vertical", isVertical);
  }

  /**
   * Restaura la UI al estado inicial.
   */
  private resetUI(): void {
    this.placeholderText.style.display = "block";
    this.previewVideo.style.display = "none";
    this.resultVideo.style.display = "none";
    this.liveIndicator.style.display = "none";
    this.stopBtn.style.display = "none";
    this.actionFooter.style.display = "none";
    this.startBtn.style.display = "flex";
    this.panControl.style.display = "none";
    this.recTimer.textContent = "00:00:00";
    this.statusBadge.classList.remove("active");
    this.statusBadge.textContent = "En espera";

    const isVertical = this.orientationSelect.getValue() === "vertical";
    this.videoStage.classList.toggle("vertical", isVertical);

    this.previewVideo.srcObject = null;
    this.resultVideo.src = "";
  }

  /**
   * Alterna la pantalla completa del escenario de video.
   */
  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void this.videoStage.requestFullscreen?.();
    }
  }

  /**
   * Renderiza la lista de grabaciones de la sesión.
   */
  private renderRecordings(): void {
    const list = document.getElementById("recordingsList")!;
    if (this.recordings.length === 0) {
      list.innerHTML = '<p class="empty-state">Aún no has grabado nada en esta sesión.</p>';
      return;
    }

    list.innerHTML = "";
    this.recordings.forEach((rec) => {
      const item = document.createElement("div");
      item.className = "recording-item";

      const info = document.createElement("div");
      info.className = "recording-info";
      const time = rec.date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
      info.innerHTML = `
        <div class="recording-name">${rec.filename}</div>
        <div class="recording-meta">${formatFileSize(rec.size)} · ${time}</div>
      `;

      const link = document.createElement("a");
      link.className = "btn btn-primary recording-download";
      link.href = rec.url;
      link.download = rec.filename;
      link.textContent = "⬇ Descargar";

      item.appendChild(info);
      item.appendChild(link);
      list.appendChild(item);
    });
  }

  /**
   * Renderiza la vista de herramientas (estado del navegador).
   */
  private renderTools(): void {
    const container = document.getElementById("toolsInfo")!;
    const support = getBrowserSupportInfo();
    const rows: { label: string; ok: boolean }[] = [
      { label: "Captura de pantalla (getDisplayMedia)", ok: support.displayMedia },
      { label: "Grabación (MediaRecorder)", ok: support.mediaRecorder },
      { label: "Procesado de video (Canvas)", ok: support.canvasCaptureStream },
      { label: "Audio del sistema (AudioContext)", ok: support.audioContext },
    ];

    container.innerHTML = "";
    rows.forEach((row) => {
      const el = document.createElement("div");
      el.className = "tool-row";
      el.innerHTML = `
        <span>${row.label}</span>
        <span class="${row.ok ? "tool-status-ok" : "tool-status-no"}">${row.ok ? "Disponible" : "No disponible"}</span>
      `;
      container.appendChild(el);
    });
  }

  // ============================================
  // Modales
  // ============================================

  /**
   * Abre el modal de mejora a Pro.
   * @param {boolean} [limitHit] - true si se abre por agotar el crédito.
   */
  private openProModal(limitHit = false): void {
    const features = PRO.features.map((f) => `<li>${f}</li>`).join("");
    const hasCheckout = PRO.checkoutUrl && PRO.checkoutUrl !== "#";
    const subtitle = limitHit
      ? "Has usado tus 3 minutos gratis de hoy. Hazte Pro para grabar sin límites."
      : "Desbloquea todo el potencial de SCREENREC.";

    this.modalBox.innerHTML = `
      <h2>✨ SCREENREC Pro</h2>
      <p class="modal-sub">${subtitle}</p>
      <div class="modal-price">${PRO.priceLabel}</div>
      <ul class="modal-features">${features}</ul>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modalNotifyBtn">Avísame por correo</button>
        <button class="btn btn-pro" id="modalCheckoutBtn">${hasCheckout ? "Suscribirme" : "Muy pronto"}</button>
      </div>
      <button class="modal-close" id="modalCloseBtn">Ahora no</button>
    `;

    this.modalOverlay.style.display = "flex";

    document.getElementById("modalCloseBtn")!.addEventListener("click", () => this.closeModal());
    document.getElementById("modalNotifyBtn")!.addEventListener("click", () => {
      this.openSubscribeModal();
    });
    document.getElementById("modalCheckoutBtn")!.addEventListener("click", () => {
      if (hasCheckout) {
        window.open(PRO.checkoutUrl, "_blank", "noopener");
      } else {
        this.openSubscribeModal();
      }
    });
  }

  /**
   * Abre el modal de suscripción por correo (con validación de proveedor).
   */
  private openSubscribeModal(): void {
    this.modalBox.innerHTML = `
      <h2>📬 Entérate del lanzamiento Pro</h2>
      <p class="modal-sub">Déjanos tu correo y te avisamos cuando esté lista la versión Pro.</p>
      <input type="email" class="modal-input" id="subEmail" placeholder="tucorreo@gmail.com" autocomplete="email" />
      <div class="modal-error" id="subError"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="subCancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="subSubmitBtn">Apuntarme</button>
      </div>
    `;

    this.modalOverlay.style.display = "flex";

    const input = document.getElementById("subEmail") as HTMLInputElement;
    const errorEl = document.getElementById("subError")!;
    input.focus();

    const submit = async (): Promise<void> => {
      const result = validateEmail(input.value);
      if (!result.valid) {
        errorEl.textContent = result.reason || "Correo no válido.";
        return;
      }
      errorEl.textContent = "";
      await this.saveSubscriber(input.value.trim().toLowerCase());
      this.showSubscribeSuccess();
    };

    document.getElementById("subCancelBtn")!.addEventListener("click", () => this.closeModal());
    document.getElementById("subSubmitBtn")!.addEventListener("click", () => void submit());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void submit();
    });
  }

  /**
   * Guarda el correo del suscriptor (local y, si hay endpoint, remoto).
   * @param {string} email - Correo validado.
   */
  private async saveSubscriber(email: string): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIBER, email);
    } catch {
      // Silencioso.
    }

    if (EMAIL_ENDPOINT) {
      try {
        await fetch(EMAIL_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch (error) {
        console.warn("No se pudo enviar la suscripción al endpoint:", error);
      }
    }
  }

  /**
   * Muestra el mensaje de éxito tras suscribirse.
   */
  private showSubscribeSuccess(): void {
    this.modalBox.innerHTML = `
      <h2>🎉 ¡Listo!</h2>
      <p class="modal-success">Te avisaremos en cuanto SCREENREC Pro esté disponible.</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="successCloseBtn">Cerrar</button>
      </div>
    `;
    document.getElementById("successCloseBtn")!.addEventListener("click", () => this.closeModal());
  }

  /**
   * Cierra el modal activo.
   */
  private closeModal(): void {
    this.modalOverlay.style.display = "none";
    this.modalBox.innerHTML = "";
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
      <p>Usa Google Chrome, Microsoft Edge o Firefox para grabar con SCREENREC.</p>
    `;
    errorMessage.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(239, 68, 68, 0.95); color: white; padding: 2rem;
      border-radius: 12px; text-align: center; z-index: 1000; max-width: 80%;
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
