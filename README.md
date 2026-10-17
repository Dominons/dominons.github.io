# Dominon
Un Entorno de Trabajo Unificado — tablero SPA para productividad y análisis crypto (Notepad, Quantis Canvas, Deep‑Flow terminal y asistente AI).

[![Web](https://img.shields.io/badge/Web-GitHub%20Pages-blue)](https://dominons.github.io)
[![JS](https://img.shields.io/badge/Vanilla%20JS-ESModules-yellow?logo=javascript&logoColor=black)]
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)]
[![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)]
[![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)]
[![License: MIT](https://img.shields.io/badge/License-MIT-green)]

---

## Descripción general
Dominon es una aplicación web SPA enfocada en productividad y análisis para usuarios técnicos: combina un dashboard con widgets (TradingView), un terminal "Deep‑Flow" con métricas on‑chain/mercado, un canvas infinito llamado "Quantis" para diagramas y proyectos visuales, un bloc de notas con persistencia local y en la nube (planes) y un asistente conversacional integrado con Google AI (Gemini). Ideal para demos, prototipos y como base para un producto SaaS ligero.

Principales casos de uso:
- Monitorización y demo de métricas crypto (simuladas + fuentes públicas).
- Notas rápidas y sincronización por usuario (local / Firebase para planes Premium).
- Espacio para bocetos / planificación (Quantis canvas).
- Chat asistido por Gemini para ayuda contextual dentro de la app.
- Reproductor MP3 local para ambientación.

---

## Características principales
- Autenticación Google (Firebase Auth).
- Guardado local y en la nube (Firestore / RealtimeDB) según plan de membresía.
- Quantis: canvas infinito con herramientas de dibujo, export/import.
- Deep‑Flow: terminal/ledger con filtros y métricas de mercado.
- Bloc de notas con pestañas, import/export.
- Asistente Gemini (Google Generative Language) con encriptación local de la API key.
- Reproductor de audio local (arrastrar MP3s).
- Animaciones con GSAP; sistema de temas (claro/oscuro/paletas).

---

## Estructura del repositorio
- index.html — entrada principal SPA
- css/styles.css — estilos completos
- js/
  - 01-firebase.js — integración Firebase, Auth, persistencia y Gemini logic
  - 02-music-player.js — reproductor local
  - 03-spa-router.js — enrutado de vistas
  - 04-config-router.js — configuración y estados
  - 05-dominon.js — lógica general
  - 06-deepflow.js — lógica del terminal crypto
  - 07-quantis.js — motor del canvas
  - 08-11 ... utilidades y animaciones
- Favicon.png

---

## Tecnologías y librerías
- HTML5, CSS3, ES Modules (Vanilla JavaScript)
- Firebase: Auth, Firestore, Realtime Database, App Check
- Google Generative Language API (Gemini) — vía fetch
- GSAP (animaciones)
- Font Awesome (iconos)
- TradingView embed (iframe)
- Web Crypto API (AES‑GCM fallback XOR para cifrado local)
- LocalStorage para almacenamiento offline / sesiones de guest

---

## Demo
El proyecto está pensado para publicarse con GitHub Pages. Si el repo está configurado, la URL sería:
https://dominons.github.io
(Verifica la rama y ajustes de GitHub Pages en el repositorio.)

---

## Requisitos
- Navegador moderno con soporte ES Modules y Web Crypto (recomendado: Chrome/Edge/Firefox actualizados).
- Para pruebas con persistencia en la nube: cuenta Firebase y proyecto con Auth/Firestore/RTDB configurados.
- Para usar Gemini: API Key de Google AI Studio (Google Generative Language), guardada desde la UI de la app.

---

## Instalación y ejecución local

1. Clona el repositorio:
   git clone https://github.com/Dominons/dominons.github.io.git
   cd dominons.github.io

2. Servir localmente (opciones):
   - Python (rápido):
     python3 -m http.server 8080
     y abrir http://localhost:8080
   - Node (live-server):
     npm install -g live-server
     live-server --port=8080
   - O usa la extensión Live Server de VS Code.

> Nota: la app usa ES modules (scripts type="module") y por eso debe servirse desde HTTP(S); abrir como file:// no funcionará correctamente.

---

## Configuración (Firebase y Gemini)

1. Firebase
   - Crea un proyecto Firebase en https://console.firebase.google.com
   - Habilita Authentication / Sign-in method → Google
   - Crea Firestore (modo producción o test según tu control) y Realtime Database si vas a usar esas funciones
   - Habilita App Check y crea el proveedor reCAPTCHA/Enterprise si usas App Check
   - Copia la configuración del proyecto (apiKey, authDomain, projectId, databaseURL, storageBucket, messagingSenderId, appId, measurementId)
   - Reemplaza el objeto `firebaseConfig` en `js/01-firebase.js` por tu configuración OR (más seguro) extrae la configuración a un archivo `js/firebase-config.js` y añádelo al .gitignore/localmente inyectado por CI.

2. Google AI (Gemini)
   - Ve a Google AI Studio / Google Cloud Console y genera una API Key con acceso al modelo generativo (asegúrate de las cuotas y permisos).
   - En la UI de la app: abre el panel Gemini y guarda la API key. La app cifra la key (AES-GCM con fallback XOR) y la guarda en localStorage por usuario.
   - En entornos públicos/prod considera un proxy server para esconder la API key y aplicar límites.

3. Restricciones y seguridad
   - Aunque Firebase publica `apiKey` en el cliente (comportamiento normal), no expongas claves de App Check o reCAPTCHA Enterprise sensibles en repositorios públicos: considera variables de entorno y despliegue seguro.
   - Recomendación: restringe las API keys por dominio en la consola Google; rota claves si ya fueron expuestas.

---

## Uso rápido (flujo típico)
1. Abrir la app y click en "Iniciar sesión con Google".
2. Probar bloc de notas: crear pestañas, escribir; en planes Premium las notas se guardan en Firestore.
3. Abrir Quantis: crear proyecto/páginas, dibujar y exportar/importar JSON.
4. Deep‑Flow: revisar ledger simulado y filtros (trading iframe usa TradingView).
5. Asistente Gemini: abrir sidebar, guardar API Key y enviar prompts; respuestas aparecen en la conversación.
6. Reproductor: arrastra MP3s al área de reproducción.

---

## Buenas prácticas y recomendadas antes de desplegar en producción
- No dejar claves sensibles o App Check tokens en el repo público.
- Habilitar reglas de seguridad en Firestore/RTDB.
- Configurar límites y restricciones en la API Key de Google (origin, referer).
- Usar un proceso de build que inyecte configuración desde variables de entorno (GitHub Actions/CD).
- Añadir monitoreo de errores y métricas (Sentry, Google Analytics con privacidad respetada).

---

## Contribuir
1. Haz fork y crea una rama feature/issue: git checkout -b feature/mi-cambio
2. Abre un Pull Request con descripción clara y capturas si aplica.
3. Para cambios mayores: abre un Issue describiendo la propuesta.
4. Mantén el estilo (Vanilla JS modular) y evita introducir dependencias pesadas sin justificación.

---

## Licencia
Aún no existe un archivo `LICENSE` en el repo (ver sección de optimizaciones). Se recomienda MIT para facilitar adopción. Añade un `LICENSE` con el texto MIT si deseas permitir reuso amplio.

---

## Contacto
- Repo: https://github.com/Dominons/dominons.github.io
- Autor (información visible en interfaz): @daniFU777

---

## Recursos y referencias
- Firebase: https://firebase.google.com
- Google Generative Language API: https://developers.generativeai.google
- GSAP: https://greensock.com/gsap
- TradingView widget docs

