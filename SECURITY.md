# SECURITY

## Reportar una vulnerabilidad
Por favor, NO abras un issue público para reportar vulnerabilidades. Reporta cualquier vulnerabilidad por mensaje directo (DM) en Discord a @DANIFU777.

## Alcance
Esta aplicación es 100% client-side: estática (HTML / CSS / JavaScript) y desplegada en GitHub Pages. No existe un backend propio en este repositorio. 

Las claves de API utilizadas por la funcionalidad de asistente (Gemini) se almacenan cifradas en el navegador de cada usuario (localStorage) usando AES‑GCM cuando está disponible; este valor nunca se guarda en el repositorio ni en servidores controlados por este proyecto.

## Lo que NO es vulnerabilidad
- Que un usuario vea su propia API key en DevTools: si alguien inicia sesión y guarda su propia API key, esa clave es privada del usuario y verla en las herramientas del navegador no se considera una vulnerabilidad del proyecto.
- Que Firebase muestre su `apiKey` en el cliente: Firebase Web expone el campo `apiKey` en el cliente por diseño; la seguridad real se implementa en las reglas de Firestore/RealtimeDB y en las configuraciones de autenticación.

## No subir secrets al repo
No comitees archivos con secretos (por ejemplo `.env`, claves privadas, tokens, o cualquier credencial). Si necesitas configuraciones privadas, introdúcelas mediante variables de entorno durante el despliegue o en un servicio seguro fuera del repositorio.
