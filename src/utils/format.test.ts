import { describe, it, expect } from "vitest";
import {
  formatTimestamp,
  generateFilename,
  formatFileSize,
  formatTime,
  capitalize,
} from "@/utils/format";
import { APP_NAME } from "@/config/constants";

describe("formatTimestamp", () => {
  it("devuelve un timestamp con el formato YYYY-MM-DD_HH-MM", () => {
    expect(formatTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/);
  });
});

describe("generateFilename", () => {
  it("incluye el nombre de la app y la extensión indicada", () => {
    const filename = generateFilename("mp4");
    expect(filename.startsWith(`${APP_NAME}_`)).toBe(true);
    expect(filename.endsWith(".mp4")).toBe(true);
  });

  it("respeta la extensión webm", () => {
    expect(generateFilename("webm").endsWith(".webm")).toBe(true);
  });
});

describe("formatFileSize", () => {
  it("devuelve '0 Bytes' para 0", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
  });

  it("formatea bytes, KB, MB y GB", () => {
    expect(formatFileSize(512)).toBe("512 Bytes");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1 MB");
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("redondea a dos decimales", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });
});

describe("formatTime", () => {
  it("formatea segundos como HH:MM:SS", () => {
    expect(formatTime(0)).toBe("00:00:00");
    expect(formatTime(65)).toBe("00:01:05");
    expect(formatTime(3661)).toBe("01:01:01");
  });

  it("ignora los decimales de los segundos", () => {
    expect(formatTime(59.9)).toBe("00:00:59");
  });
});

describe("capitalize", () => {
  it("pone en mayúscula la primera letra", () => {
    expect(capitalize("hola")).toBe("Hola");
  });

  it("no altera un string ya capitalizado", () => {
    expect(capitalize("Hola")).toBe("Hola");
  });

  it("devuelve string vacío para entrada vacía", () => {
    expect(capitalize("")).toBe("");
  });
});
