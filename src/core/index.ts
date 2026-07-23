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
  canRecord,
  consumeSeconds,
  resetUsage,
} from "./usage";
