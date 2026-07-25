/**
 * Módulo del Dashboard para SCREENREC (v4)
 * Controla la interfaz: sidebar, banner, grabador, plan, galería, FAQs y Pro.
 */

import {
  recorder,
  isPro,
  setPro,
  getRemainingSeconds,
  getDailyLimitSeconds,
  getRecordingLimitSeconds,
  consumeSeconds,
  canRecord,
  library,
  otpService,
  getOtpChannel,
  estimateStorage,
  requestPersistentStorage,
} from "@/core";
import {
  DEFAULT_CONFIG,
  FREE_DEFAULTS,
  PRO_ONLY,
  ORIENTATIONS,
  RESOLUTIONS,
  FRAMERATES,
  BITRATES,
  FORMAT_OPTIONS,
  ERROR_MESSAGES,
  APP_BENEFITS,
  NAV_ITEMS,
  FAQ_ITEMS,
  PRO,
  OTP_LENGTH,
  STORAGE_KEYS,
  ICONS,
} from "@/config/constants";
import { isBrowserSupported, getBrowserSupportInfo, isFormatSupported } from "@/utils/detect";
import { formatTime, formatFileSize } from "@/utils/format";
import { validateEmail } from "@/utils/email";
import { Select, type SelectOption } from "./components/Select";
import { Toggle } from "./components/Toggle";
import type { RecordingConfig, RecordingResult } from "@/types";
import type { LibraryItem } from "@/core";

/** Ajustes que pueden estar reservados al plan Pro. */
type GatedSetting = "resolution" | "framerate" | "bitrate";

/**
 * Formatea segundos como MM:SS.
 * @param {number} seconds - Segundos a formatear.
 * @returns {string} Cadena MM:SS o el símbolo de infinito.
 */
function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "∞";
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Detecta si el viewport es de móvil.
 * @returns {boolean} true si es una pantalla pequeña.
 */
function isMobileViewport(): boolean {
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(max-width: 680px)").matches;
  }
  return window.innerWidth > 0 && window.innerWidth <= 680;
}

/**
 * Escapa texto para insertarlo de forma segura en HTML.
 * @param {string} value - Texto a escapar.
 * @returns {string} Texto escapado.
 */
function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

/**
 * Clase principal del Dashboard.
 */
export class Dashboard {
  // Escenario
  private videoStage!: HTMLElement;
  private placeholderText!: HTMLElement;
  private liveIndicator!: HTMLElement;
  private statusBadge!: HTMLElement;
  private previewVideo!: HTMLVideoElement;
  private resultVideo!: HTMLVideoElement;
  private downloadLink!: HTMLAnchorElement;
  private discardBtn!: HTMLButtonElement;
  private saveLibraryBtn!: HTMLButtonElement;
  private startBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private panControl!: HTMLElement;
  private panSlider!: HTMLInputElement;
  private actionFooter!: HTMLElement;
  private recTimer!: HTMLElement;
  private recCounter!: HTMLElement;
  private recElapsed!: HTMLElement;
  private recLimitEl!: HTMLElement;
  private qualityPill!: HTMLElement;
  private formatPill!: HTMLElement;
  private fullscreenBtn!: HTMLButtonElement;

  // Sidebar y plan
  private appEl!: HTMLElement;
  private planTimer!: HTMLElement;
  private planBarFill!: HTMLElement;
  private planBadge!: HTMLElement;
  private planNote!: HTMLElement;
  private upgradeBtn!: HTMLButtonElement;
  private userPlan!: HTMLElement;
  private libraryBadge: HTMLElement | null = null;

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
  private currentDuration = 0;
  private savedCurrentToLibrary = false;
  private isRecording = false;
  private tickInterval: number | null = null;
  private recordStartTime = 0;
  private recordLimitSeconds = Infinity;
  private remainingAtStart = Infinity;
  private elapsedSeconds = 0;
  private limitReached = false;
  private benefitIndex = 0;
  private benefitInterval: number | null = null;
  private currentView = "dashboard";
  private renamingId: string | null = null;

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
    this.initStaticIcons();
    this.initFaq();
    this.setupEventListeners();
    this.applyMobileDefaults();
    this.updateFormatInfo();
    this.updateQualityPill();
    this.updatePlanCard();
    this.subscribeLibrary();
  }

  /**
   * Obtiene las referencias a los elementos del DOM.
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
    this.saveLibraryBtn = document.getElementById("saveLibraryBtn") as HTMLButtonElement;
    this.startBtn = document.getElementById("startBtn") as HTMLButtonElement;
    this.stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
    this.panControl = document.getElementById("panControl")!;
    this.panSlider = document.getElementById("panSlider") as HTMLInputElement;
    this.actionFooter = document.getElementById("actionFooter")!;
    this.recTimer = document.getElementById("recTimer")!;
    this.recCounter = document.getElementById("recCounter")!;
    this.recElapsed = document.getElementById("recElapsed")!;
    this.recLimitEl = document.getElementById("recLimit")!;
    this.qualityPill = document.getElementById("qualityPill")!;
    this.formatPill = document.getElementById("formatPill")!;
    this.fullscreenBtn = document.getElementById("fullscreenBtn") as HTMLButtonElement;

    this.planTimer = document.getElementById("planTimer")!;
    this.planBarFill = document.getElementById("planBarFill")!;
    this.planBadge = document.getElementById("planBadge")!;
    this.planNote = document.getElementById("planNote")!;
    this.upgradeBtn = document.getElementById("upgradeBtn") as HTMLButtonElement;
    this.userPlan = document.getElementById("userPlan")!;

    this.modalOverlay = document.getElementById("modalOverlay")!;
    this.modalBox = document.getElementById("modalBox")!;
  }

  /**
   * Inserta los iconos SVG estáticos de la interfaz.
   */
  private initStaticIcons(): void {
    document.getElementById("collapseBtn")!.innerHTML = ICONS.chevronLeft;
    document.getElementById("userAvatar")!.innerHTML = ICONS.user;
    document.getElementById("placeholderIcon")!.innerHTML = ICONS.record;
    this.fullscreenBtn.innerHTML = ICONS.expand;
    this.saveLibraryBtn.innerHTML = `${ICONS.save} Guardar en biblioteca`;
    this.downloadLink.innerHTML = `${ICONS.download} Descargar video`;
  }

  /**
   * Construye la navegación lateral.
   */
  private initNav(): void {
    const nav = document.getElementById("nav")!;

    NAV_ITEMS.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = `nav-item ${item.id === "dashboard" ? "active" : ""}`;
      btn.dataset.view = item.id;
      btn.title = item.label;
      btn.innerHTML = `
        <span class="nav-icon">${ICONS[item.icon] ?? ""}</span>
        <span class="nav-label">${item.label}</span>
      `;

      if (item.id === "library") {
        const badge = document.createElement("span");
        badge.className = "nav-badge";
        badge.textContent = "0";
        btn.appendChild(badge);
        this.libraryBadge = badge;
      }

      btn.addEventListener("click", () => this.switchView(item.id));
      nav.appendChild(btn);
    });
  }

  /**
   * Cambia la vista activa del área principal.
   * @param {string} viewId - Vista destino.
   */
  private switchView(viewId: string): void {
    this.currentView = viewId;

    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", (el as HTMLElement).dataset.view === viewId);
    });

    document.querySelectorAll(".view").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });
    const view = document.getElementById(`view-${viewId}`);
    if (view) view.style.display = "flex";

    // El panel de configuración solo tiene sentido en la vista de grabación.
    const configPanel = document.getElementById("configPanel")!;
    configPanel.style.display = viewId === "dashboard" ? "flex" : "none";

    if (viewId === "library") this.renderGallery();
    if (viewId === "settings") this.renderSettings();
  }

  /**
   * Configura el botón de contraer/desplegar el sidebar.
   */
  private initSidebar(): void {
    const collapseBtn = document.getElementById("collapseBtn") as HTMLButtonElement;

    let collapsed = false;
    try {
      collapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR) === "collapsed";
    } catch {
      collapsed = false;
    }
    this.applyCollapsed(collapsed, collapseBtn);

    collapseBtn.addEventListener("click", () => {
      const next = !this.appEl.classList.contains("collapsed");
      this.applyCollapsed(next, collapseBtn);
      try {
        localStorage.setItem(STORAGE_KEYS.SIDEBAR, next ? "collapsed" : "expanded");
      } catch {
        // Silencioso.
      }
    });

    // El logo vuelve a la vista de grabación.
    document.getElementById("brandLink")!.addEventListener("click", (e) => {
      e.preventDefault();
      this.switchView("dashboard");
    });
  }

  /**
   * Aplica el estado contraído del sidebar.
   * @param {boolean} collapsed - true para contraer.
   * @param {HTMLButtonElement} btn - Botón de contraer.
   */
  private applyCollapsed(collapsed: boolean, btn: HTMLButtonElement): void {
    this.appEl.classList.toggle("collapsed", collapsed);
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn.title = collapsed ? "Desplegar menú" : "Contraer menú";
    btn.setAttribute("aria-label", btn.title);
  }

  // ============================================
  // Opciones y bloqueo del plan Pro
  // ============================================

  /**
   * Indica si un valor concreto está reservado al plan Pro.
   * @param {GatedSetting} setting - Ajuste al que pertenece el valor.
   * @param {string} value - Valor a comprobar.
   * @returns {boolean} true si requiere Pro.
   */
  private isProOnly(setting: GatedSetting, value: string): boolean {
    const lists: Record<GatedSetting, readonly string[]> = {
      resolution: PRO_ONLY.resolutions,
      framerate: PRO_ONLY.framerates,
      bitrate: PRO_ONLY.bitrates,
    };
    return lists[setting].includes(value);
  }

  /**
   * Construye las opciones de un ajuste marcando las que son Pro.
   * @param {GatedSetting} setting - Ajuste a construir.
   * @returns {SelectOption[]} Opciones para el select.
   */
  private buildGatedOptions(setting: GatedSetting): SelectOption[] {
    const source: Record<GatedSetting, Record<string, { label: string }>> = {
      resolution: RESOLUTIONS,
      framerate: FRAMERATES,
      bitrate: BITRATES,
    };
    const pro = isPro();

    return Object.entries(source[setting]).map(([value, { label }]) => ({
      value,
      label: !pro && this.isProOnly(setting, value) ? `${label} 🔒 Pro` : label,
    }));
  }

  /**
   * Gestiona el cambio de un ajuste que puede requerir Pro.
   * Si el usuario gratuito elige una opción Pro, se revierte y se ofrece la mejora.
   * @param {GatedSetting} setting - Ajuste modificado.
   * @param {Select} select - Componente afectado.
   * @param {() => void} [onValid] - Acción si el valor es válido.
   */
  private handleGatedChange(setting: GatedSetting, select: Select, onValid?: () => void): void {
    const value = select.getValue();

    if (!isPro() && this.isProOnly(setting, value)) {
      select.setValue(FREE_DEFAULTS[setting]);
      this.updateQualityPill();
      this.openProModal(false, setting);
      return;
    }

    onValid?.();
  }

  /**
   * Reconstruye las opciones tras activar Pro (quita los candados).
   */
  private refreshProGating(): void {
    const resolution = this.resolutionSelect.getValue();
    const framerate = this.framerateSelect.getValue();
    const bitrate = this.qualitySelect.getValue();

    this.resolutionSelect.setOptions(this.buildGatedOptions("resolution"));
    this.framerateSelect.setOptions(this.buildGatedOptions("framerate"));
    this.qualitySelect.setOptions(this.buildGatedOptions("bitrate"));

    this.resolutionSelect.setValue(resolution);
    this.framerateSelect.setValue(framerate);
    this.qualitySelect.setValue(bitrate);
  }

  /**
   * Crea los controles de configuración con iconos SVG.
   */
  private initComponents(): void {
    const withIcon = (icon: string, text: string): string =>
      `<span class="label-icon">${ICONS[icon] ?? ""}</span>${text}`;

    // El plan gratuito arranca con valores permitidos; Pro con los máximos.
    const pro = isPro();
    const initial = {
      resolution: pro ? DEFAULT_CONFIG.resolution : FREE_DEFAULTS.resolution,
      framerate: pro ? DEFAULT_CONFIG.framerate : FREE_DEFAULTS.framerate,
      bitrate: pro ? DEFAULT_CONFIG.bitrate : FREE_DEFAULTS.bitrate,
    };

    this.orientationSelect = new Select({
      id: "orientationSelect",
      label: withIcon("orientation", "Orientación del video"),
      labelAsHtml: true,
      options: Object.entries(ORIENTATIONS).map(([value, { label }]) => ({ value, label })),
      value: DEFAULT_CONFIG.orientation,
      onChange: (value) => this.handleOrientationChange(value as "horizontal" | "vertical"),
    });

    this.formatSelect = new Select({
      id: "formatSelect",
      label: withIcon("file", "Formato de archivo"),
      labelAsHtml: true,
      options: FORMAT_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
      value: DEFAULT_CONFIG.format,
      onChange: () => {
        this.updateFormatInfo();
        this.updateFormatPill();
      },
    });

    this.resolutionSelect = new Select({
      id: "resolutionSelect",
      label: withIcon("monitor", "Resolución base"),
      labelAsHtml: true,
      options: this.buildGatedOptions("resolution"),
      value: initial.resolution,
      onChange: () =>
        this.handleGatedChange("resolution", this.resolutionSelect, () => this.updateQualityPill()),
    });

    this.framerateSelect = new Select({
      id: "framerateSelect",
      label: withIcon("zap", "Fotogramas por segundo"),
      labelAsHtml: true,
      options: this.buildGatedOptions("framerate"),
      value: initial.framerate,
      onChange: () =>
        this.handleGatedChange("framerate", this.framerateSelect, () => this.updateQualityPill()),
    });

    this.qualitySelect = new Select({
      id: "qualitySelect",
      label: withIcon("sparkles", "Calidad de video (bitrate)"),
      labelAsHtml: true,
      options: this.buildGatedOptions("bitrate"),
      value: initial.bitrate,
      onChange: () => this.handleGatedChange("bitrate", this.qualitySelect),
    });

    this.audioToggle = new Toggle({
      id: "recordAudio",
      label: `<span class="label-icon">${ICONS.volume}</span>Incluir audio del sistema`,
      labelAsHtml: true,
      checked: DEFAULT_CONFIG.includeAudio,
    });

    this.replacePlaceholder("orientation", this.orientationSelect.getElement());
    this.replacePlaceholder("format", this.formatSelect.getElement());
    this.replacePlaceholder("resolution", this.resolutionSelect.getElement());
    this.replacePlaceholder("framerate", this.framerateSelect.getElement());
    this.replacePlaceholder("quality", this.qualitySelect.getElement());
    this.replacePlaceholder("audioToggleWrapper", this.audioToggle.getElement());

    this.updateFormatPill();
  }

  /**
   * Sustituye un contenedor por el elemento del componente.
   * @param {string} id - Id del contenedor.
   * @param {HTMLElement} element - Elemento a insertar.
   */
  private replacePlaceholder(id: string, element: HTMLElement): void {
    const container = document.getElementById(id);
    if (container) container.replaceWith(element);
  }

  /**
   * En móvil, grabar en vertical (9:16) por defecto.
   */
  private applyMobileDefaults(): void {
    if (isMobileViewport()) {
      this.orientationSelect.setValue("vertical");
      this.handleOrientationChange("vertical");
    }
  }

  /**
   * Crea el slider de beneficios del banner.
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
      dot.addEventListener("click", () => {
        this.showBenefit(index);
        this.startBenefitRotation();
      });
      dotsContainer.appendChild(dot);
    });

    this.startBenefitRotation();
  }

  /**
   * Muestra un beneficio concreto.
   * @param {number} index - Índice objetivo.
   */
  private showBenefit(index: number): void {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".hero-dot-nav");
    if (slides.length === 0) return;

    this.benefitIndex = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle("active", i === this.benefitIndex));
    dots.forEach((d, i) => d.classList.toggle("active", i === this.benefitIndex));
  }

  /**
   * Inicia o reinicia la rotación automática del banner.
   */
  private startBenefitRotation(): void {
    if (this.benefitInterval) window.clearInterval(this.benefitInterval);
    this.benefitInterval = window.setInterval(() => {
      this.showBenefit(this.benefitIndex + 1);
    }, 5000);
  }

  /**
   * Construye el acordeón de preguntas frecuentes.
   */
  private initFaq(): void {
    const list = document.getElementById("faqList");
    if (!list) return;

    FAQ_ITEMS.forEach((faq) => {
      const item = document.createElement("div");
      item.className = "faq-item";

      const question = document.createElement("button");
      question.className = "faq-question";
      question.setAttribute("aria-expanded", "false");
      question.innerHTML = `
        <span>${faq.question}</span>
        <span class="faq-chevron">${ICONS.chevronDown}</span>
      `;

      const answer = document.createElement("div");
      answer.className = "faq-answer";
      answer.innerHTML = faq.answer;

      question.addEventListener("click", () => {
        const open = item.classList.toggle("open");
        question.setAttribute("aria-expanded", open ? "true" : "false");
      });

      item.appendChild(question);
      item.appendChild(answer);
      list.appendChild(item);
    });
  }

  /**
   * Registra los listeners de la interfaz.
   */
  private setupEventListeners(): void {
    this.startBtn.addEventListener("click", () => void this.handleStartRecording());
    this.stopBtn.addEventListener("click", () => void this.handleStopRecording());
    this.discardBtn.addEventListener("click", () => this.handleDiscard());
    this.saveLibraryBtn.addEventListener("click", () => void this.handleSaveToLibrary());
    this.upgradeBtn.addEventListener("click", () => this.openProModal());
    this.fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());

    document.getElementById("galleryClearBtn")!.addEventListener("click", () => {
      this.confirmClearLibrary();
    });

    this.panSlider.addEventListener("input", () => {
      recorder.updatePanValue(parseFloat(this.panSlider.value) / 100);
    });

    this.modalOverlay.addEventListener("click", (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modalOverlay.style.display === "flex") {
        this.closeModal();
      }
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
   * Mantiene el badge de la biblioteca sincronizado.
   */
  private subscribeLibrary(): void {
    const update = (items: LibraryItem[]): void => {
      if (this.libraryBadge) {
        this.libraryBadge.textContent = String(items.length);
        this.libraryBadge.classList.toggle("visible", items.length > 0);
      }
      if (this.currentView === "library") this.renderGallery();
    };
    library.subscribe(update);
    update(library.getAll());
  }

  /**
   * Actualiza el aviso del formato de salida (incluye fallback).
   */
  private updateFormatInfo(): void {
    const formatInfo = document.getElementById("formatInfo");
    if (!formatInfo || !this.formatSelect) return;

    const preferred = this.formatSelect.getValue() as "mp4" | "webm";
    const supported = isFormatSupported(preferred);
    const label = FORMAT_OPTIONS.find((option) => option.value === preferred)?.label ?? preferred;

    if (supported) {
      formatInfo.innerHTML = `Formato de salida: <strong>${label}</strong>`;
      formatInfo.style.borderColor = "rgba(34,197,94,0.35)";
      formatInfo.style.color = "#86efac";
    } else {
      const fallback = preferred === "mp4" ? "WebM (VP9)" : "MP4 (H.264)";
      formatInfo.innerHTML = `Tu navegador no soporta <strong>${preferred.toUpperCase()}</strong>. Se grabará en <strong>${fallback}</strong>.`;
      formatInfo.style.borderColor = "rgba(245,158,11,0.35)";
      formatInfo.style.color = "#fcd34d";
    }
  }

  /**
   * Actualiza la etiqueta de calidad del pie del escenario.
   */
  private updateQualityPill(): void {
    if (!this.resolutionSelect) return;
    const res = this.resolutionSelect.getValue();
    const fps = this.framerateSelect.getValue();
    const resLabel = res === "2160" ? "4K" : res === "1440" ? "2K" : "HD";
    this.qualityPill.textContent = `${resLabel} ${fps}`;
  }

  /**
   * Actualiza la etiqueta de formato del pie del escenario.
   */
  private updateFormatPill(): void {
    if (!this.formatSelect) return;
    this.formatPill.textContent = this.formatSelect.getValue().toUpperCase();
  }

  /**
   * Actualiza la tarjeta del plan y el chip de usuario.
   * @param {number} [liveRemaining] - Segundos restantes en vivo durante la grabación.
   */
  private updatePlanCard(liveRemaining?: number): void {
    if (isPro()) {
      this.planBadge.textContent = "Plan Pro";
      this.planBadge.classList.add("pro");
      this.planTimer.textContent = "∞";
      this.planBarFill.style.width = "100%";
      this.planNote.textContent = "Grabación ilimitada. ¡Gracias por tu apoyo!";
      this.upgradeBtn.style.display = "none";
      this.userPlan.textContent = "Plan Pro";
      return;
    }

    const limit = getDailyLimitSeconds();
    const remaining = liveRemaining ?? getRemainingSeconds();

    this.planBadge.textContent = "Plan gratuito";
    this.planBadge.classList.remove("pro");
    this.planTimer.textContent = formatClock(remaining);
    this.planBarFill.style.width = `${Math.max(0, Math.min(100, (remaining / limit) * 100))}%`;
    this.planNote.textContent =
      remaining > 0
        ? "3 minutos gratis por grabación. El crédito se renueva mañana."
        : "Crédito agotado. Vuelve mañana o desbloquea Pro para grabar sin límites.";
    this.upgradeBtn.style.display = "flex";
    this.userPlan.textContent = "Plan gratuito";
  }

  /**
   * Aplica el cambio de orientación.
   * @param {("horizontal"|"vertical")} orientation - Orientación elegida.
   */
  private handleOrientationChange(orientation: "horizontal" | "vertical"): void {
    const isVertical = orientation === "vertical";
    this.videoStage.classList.toggle("vertical", isVertical);
    this.panControl.style.display = isVertical && this.isRecording ? "block" : "none";
  }

  /**
   * Inicia la grabación aplicando el límite del plan.
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
        format: this.formatSelect.getValue() as "mp4" | "webm",
      };

      this.isRecording = true;
      this.remainingAtStart = getRemainingSeconds();
      this.recordLimitSeconds = getRecordingLimitSeconds();
      this.limitReached = false;
      this.elapsedSeconds = 0;
      this.recordStartTime = Date.now();
      this.recLimitEl.textContent = formatClock(this.recordLimitSeconds);
      this.recCounter.style.display = "inline-flex";
      this.startTick();

      this.currentRecording = await recorder.startRecording(config, this.previewVideo);
    } catch (error) {
      console.error("Error al iniciar grabación:", error);
      this.stopTick();
      this.handleRecordingError(error as Error);
    }
  }

  /**
   * Detiene la grabación en curso.
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
   * Temporizador de grabación: actualiza contadores y aplica el límite.
   */
  private startTick(): void {
    this.stopTick();
    this.tickInterval = window.setInterval(() => {
      this.elapsedSeconds = (Date.now() - this.recordStartTime) / 1000;
      this.recTimer.textContent = formatTime(this.elapsedSeconds);
      this.recElapsed.textContent = formatClock(this.elapsedSeconds);

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
   * Procesa el fin de la grabación.
   * @param {RecordingResult} result - Resultado devuelto por el grabador.
   */
  private handleRecordingStop(result: RecordingResult): void {
    this.isRecording = false;
    this.stopTick();
    this.currentRecording = result;
    this.currentDuration = this.elapsedSeconds;
    this.savedCurrentToLibrary = false;

    consumeSeconds(this.elapsedSeconds);
    this.updatePlanCard();
    this.showResult(result);
    this.lockControls(false);

    if (this.limitReached) {
      this.openProModal(true);
    }
  }

  /**
   * Gestiona errores de grabación.
   * @param {Error} error - Error capturado.
   */
  private handleRecordingError(error: Error): void {
    this.isRecording = false;
    this.stopTick();
    this.lockControls(false);
    this.resetUI();

    const message = error?.message || ERROR_MESSAGES.RECORDING_FAILED;
    // El usuario cancelando el diálogo de compartir no es un fallo real.
    if (!/permis|denied|cancel/i.test(message)) {
      this.showAlertModal("No se pudo grabar", message);
    }
  }

  /**
   * Muestra el resultado de la grabación.
   * @param {RecordingResult} result - Resultado.
   */
  private showResult(result: RecordingResult): void {
    this.previewVideo.style.display = "none";
    this.liveIndicator.style.display = "none";
    this.recCounter.style.display = "none";
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

    this.saveLibraryBtn.disabled = false;
    this.saveLibraryBtn.innerHTML = `${ICONS.save} Guardar en biblioteca`;

    const used = recorder.getLastFormat();
    if (used) {
      this.formatPill.textContent = used.ext.toUpperCase();
      if (used.fellBack) this.updateFormatInfo();
    }
  }

  /**
   * Guarda la grabación actual en la biblioteca del navegador.
   */
  private async handleSaveToLibrary(): Promise<void> {
    if (!this.currentRecording || this.savedCurrentToLibrary) return;

    this.saveLibraryBtn.disabled = true;
    this.saveLibraryBtn.textContent = "Guardando...";

    try {
      // Pedir almacenamiento duradero para que el navegador no borre los
      // vídeos automáticamente si necesita liberar espacio.
      void requestPersistentStorage();

      await library.add({
        filename: this.currentRecording.filename,
        blob: this.currentRecording.blob,
        durationSeconds: this.currentDuration,
      });

      this.savedCurrentToLibrary = true;
      this.saveLibraryBtn.innerHTML = `${ICONS.check} Guardado`;
    } catch (error) {
      console.error("No se pudo guardar en la biblioteca:", error);
      this.saveLibraryBtn.disabled = false;
      this.saveLibraryBtn.innerHTML = `${ICONS.save} Guardar en biblioteca`;
      this.showAlertModal(
        "No se pudo guardar",
        "Parece que no hay espacio suficiente en el navegador. Descarga el vídeo o elimina grabaciones antiguas de la biblioteca e inténtalo de nuevo."
      );
    }
  }

  /**
   * Descarta la grabación actual.
   */
  private handleDiscard(): void {
    // Solo se libera la memoria si no quedó guardada en la biblioteca.
    if (this.currentRecording && !this.savedCurrentToLibrary) {
      try {
        URL.revokeObjectURL(this.currentRecording.url);
      } catch {
        // Silencioso.
      }
    }
    this.currentRecording = null;
    this.savedCurrentToLibrary = false;
    this.resetUI();
  }

  /**
   * Bloquea o desbloquea los controles durante la grabación.
   * @param {boolean} locked - true para bloquear.
   */
  private lockControls(locked: boolean): void {
    this.orientationSelect.setDisabled(locked);
    this.formatSelect.setDisabled(locked);
    this.resolutionSelect.setDisabled(locked);
    this.framerateSelect.setDisabled(locked);
    this.qualitySelect.setDisabled(locked);
    this.audioToggle.setDisabled(locked);
  }

  /**
   * Prepara la interfaz para el estado "grabando".
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
    this.recElapsed.textContent = "00:00";
    this.statusBadge.classList.add("active");
    this.statusBadge.innerHTML = '<span class="pulse-dot"></span> Grabando';

    const isVertical = this.orientationSelect.getValue() === "vertical";
    this.panControl.style.display = isVertical ? "block" : "none";
    this.videoStage.classList.toggle("vertical", isVertical);
  }

  /**
   * Restaura la interfaz al estado inicial.
   */
  private resetUI(): void {
    this.placeholderText.style.display = "block";
    this.previewVideo.style.display = "none";
    this.resultVideo.style.display = "none";
    this.liveIndicator.style.display = "none";
    this.recCounter.style.display = "none";
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
    this.resultVideo.removeAttribute("src");
  }

  /**
   * Alterna pantalla completa del escenario.
   */
  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void this.videoStage.requestFullscreen?.();
    }
  }

  // ============================================
  // Galería (biblioteca a pantalla completa)
  // ============================================

  /**
   * Dibuja la galería con miniaturas y acciones.
   */
  private renderGallery(): void {
    const grid = document.getElementById("galleryGrid");
    const subtitle = document.getElementById("gallerySubtitle");
    const clearBtn = document.getElementById("galleryClearBtn") as HTMLButtonElement | null;
    if (!grid) return;

    const items = library.getAll();

    if (subtitle) {
      subtitle.textContent =
        items.length === 0
          ? "Todavía no has guardado ninguna grabación."
          : `${items.length} ${items.length === 1 ? "grabación" : "grabaciones"} · ${formatFileSize(library.totalSize())}`;
    }
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "flex" : "none";

    const warning = document.getElementById("galleryWarning");
    if (warning) {
      warning.innerHTML = library.isPersistent
        ? "Tus grabaciones se guardan <strong>en este navegador</strong> y siguen aquí aunque cierres la página. No se suben a ningún servidor, así que <strong>no estarán en otros dispositivos</strong>: descarga lo importante para tenerlo a salvo."
        : "Este navegador no permite guardar grabaciones de forma permanente, así que <strong>se perderán al recargar la página</strong>. Descarga lo que quieras conservar.";
      warning.style.display = "block";
    }

    grid.innerHTML = "";

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.film}</div>
          Aún no hay grabaciones aquí.<br />
          Graba algo y pulsa "Guardar en biblioteca" para verlo en esta pantalla.
        </div>`;
      return;
    }

    items.forEach((item) => grid.appendChild(this.buildGalleryItem(item)));
  }

  /**
   * Construye una tarjeta de la galería.
   * @param {LibraryItem} item - Grabación a representar.
   * @returns {HTMLElement} Elemento de la tarjeta.
   */
  private buildGalleryItem(item: LibraryItem): HTMLElement {
    const card = document.createElement("div");
    card.className = "gallery-item";
    card.dataset.id = item.id;

    const time = item.createdAt.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    const isRenaming = this.renamingId === item.id;

    card.innerHTML = `
      <div class="gallery-thumb" title="Reproducir">
        <video src="${item.url}#t=0.1" preload="metadata" muted playsinline></video>
        <div class="gallery-play">${ICONS.play}</div>
        <span class="gallery-duration">${formatClock(item.durationSeconds)}</span>
      </div>
      <div class="gallery-body">
        ${
          isRenaming
            ? `<input class="gallery-name-input" type="text" value="${escapeHtml(item.filename)}" />`
            : `<div class="gallery-name">${escapeHtml(item.filename)}</div>`
        }
        <div class="gallery-meta">${formatFileSize(item.size)} · ${time}</div>
        <div class="gallery-actions">
          <a class="icon-btn" href="${item.url}" download="${escapeHtml(item.filename)}" title="Descargar" aria-label="Descargar">${ICONS.download}</a>
          <button class="icon-btn" data-action="rename" title="Cambiar nombre" aria-label="Cambiar nombre">${ICONS.edit}</button>
          <button class="icon-btn danger" data-action="delete" title="Eliminar" aria-label="Eliminar">${ICONS.trash}</button>
        </div>
      </div>
    `;

    card.querySelector(".gallery-thumb")!.addEventListener("click", () => {
      this.openPlayerModal(item);
    });

    card.querySelector('[data-action="rename"]')!.addEventListener("click", () => {
      this.renamingId = item.id;
      this.renderGallery();
      const input = document.querySelector<HTMLInputElement>(
        `.gallery-item[data-id="${item.id}"] .gallery-name-input`
      );
      input?.focus();
      input?.select();
    });

    card.querySelector('[data-action="delete"]')!.addEventListener("click", () => {
      this.confirmDeleteItem(item);
    });

    const input = card.querySelector<HTMLInputElement>(".gallery-name-input");
    if (input) {
      const commit = (): void => {
        if (this.renamingId !== item.id) return;
        this.renamingId = null;
        void library.rename(item.id, input.value);
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          this.renamingId = null;
          this.renderGallery();
        }
      });
      input.addEventListener("blur", commit);
    }

    return card;
  }

  /**
   * Abre un reproductor grande para una grabación.
   * @param {LibraryItem} item - Grabación a reproducir.
   */
  private openPlayerModal(item: LibraryItem): void {
    this.modalBox.classList.add("modal-wide");
    this.modalBox.innerHTML = `
      <h2>${ICONS.play} ${escapeHtml(item.filename)}</h2>
      <p class="modal-sub">${formatFileSize(item.size)} · ${formatClock(item.durationSeconds)}</p>
      <video class="modal-player" src="${item.url}" controls autoplay playsinline></video>
      <button class="modal-close" id="modalCloseBtn">Cerrar</button>
    `;
    this.modalOverlay.style.display = "flex";
    document.getElementById("modalCloseBtn")!.addEventListener("click", () => this.closeModal());
  }

  /**
   * Pide confirmación antes de eliminar una grabación.
   * @param {LibraryItem} item - Grabación a eliminar.
   */
  private confirmDeleteItem(item: LibraryItem): void {
    this.modalBox.classList.remove("modal-wide");
    this.modalBox.innerHTML = `
      <h2>${ICONS.trash} Eliminar grabación</h2>
      <p class="modal-sub">
        Se eliminará <strong>${escapeHtml(item.filename)}</strong>.
        Esta acción no se puede deshacer y el vídeo no se podrá recuperar.
      </p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelDeleteBtn">Cancelar</button>
        <button class="btn btn-primary" id="confirmDeleteBtn">Eliminar</button>
      </div>
    `;
    this.modalOverlay.style.display = "flex";

    document.getElementById("cancelDeleteBtn")!.addEventListener("click", () => this.closeModal());
    document.getElementById("confirmDeleteBtn")!.addEventListener("click", () => {
      // Si el vídeo borrado es el que está en el reproductor principal, limpiarlo.
      if (this.currentRecording?.url === item.url) {
        this.currentRecording = null;
        this.savedCurrentToLibrary = false;
        this.resetUI();
      }
      void library.remove(item.id);
      this.closeModal();
    });
  }

  /**
   * Pide confirmación antes de vaciar la biblioteca.
   */
  private confirmClearLibrary(): void {
    if (library.count() === 0) return;

    this.modalBox.classList.remove("modal-wide");
    this.modalBox.innerHTML = `
      <h2>${ICONS.trash} Vaciar biblioteca</h2>
      <p class="modal-sub">
        Se eliminarán las <strong>${library.count()}</strong> grabaciones guardadas.
        Esta acción no se puede deshacer.
      </p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelClearBtn">Cancelar</button>
        <button class="btn btn-primary" id="confirmClearBtn">Vaciar</button>
      </div>
    `;
    this.modalOverlay.style.display = "flex";

    document.getElementById("cancelClearBtn")!.addEventListener("click", () => this.closeModal());
    document.getElementById("confirmClearBtn")!.addEventListener("click", () => {
      void library.clear();
      this.closeModal();
    });
  }

  // ============================================
  // Ajustes
  // ============================================

  /**
   * Renderiza la vista de ajustes.
   */
  private renderSettings(): void {
    const summary = document.getElementById("planSummary")!;
    const pro = isPro();

    summary.innerHTML = `
      <div>
        <div class="plan-summary-label">Tu plan actual</div>
        <div class="plan-summary-value">${pro ? "SCREENREC Pro" : "Plan gratuito"}</div>
      </div>
      <div style="text-align:right">
        <div class="plan-summary-label">${pro ? "Tiempo de grabación" : "Crédito restante hoy"}</div>
        <div class="plan-summary-value">${pro ? "Ilimitado" : formatClock(getRemainingSeconds())}</div>
      </div>
    `;

    const container = document.getElementById("toolsInfo")!;
    const support = getBrowserSupportInfo();
    const rows: { label: string; ok: boolean }[] = [
      { label: "Captura de pantalla", ok: support.displayMedia },
      { label: "Grabación de vídeo", ok: support.mediaRecorder },
      { label: "Procesado de vídeo", ok: support.canvasCaptureStream },
      { label: "Audio del sistema", ok: support.audioContext },
      { label: "Exportar en MP4 (H.264)", ok: isFormatSupported("mp4") },
      { label: "Exportar en WebM (VP9)", ok: isFormatSupported("webm") },
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

    // Uso de almacenamiento de la biblioteca.
    void this.renderStorageInfo();

    const actions = document.getElementById("settingsActions")!;
    actions.innerHTML = "";

    if (pro) {
      const disable = document.createElement("button");
      disable.className = "btn btn-secondary";
      disable.textContent = "Cerrar sesión Pro en este equipo";
      disable.addEventListener("click", () => {
        setPro(false);
        this.refreshProGating();
        this.updatePlanCard();
        this.renderSettings();
      });
      actions.appendChild(disable);
    } else {
      const upgrade = document.createElement("button");
      upgrade.className = "btn btn-pro";
      upgrade.textContent = "Desbloquear Pro";
      upgrade.addEventListener("click", () => this.openProModal());
      actions.appendChild(upgrade);
    }
  }

  /**
   * Añade a los ajustes una fila con el espacio ocupado por las grabaciones.
   */
  private async renderStorageInfo(): Promise<void> {
    const container = document.getElementById("toolsInfo");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "tool-row";

    const count = library.count();
    const own = formatFileSize(library.totalSize());
    const estimate = await estimateStorage();

    let detail = `${count} ${count === 1 ? "grabación" : "grabaciones"} · ${own}`;
    if (estimate && estimate.quotaBytes > 0) {
      detail += ` de ${formatFileSize(estimate.quotaBytes)} disponibles`;
    }

    row.innerHTML = `
      <span>Biblioteca guardada en este navegador</span>
      <span class="${library.isPersistent ? "tool-status-ok" : "tool-status-no"}">${
        library.isPersistent ? detail : "No disponible"
      }</span>
    `;
    container.appendChild(row);
  }

  // ============================================
  // Pro y verificación OTP
  // ============================================

  /**
   * Abre la ventana de mejora a Pro.
   * @param {boolean} [limitHit] - true si se abre por agotar el tiempo.
   * @param {GatedSetting} [blockedSetting] - Ajuste Pro que se intentó usar.
   */
  private openProModal(limitHit = false, blockedSetting?: GatedSetting): void {
    this.modalBox.classList.remove("modal-wide");
    const features = PRO.features.map((f) => `<li>${f}</li>`).join("");
    const hasCheckout = PRO.checkoutUrl && PRO.checkoutUrl !== "#";

    const settingNames: Record<GatedSetting, string> = {
      resolution: "esa resolución",
      framerate: "60 FPS",
      bitrate: "ese bitrate",
    };

    let subtitle = "Desbloquea todo el potencial de SCREENREC.";
    if (limitHit) {
      subtitle =
        "Has alcanzado el límite de 3 minutos del plan gratuito. Desbloquea Pro para grabar sin límites.";
    } else if (blockedSetting) {
      subtitle = `Para grabar con ${settingNames[blockedSetting]} necesitas el plan Pro.`;
    }

    this.modalBox.innerHTML = `
      <h2>${ICONS.sparkles} SCREENREC Pro</h2>
      <p class="modal-sub">${subtitle}</p>
      <div class="modal-price">${PRO.priceLabel}</div>
      <ul class="modal-features">${features}</ul>
      <div class="modal-actions">
        ${hasCheckout ? '<button class="btn btn-secondary" id="modalCheckoutBtn">Suscribirme</button>' : ""}
        <button class="btn btn-pro" id="modalVerifyBtn">${ICONS.lock} Verificar por correo</button>
      </div>
      <button class="modal-close" id="modalCloseBtn">Ahora no</button>
    `;

    this.modalOverlay.style.display = "flex";

    document.getElementById("modalCloseBtn")!.addEventListener("click", () => this.closeModal());
    document.getElementById("modalVerifyBtn")!.addEventListener("click", () => {
      this.openEmailModal();
    });
    document.getElementById("modalCheckoutBtn")?.addEventListener("click", () => {
      window.open(PRO.checkoutUrl, "_blank", "noopener");
    });
  }

  /**
   * Paso 1 del OTP: pedir el correo.
   */
  private openEmailModal(): void {
    const channel = getOtpChannel();
    const isSelfService = channel === "visitor";

    const intro = isSelfService
      ? `Te enviaremos un código de ${OTP_LENGTH} dígitos para activar Pro.`
      : "Déjanos tu correo y activaremos tu acceso Pro lo antes posible.";

    this.modalBox.innerHTML = `
      <h2>${ICONS.mail} ${isSelfService ? "Verifica tu correo" : "Solicita acceso Pro"}</h2>
      <p class="modal-sub">
        ${intro}
        Solo aceptamos proveedores conocidos (Gmail, Outlook, Yahoo, iCloud o Proton).
      </p>
      <input type="email" class="modal-input" id="otpEmail" placeholder="tucorreo@gmail.com" autocomplete="email" />
      <div class="modal-error" id="otpEmailError"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="otpCancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="otpSendBtn">${isSelfService ? "Enviar código" : "Enviar solicitud"}</button>
      </div>
    `;

    const input = document.getElementById("otpEmail") as HTMLInputElement;
    const errorEl = document.getElementById("otpEmailError")!;
    const sendBtn = document.getElementById("otpSendBtn") as HTMLButtonElement;
    input.focus();

    const send = async (): Promise<void> => {
      const validation = validateEmail(input.value);
      if (!validation.valid) {
        errorEl.textContent = validation.reason || "Correo no válido.";
        return;
      }

      if (channel === "none") {
        errorEl.textContent = "La verificación aún no está configurada.";
        return;
      }

      errorEl.textContent = "";
      sendBtn.disabled = true;
      sendBtn.textContent = "Enviando...";

      const email = input.value.trim().toLowerCase();
      const result = await otpService.createChallenge(email);

      if (!result.sent) {
        sendBtn.disabled = false;
        sendBtn.textContent = isSelfService ? "Enviar código" : "Enviar solicitud";
        errorEl.textContent = "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.";
        return;
      }

      if (result.channel === "visitor") {
        this.openCodeModal(email);
      } else {
        this.showRequestSent(email);
      }
    };

    document.getElementById("otpCancelBtn")!.addEventListener("click", () => this.closeModal());
    sendBtn.addEventListener("click", () => void send());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void send();
    });
  }

  /**
   * Paso 2 del OTP: introducir el código recibido.
   * @param {string} email - Correo al que se envió el código.
   */
  private openCodeModal(email: string): void {
    this.modalBox.innerHTML = `
      <h2>${ICONS.lock} Introduce el código</h2>
      <p class="modal-sub">Hemos enviado un código de ${OTP_LENGTH} dígitos a <strong>${escapeHtml(email)}</strong>. Revisa también la carpeta de spam.</p>
      <input type="text" class="modal-input otp-input" id="otpCode" inputmode="numeric" maxlength="${OTP_LENGTH}" placeholder="000000" autocomplete="one-time-code" />
      <div class="modal-error" id="otpCodeError"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="otpBackBtn">Volver</button>
        <button class="btn btn-primary" id="otpVerifyBtn">Activar Pro</button>
      </div>
    `;

    const input = document.getElementById("otpCode") as HTMLInputElement;
    const errorEl = document.getElementById("otpCodeError")!;
    input.focus();

    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    });

    const verify = (): void => {
      const result = otpService.verify(input.value);
      if (result.ok) {
        setPro(true);
        this.refreshProGating();
        this.updatePlanCard();
        this.showProSuccess();
        return;
      }

      const messages: Record<string, string> = {
        "no-challenge": "El código ya no es válido. Solicita uno nuevo.",
        expired: "El código ha caducado. Solicita uno nuevo.",
        mismatch: "El código no coincide. Revísalo e inténtalo otra vez.",
        "too-many-attempts": "Demasiados intentos. Solicita un código nuevo.",
      };
      errorEl.textContent = messages[result.reason] ?? "No se pudo verificar el código.";
    };

    document.getElementById("otpBackBtn")!.addEventListener("click", () => {
      otpService.reset();
      this.openEmailModal();
    });
    document.getElementById("otpVerifyBtn")!.addEventListener("click", () => verify());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") verify();
    });
  }

  /**
   * Confirmación cuando la solicitud se envía al administrador.
   * @param {string} email - Correo del solicitante.
   */
  private showRequestSent(email: string): void {
    otpService.reset();
    this.modalBox.innerHTML = `
      <h2>${ICONS.check} Solicitud enviada</h2>
      <p class="modal-success">Hemos recibido tu solicitud desde <strong>${escapeHtml(email)}</strong>.</p>
      <p class="modal-sub">Te escribiremos a ese correo para activar tu acceso Pro.</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="successCloseBtn">Cerrar</button>
      </div>
    `;
    document.getElementById("successCloseBtn")!.addEventListener("click", () => this.closeModal());
  }

  /**
   * Mensaje de éxito tras activar Pro.
   */
  private showProSuccess(): void {
    this.modalBox.innerHTML = `
      <h2>${ICONS.check} ¡Pro activado!</h2>
      <p class="modal-success">Ya puedes grabar sin límite de tiempo, en 4K y a 60 FPS.</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="successCloseBtn">Empezar a grabar</button>
      </div>
    `;
    document.getElementById("successCloseBtn")!.addEventListener("click", () => {
      this.closeModal();
      this.switchView("dashboard");
    });
  }

  /**
   * Muestra un aviso simple en un modal.
   * @param {string} title - Título del aviso.
   * @param {string} message - Mensaje a mostrar.
   */
  private showAlertModal(title: string, message: string): void {
    this.modalBox.classList.remove("modal-wide");
    this.modalBox.innerHTML = `
      <h2>${title}</h2>
      <p class="modal-sub">${message}</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="alertCloseBtn">Entendido</button>
      </div>
    `;
    this.modalOverlay.style.display = "flex";
    document.getElementById("alertCloseBtn")!.addEventListener("click", () => this.closeModal());
  }

  /**
   * Cierra el modal activo.
   */
  private closeModal(): void {
    this.modalOverlay.style.display = "none";
    this.modalBox.innerHTML = "";
    this.modalBox.classList.remove("modal-wide");
  }

  /**
   * Muestra el error de navegador no soportado.
   */
  private showUnsupportedBrowserError(): void {
    const errorMessage = document.createElement("div");
    errorMessage.innerHTML = `
      <h2>Navegador no soportado</h2>
      <p>${ERROR_MESSAGES.UNSUPPORTED_BROWSER}</p>
      <p>Usa Google Chrome, Microsoft Edge o Firefox para grabar con SCREENREC.</p>
    `;
    errorMessage.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #e41d20; color: white; padding: 2rem; line-height: 1.6;
      border-radius: 14px; text-align: center; z-index: 1000; max-width: 80%;
      font-family: Inter, sans-serif;
    `;
    document.body.innerHTML = "";
    document.body.appendChild(errorMessage);
  }
}

/**
 * Arranca la interfaz cargando antes las grabaciones guardadas.
 */
async function bootstrap(): Promise<void> {
  // La carga es tolerante a fallos: si no hay almacenamiento, la app arranca igual.
  await library.init();
  new Dashboard();
}

/**
 * Inicializa el dashboard cuando el DOM esté listo.
 */
export function initDashboard(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void bootstrap());
  } else {
    void bootstrap();
  }
}
