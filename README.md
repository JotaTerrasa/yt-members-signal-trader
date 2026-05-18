# yt-members-signal-trader

Aplicacion local para monitorizar la pestana de publicaciones de miembros de un canal de YouTube, enviar alertas por Telegram, detectar senales de futuros y ejecutarlas contra BingX en modo test, Demo VST o live real.

La app esta pensada para correr en local. La sesion de YouTube vive en un perfil Chromium persistente y las claves se guardan solo en `.data/config.json`, que esta ignorado por Git.

## Capacidades

- Scraping historico y monitor continuo de posts de miembros.
- Vista local de posts, eventos, logs, estado del monitor y exportacion JSON/CSV.
- Alertas de Telegram para posts nuevos y eventos importantes.
- Parser de senales de apertura, cierres totales/parciales y movimientos de stop a break even.
- Ejecucion contra BingX USDT-M Perpetual:
  - `test`: paper trading local.
  - `demo`: BingX Demo VST.
  - `live`: cuenta real, con bloqueo explicito antes de armar.
- Entradas a mercado para aperturas detectadas.
- Uso del apalancamiento exacto indicado por la senal, salvo bloqueo si supera el maximo permitido.
- Stop loss obligatorio si asi esta configurado.
- PnL mensual, curva de PnL, historial de senales y simulacion por cantidad.
- Deteccion automatica de nueva URL de portfolio en posts de miembros para cambiar la hoja de referencia.
- WebSocket de precios de futuros BingX para posiciones paper abiertas.

## Documentacion

- [Operacion diaria](docs/OPERATIONS.md)
- [Formato de senales](docs/SIGNALS.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Seguridad](docs/SECURITY.md)

## Requisitos

- Node.js 20 o superior.
- npm.
- Cuenta de YouTube con acceso al canal de miembros.
- Chromium instalado por Playwright.
- Opcional: bot de Telegram.
- Opcional: API key de BingX para Demo VST o live.

## Arranque rapido

```bash
npm install
npm run install:browsers
npm run dev
```

Abre:

```text
http://localhost:5178
```

Primer uso:

1. Pulsa `Abrir sesion` e inicia sesion en YouTube en la ventana Chromium.
2. Pega la URL del canal o de la pestana de posts.
3. Activa `Posts pasados`, `Monitor continuo` o ambos.
4. Pulsa `Iniciar`.

## Configuracion inicial recomendada

1. Telegram:
   - Crea un bot con BotFather.
   - Envia `/start` al bot.
   - Pega el token o usa deteccion de chat desde la UI.
   - Envia una prueba antes de activar alertas reales.

2. BingX:
   - Empieza siempre en `test` o `demo`.
   - Carga saldo VST si vas a probar contra Demo VST.
   - Mantiene `Live real` desarmado hasta validar parser, Telegram, cierres y PnL.

3. Riesgo:
   - Define limite de posiciones abiertas.
   - Mantiene stop loss obligatorio.
   - Usa allowlist de simbolos si quieres restringir pares.

## Comandos

```bash
npm run dev
npm run lint
npm run install:browsers
```

## Estructura

```text
public/                 Frontend local
src/server.js           API HTTP, SSE, orquestacion
src/youtubeScraper.js   Playwright y lectura de YouTube
src/futuresSignalParser.js
src/futuresTrader.js    Ejecucion test/demo/live y cierres
src/bingxClient.js      Cliente REST BingX
src/bingxPriceWebSocket.js
src/referenceLedger.js  Google Sheet de portfolio/PnL
src/portfolioDetector.js
src/*Store.js           Persistencia local
docs/                   Documentacion operativa
```

## Datos locales

Estos directorios no se suben a GitHub:

```text
.data/                  Configuracion, posts y operaciones locales
.yt-profile/            Perfil Chromium con sesion de YouTube
node_modules/
tmp/
```

No borres `.yt-profile/` si quieres conservar la sesion de YouTube.

## Aviso operativo

Esto automatiza decisiones de trading a partir de texto scrapeado. Antes de usar `live`, valida varios ciclos en `demo`, revisa cada evento de parser, confirma cierres y comprueba que las cantidades coinciden con tu criterio de riesgo.

No subas tokens ni claves. Si un token se expone en un chat, repositorio o captura, rotalo.
