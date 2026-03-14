# 🧠 QuizzLive: Manual Maestro de Conocimiento (SSoT)

Este documento es la **Fuente Única de Verdad (Single Source of Truth)** para el proyecto QuizzLive. Está diseñado para que cualquier agente de IA o desarrollador comprenda el proyecto al 100% en cuestión de segundos.

---

## 🚀 1. Visión General
**QuizzLive** es una plataforma educativa de cuestionarios en tiempo real diseñada para el aula. Combina la gamificación (estilo Kahoot) con herramientas profesionales para el profesorado (reportes, analíticas, integración IA).

### Pilares Fundamentales:
- **Gamificación Premium:** Sonidos dinámicos, rachas, medallas y modos de juego variados.
- **IA Generativa:** Creación de cuestionarios desde temas o archivos PDF subidos.
- **Analítica Pedagógica:** Centrada en el sistema educativo chileno (Escala 1.0 - 7.0).

---

## 🛠️ 2. Stack Tecnológico
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Base de Datos:** Supabase (PostgreSQL).
- **Tiempo Real:** Realtime de Supabase (Broadcast & Postgres Changes).
- **Estado Global:** Zustand (con persistencia local en el navegador).
- **Estilo:** Diseño Premium (Glassmorphism, Lucide Icons, Framer Motion).
- **Reportes:** `xlsx` para Excel y `jspdf` + `jspdf-autotable` para PDF.
- **IA/PDF:** `pdfjs-dist` para extracción de texto en el cliente.

---

### 📡 3. Arquitectura de Datos & Seguridad

#### Sistema de Guardado Atómico:
El proyecto utiliza una función PostgreSQL `save_quiz_with_questions` (llamada vía RPC) para garantizar la integridad de los datos. Esto asegura que un cuestionario y sus preguntas se guarden o fallen como una sola unidad atómica.

#### Seguridad & Auth Pro:
- **Whitelist de Registro:** El registro de nuevos profesores está restringido. La función `signUpTeacher` valida el email contra la tabla `allowed_emails` antes de permitir la creación de la cuenta.
- **Protección de API:** Implementación de Rate Limiting (10 req/min) usando `@upstash/ratelimit` para prevenir abusos en las funciones de IA.
- **RLS Hardening:** Todas las funciones de base de datos definen explícitamente el `search_path = public` para evitar ataques de mutabilidad de esquema.

---

## ⚙️ 4. Lógica de Negocio & IA

### Motores de Inteligencia Artificial (Gemini):
Ubicados en `/api/ai/generate` y `/api/ai/analyze`.
- **Generación Multimodal:** Soporta prompts específicos para 5 tipos de preguntas (incluyendo emparejamiento con formato `Term:Def` y ahorcado). Utiliza fallback automático entre modelos (`gemini-3-flash-preview`, `gemini-1.5-flash`).
- **Analista Pedagógico:** Capaz de analizar "Distractores" (opciones incorrectas más elegidas) para identificar confusiones conceptuales en los alumnos y sugerir planes de reforzamiento.

### Sistema de Calificación (CHILE):
Ubicado en `src/lib/grading.ts`. Implementa la fórmula oficial chilena:
- Escala de 1.0 a 7.0.
- Exigencia configurable (default 60%).
- Cálculo diferenciado para puntajes por debajo y por encima de la nota 4.0.

---

## 🕹️ 5. Modos de Juego & Interactividad
1.  **Classic:** Competencia estándar por puntos y velocidad.
2.  **Survival:** Los alumnos tienen vidas; el fallo implica eliminación.
3.  **Teams:** División automática en equipos con balanceo de carga.
4.  **Hangman:** Lógica de juego de palabras integrada en el flujo de sesión. Incluye renderizado de SVG nativo en React para el dibujo dinámico.
5.  **Chaos:** El modo más dinámico e interactivo (estilo Mario Kart).
    - **Economía:** Los alumnos ganan `coins` por rachas de respuestas correctas (fórmula: `10 + streak * 5`).
    - **Power-ups:** Compra de Escudos (protegen racha), Congelación (ataca al rival superior, tipo "Caparazón Rojo") y Espía (ver estadísticas de respuestas en tiempo real).
    - **Tienda:** Interfaz vertical lateral integrada en el `GameView`.
6.  **Roulette:** Motor de giro basado en `conic-gradient` y rotaciones matemáticas para selección aleatoria de alumnos o preguntas con sincronización `broadcast` en tiempo real.

---

## 📡 6. Sistema de Puntuación & Realtime (SSoT)
Para garantizar que el ranking y el mini-podio sean precisos al 100% y en tiempo real, el proyecto utiliza:
- **Tabla `public.scores`:** Actúa como un caché de agregación de puntos por participante y sesión.
- **Trigger `trigger_update_score`:** Ubicado en la tabla `answers`, este disparador detecta cada inserción de respuesta correcta y actualiza automáticamente los puntos en `scores` mediante un `INSERT ... ON CONFLICT DO UPDATE`.
- **Canales Realtime:** El componente `Leaderboard` escucha cambios en la tabla `scores` para reflejar actualizaciones instantáneas sin recargar la página.

---

## 🛡️ 6. Routing & Middleware (SSR)
Ubicado en `src/middleware.ts`. El middleware cumple dos funciones críticas en el borde (Edge):
1. **Refresco de Auth:** Utiliza `@supabase/ssr` (`createServerClient`) para renovar activamente las cookies de sesión en cada petición.
2. **Enrutamiento i18n:** Intercepta rutas para forzar el prefijo de idioma (es/en) si la ruta no pertenece a la API, el dashboard (`/teacher`), el juego (`/play`) o carpetas del sistema.

---

## 🧪 7. Calidad & UI Config
- **Testing Estratégico:** Equipado con `Playwright` para testeo end-to-end (E2E) paralelo en Chromium, Firefox y WebKit; y `Vitest` para pruebas unitarias.
- **Sistema de Diseño (Tailwind):** En `tailwind.config.ts` se extienden las familias tipográficas globales (Outfit & Inter) cargadas vía nativa de Next.js y se inyectan animaciones hiper-livianas en CSS puro (`float`, `marquee`).

---

## 📁 8. Estructura de Proyecto (Detallada)
- `/src/actions`: Server Actions para manejo de estados (Quiz, Session, Classes) con `revalidatePath`.
- `/src/hooks`: 
    - `usePlaySession`: Gestión de canales Realtime (Broadcast para Ruleta, Postgres Changes para puntajes).
    - `useDashboardData`: Orquestación de datos del profesor con optimización de carga.
- `/src/locales`: Diccionarios JSON masivos para soporte total ES/EN.

---

## 🌟 7. Reglas de Diseño QuizzLive
- Usar siempre `getTranslation` para soporte multi-idioma (ES/EN).
- Priorizar la estética "Premium": bordes redondeados (`rounded-3xl`), sombras suaves, y micro-interacciones.
- Todas las funciones de DB deben tener definido el `search_path` por seguridad.
- No duplicar políticas RLS; usar los scripts de unificación.

---
*Este manual debe ser actualizado cada vez que se implemente una funcionalidad técnica mayor.*
