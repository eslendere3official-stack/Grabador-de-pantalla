import { describe, it, expect } from "vitest";
import {
  validateEmail,
  getEmailDomain,
  isDisposableDomain,
  isAllowedProvider,
} from "@/utils/email";

describe("getEmailDomain", () => {
  it("extrae el dominio en minúsculas", () => {
    expect(getEmailDomain("Persona@Gmail.com")).toBe("gmail.com");
  });

  it("devuelve cadena vacía si no es un correo", () => {
    expect(getEmailDomain("sin-arroba")).toBe("");
  });
});

describe("isAllowedProvider / isDisposableDomain", () => {
  it("reconoce proveedores permitidos", () => {
    expect(isAllowedProvider("gmail.com")).toBe(true);
    expect(isAllowedProvider("outlook.com")).toBe(true);
  });

  it("reconoce dominios desechables", () => {
    expect(isDisposableDomain("mailinator.com")).toBe(true);
    expect(isDisposableDomain("gmail.com")).toBe(false);
  });
});

describe("validateEmail", () => {
  it("acepta correos de proveedores conocidos", () => {
    expect(validateEmail("usuario@gmail.com").valid).toBe(true);
    expect(validateEmail("test@yahoo.es").valid).toBe(true);
    expect(validateEmail("me@icloud.com").valid).toBe(true);
  });

  it("rechaza formato inválido", () => {
    expect(validateEmail("noesuncorreo").valid).toBe(false);
    expect(validateEmail("falta@dominio").valid).toBe(false);
  });

  it("rechaza correos temporales", () => {
    const result = validateEmail("test@mailinator.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/temporal/i);
  });

  it("rechaza proveedores desconocidos", () => {
    const result = validateEmail("empleado@miempresa.com");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/proveedor conocido/i);
  });

  it("ignora mayúsculas y espacios", () => {
    expect(validateEmail("  Persona@GMAIL.com  ").valid).toBe(true);
  });
});
