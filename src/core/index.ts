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
