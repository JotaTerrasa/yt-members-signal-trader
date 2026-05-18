# YouTube Member Posts Scraper

Aplicacion local para archivar y monitorizar la pestana de publicaciones de un canal de YouTube al que tu cuenta ya tiene acceso.

## Uso

```bash
npm install
npm run install:browsers
npm run dev
```

Abre `http://localhost:5178`, pulsa `Abrir sesion de YouTube` e inicia sesion en la ventana de Chromium que se abre. Despues pega la URL del canal o de la pestana de posts y pulsa `Iniciar`.

## Como funciona

- Usa Playwright con un perfil local persistente en `.yt-profile/`.
- No pide ni guarda tu contrasena en la aplicacion.
- Guarda las publicaciones en `.data/posts.json`.
- Guarda la configuracion local en `.data/config.json`.
- Exporta en JSON y CSV desde la interfaz.
- El modo "tiempo real" es polling configurable, porque YouTube no ofrece un stream publico para estos posts.
- Puede enviar alertas nuevas por Telegram usando un bot token y chat ID propios.
- Puede detectar senales de futuros y enviarlas a BingX USDT-M Perpetual en modo de prueba o modo real.
- En BingX, la allowlist vacia permite cualquier ticker que exista y este abierto por API.
- Si una senal indica apalancamiento, se usa ese valor exacto. Si supera el maximo de BingX para el contrato, se bloquea en vez de modificarlo.

Usalo solo con contenido al que tengas acceso legitimo y respetando las condiciones de la plataforma.
