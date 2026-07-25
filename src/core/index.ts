/**
 * Exportación de módulos del core de SCREENREC
 */

export { ScreenRecorder, recorder } from "./recorder";
export {
  getDisplayStream,
  calculateCanvasDimensions,
  createCanvas,
  drawFrame,
  createCanvasStream,
  combineStreams,
} from "./stream";
export {
  isPro,
  setPro,
  getDailyLimitSeconds,
  getUsedSeconds,
  getRemainingSeconds,
  getRecordingLimitSeconds,
  canRecord,
  consumeSeconds,
  resetUsage,
} from "./usage";
export { library, RecordingLibrary } from "./library";
export type { LibraryItem } from "./library";
export {
  createRecordingStore,
  isPersistenceAvailable,
  estimateStorage,
  requestPersistentStorage,
  MemoryStore,
  IndexedDbStore,
} from "./storage";
export type { RecordingStore, StoredRecording } from "./storage";
export {
  otpService,
  OtpService,
  generateOtpCode,
  getOtpChannel,
  resolveOtpChannel,
  OTP_MAX_ATTEMPTS,
} from "./otp";
