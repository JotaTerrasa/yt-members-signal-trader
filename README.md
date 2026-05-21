# Futures Magician

Aplicacion local para monitorizar publicaciones de miembros de YouTube, leer mensajes de Telegram Web, avisar por Telegram y operar senales de futuros en BingX en modo `test`, Demo VST, live real o VST + live real.

El proyecto esta pensado para correr en tu maquina. La sesion de YouTube y Telegram Web vive en un perfil Chromium persistente y las claves se guardan solo en `.data/config.json`, que esta ignorado por Git.

## Que hace

- Scraping historico y monitor continuo de posts de miembros de YouTube.
- Scraping de un canal de Telegram Web para detectar cierres, TP, SL y mensajes urgentes.
- UI local en `http://localhost:5178` con estado, posts, eventos, logs, PnL y configuracion.
- Alertas por Telegram para posts nuevos y salud del monitor.
- Parser de:
  - aperturas `LONG` / `SHORT`;
  - entradas LIMIT cuando la senal trae precio;
  - cierres por simbolo;
  - `CERRADLO TODO` / cierre global;
  - TP;
  - modificacion de SL;
  - SL a break even.
- Ejecucion contra BingX USDT-M Perpetual:
  - `test`: paper trading local;
  - `demo`: BingX Demo VST;
  - `live`: cuenta real;
  - `dual`: Demo VST + live real.
- Stop loss obligatorio, limites de riesgo, allowlist de simbolos y confirmaciones explicitas para live.
- PnL mensual, curva de PnL, historial de senales y simulacion por cantidad.
- Deteccion automatica de nueva URL de portfolio en posts de miembros.
- WebSocket de precios de futuros BingX para posiciones paper abiertas.

## Documentacion

- [Despliegue](docs/DEPLOYMENT.md)
- [Operacion diaria](docs/OPERATIONS.md)
- [Formato de senales](docs/SIGNALS.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Seguridad](docs/SECURITY.md)

## Requisitos

- Node.js 20 o superior.
- npm.
- Cuenta de YouTube con acceso al canal de miembros.
- Chromium instalado por Playwright.
- Opcional: bot de Telegram para alertas.
- Opcional: API key de BingX para Demo VST o live.
- Opcional: PM2 para dejar la app en segundo plano.

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

1. Pulsa `Abrir sesion` e inicia sesion en YouTube en Chromium.
2. Si vas a leer Telegram Web, guarda la URL del canal y pulsa `Abrir canal`.
3. Configura Telegram de alertas si quieres recibir avisos.
4. Configura BingX en `test`, `demo`, `live` o `dual`.
5. Activa `Monitor continuo`, revisa el intervalo y pulsa `Iniciar`.

## Configuracion recomendada

Sin incluir secretos:

```text
YouTube URL: https://www.youtube.com/@tu-canal/posts
Telegram Web: https://web.telegram.org/k/#-1323595523
Monitor: live cada 30 segundos
BingX: dual, Demo VST + live real
VST: base 1000 VST, 15% por senal
Real: tamano fijo configurable por orden
Apalancamiento: el de cada senal, bloqueado si supera el maximo configurado
Stop loss: obligatorio
Telegram Web: gestion de posiciones por defecto; aperturas bloqueadas salvo confirmacion
```

## Comandos

```bash
npm run dev
npm run lint
npm run install:browsers
```

PM2:

```bash
pm2 start npm --name yt-members-signal-trader -- run dev
pm2 save
pm2 status yt-members-signal-trader
```

## Estructura

```text
public/                 Frontend local
src/server.js           API HTTP, SSE, salud y orquestacion
src/youtubeScraper.js   Playwright, YouTube y Telegram Web
src/futuresSignalParser.js
src/futuresTrader.js    Ejecucion test/demo/live/dual y gestion
src/bingxClient.js      Cliente REST BingX
src/bingxPriceWebSocket.js
src/referenceLedger.js  Google Sheet de portfolio/PnL
src/portfolioDetector.js
src/*Store.js           Persistencia local
docs/                   Documentacion operativa
```

## Datos locales

Estos paths no se suben a GitHub:

```text
.data/                  Configuracion, posts y operaciones locales
.yt-profile/            Perfil Chromium con sesiones de YouTube/Telegram Web
node_modules/
tmp/
.env
.env.*
```

No borres `.yt-profile/` si quieres conservar las sesiones web. No subas `.data/config.json`: puede contener token de Telegram y claves de BingX.

## Aviso operativo

Esto automatiza decisiones de trading a partir de texto scrapeado. Antes de usar `live`, valida varios ciclos en `test` y `demo`, revisa cada evento de parser, confirma cierres y comprueba que las cantidades coinciden con tu criterio de riesgo.

No ejecutes replays live sin confirmacion consciente. No expongas la UI a internet sin autenticacion. Si un token o clave se filtra, rotalo.
