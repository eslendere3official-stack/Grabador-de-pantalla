# SCREENREC 🎥

> **Grabador de pantalla profesional con superpoderes**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.10-purple.svg)](https://vitejs.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-9.15.0-4B32C3.svg)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-3.3.3-F7B93E.svg)](https://prettier.io/)

---

## 📌 Descripción

**SCREENREC** es una aplicación web de nivel premium diseñada para creadores de contenido, diseñadores web y desarrolladores. Permite grabar la pantalla en **alta calidad** (hasta 4K) con configuraciones avanzadas de **orientación, resolución, FPS y bitrate**, todo directamente desde el navegador sin necesidad de instalar software adicional.

### ✨ Características Principales

- **🎯 Orientación Dual**: Horizontal (16:9) para YouTube o Vertical (9:16) para Reels/TikTok.
- **📏 Resolución Escalonada**: 1080p (Full HD), 1440p (2K), 2160p (4K).
- **⚡ Tasa de Fotogramas**: 30 FPS (estándar) o 60 FPS (ultra fluido).
- **🎚️ Bitrate Ajustable**: 8 Mbps (Alta), 16 Mbps (Extrema), 30 Mbps (Sin Pérdidas).
- **🎬 Formatos de Salida**: MP4 (H.264) o WebM (VP9/VP8) con **fallback inteligente**.
- **🔊 Audio del Sistema**: Opción para incluir o excluir el audio de la pestaña.
- **🖥️ Vista Previa en Vivo**: Visualización en tiempo real de lo que se está grabando.
- **🎞️ Reproductor Integrado**: Revisa el video antes de descargarlo.
- **💾 Gestión de Archivos**: Descargar o descartar el video con nombre automático.
- **🔒 Bloqueo de Controles**: Evita cambios accidentales durante la grabación.
- **📱 Diseño Responsive**: Adaptable a móviles y escritorio.

---

## 🚀 Instalación y Uso

### Requisitos

- **Navegador moderno**: Google Chrome, Microsoft Edge o Firefox (recomendado Chrome para mejor soporte de MP4).
- **Permisos**: La aplicación requiere permiso para acceder a la pantalla y al audio del sistema.

### Instalación Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/eslendere3official-stack/Grabador-de-pantalla.git
   cd Grabador-de-pantalla
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   > La aplicación se abrirá automáticamente en `https://localhost:3000`.

4. **Build para producción**:
   ```bash
   npm run build
   ```
   > Los archivos generados estarán en la carpeta `dist/`.

5. **Desplegar**:
   - **GitHub Pages**: `npm run build` y sube la carpeta `dist/` a tu repositorio.
   - **Vercel/Netlify**: Conecta tu repositorio y despliega automáticamente.

---

## 📂 Estructura del Proyecto

```
.
├── public/                  # Archivos estáticos
│   ├── index.html           # HTML principal
│   └── favicon.svg          # Icono de la app
├── src/                      # Código fuente
│   ├── config/              # Configuración estática
│   │   ├── constants.ts     # Constantes (resoluciones, FPS, etc.)
│   │   └── defaults.ts      # Valores por defecto
│   ├── core/                # Lógica principal
│   │   ├── recorder.ts      # Grabador (MediaRecorder, Canvas)
│   │   ├── stream.ts        # Manejo de streams
│   │   └── index.ts         # Exportaciones
│   ├── ui/                  # Interfaz de usuario
│   │   ├── components/      # Componentes reutilizables
│   │   │   ├── Button.ts    # Botón personalizado
│   │   │   ├── Select.ts    # Select personalizado
│   │   │   └── Toggle.ts    # Toggle (switch)
│   │   ├── dashboard.ts     # Lógica del dashboard
│   │   └── index.ts         # Exportaciones
│   ├── utils/               # Funciones auxiliares
│   │   ├── format.ts        # Formateo de fechas, tamaños
│   │   ├── cleanup.ts       # Limpieza de recursos
│   │   └── detect.ts        # Detección de APIs
│   ├── types/               # Tipos TypeScript
│   │   └── index.ts         # Definición de tipos
│   ├── styles/              # Estilos
│   │   └── main.css         # Estilos principales
│   └── index.ts             # Punto de entrada
├── tests/                   # Pruebas
│   ├── unit/                # Tests unitarios
│   └── e2e/                 # Tests E2E
├── .eslintrc.json           # Configuración de ESLint
├── .prettierrc              # Configuración de Prettier
├── tsconfig.json            # Configuración de TypeScript
├── vite.config.ts           # Configuración de Vite
├── package.json             # Dependencias y scripts
└── README.md                # Este archivo
```

---

## 🛠️ Tecnologías Utilizadas

| Tecnología       | Versión  | Uso                          |
|------------------|----------|------------------------------|
| TypeScript       | 5.6.3    | Lenguaje principal           |
| Vite             | 5.4.10   | Bundler y servidor de desarrollo |
| ESLint           | 9.15.0   | Linting                      |
| Prettier         | 3.3.3    | Formateo de código           |
| Vitest           | 2.1.3    | Testing                      |

### APIs del Navegador

- [`navigator.mediaDevices.getDisplayMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia): Captura de pantalla.
- [`Canvas API`](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API): Procesamiento de video (recorte, escalado).
- [`MediaRecorder API`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder): Grabación de video.
- [`AudioContext API`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext): Manejo de audio.

---

## 🎨 Diseño y UX

### Paleta de Colores

| Color          | Hex       | Uso                          |
|----------------|-----------|------------------------------|
| Fondo oscuro   | `#0f172a` | Fondo principal              |
| Tarjeta        | `rgba(30, 41, 59, 0.7)` | Paneles con Glassmorphism |
| Acento         | `#6366f1` | Botones principales         |
| Peligro        | `#ef4444` | Botones de error/stop        |
| Texto principal| `#f1f5f9` | Texto principal              |
| Texto secundario| `#94a3b8` | Texto muted                  |

### Tipografía

- **Fuente**: [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts).
- **Estilo**: Moderno, limpio y legible.

### Diseño Responsive

- **Escritorio**: Layout horizontal (2 paneles).
- **Móvil**: Layout vertical (1 columna).

---

## 🧪 Testing

### Ejecutar pruebas

```bash
npm test
```

### Tipos de pruebas

1. **Unit Tests**: Funciones puras (ej: `detectBestFormat`, `generateFilename`).
2. **Integration Tests**: Flujo de grabación completo.
3. **E2E Tests**: Simulación de interacción del usuario (con Playwright o Cypress).

---

## 📜 Licencia

Este proyecto está bajo la **Licencia MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. **Forkea el repositorio**.
2. **Crea una rama** (`git checkout -b feature/nueva-funcionalidad`).
3. **Haz commit** de tus cambios (`git commit -m "Añade nueva funcionalidad"`).
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`).
5. **Abre un Pull Request**.

### Reglas de Contribución

- **Código limpio**: Sigue las reglas de ESLint y Prettier.
- **TypeScript**: Usa tipado estricto.
- **Tests**: Añade pruebas para nuevas funcionalidades.
- **Documentación**: Actualiza el README si es necesario.

---

## 📞 Soporte

Si encuentras un error o tienes una sugerencia, abre un **Issue** en el repositorio:

[🐛 Reportar Issue](https://github.com/eslendere3official-stack/Grabador-de-pantalla/issues)

---

## 🎯 Hoja de Ruta (Roadmap)

- [x] Grabación básica de pantalla.
- [x] Configuración de orientación (horizontal/vertical).
- [x] Ajuste de resolución, FPS y bitrate.
- [x] Inclusión de audio del sistema.
- [x] Vista previa en vivo.
- [x] Reproductor integrado.
- [ ] **Shortcuts de teclado** (Ctrl+Shift+R para grabar).
- [ ] **Modo "Sin interfaz"** (ocultar controles durante grabación).
- [ ] **Exportación a Google Drive/Dropbox**.
- [ ] **Subtítulos automáticos** (usando Web Speech API).
- [ ] **Filtros de video** (brillo, contraste, etc.).
- [ ] **Grabación de cámara web + pantalla** (picture-in-picture).

---

## 🏆 Agradecimientos

- A la comunidad de **MDN Web Docs** por la documentación de las APIs.
- A **Vite** por su velocidad y simplicidad.
- A **TypeScript** por hacer el código más robusto.

---

> **Hecho con ❤️ y TypeScript**
> © 2024 [eslendere3official-stack](https://github.com/eslendere3official-stack)
