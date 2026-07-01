# Arquitectura

Futures Magician es un servidor Node.js local con frontend estatico, scraping por Playwright, persistencia en JSON local y conexiones opcionales a Telegram y BingX.

## Vista de contenedores

```mermaid
flowchart TB
  user["Operador local"] --> browser["Browser UI<br/>http://localhost:5178"]
  browser <--> server["Node HTTP API + SSE<br/>src/server.js"]

  subgraph local["Maquina local"]
    server --> static["public/index.html<br/>public/app.js<br/>public/styles.css"]
    server --> data[".data/*.json<br/>config, posts, eventos,<br/>paper, backups"]
    server --> profile[".yt-profile/<br/>sesiones Chromium"]
  end

  subgraph ingestion["Ingestion"]
    server --> scraper["YouTubePostsScraper<br/>src/youtubeScraper.js"]
    scraper <--> youtube["YouTube members posts"]
    scraper <--> telegramWeb["Telegram Web"]
    scraper --> store["PostStore<br/>src/store.js"]
  end

  subgraph trading["Trading y riesgo"]
    server --> trader["FuturesTrader<br/>src/futuresTrader.js"]
    trader --> parser["futuresSignalParser<br/>texto -> senal"]
    trader --> bingxClient["BingXClient<br/>REST firmado"]
    trader --> paper["PaperTradeStore<br/>test/paper local"]
    server --> priceWs["BingXPriceWebSocket<br/>precios"]
  end

  bingxClient <--> bingx["BingX Futures<br/>demo VST / live USDT"]
  priceWs <--> bingx

  subgraph reference["Referencia y estudio"]
    server --> ledger["referenceLedger<br/>Google Sheet"]
    ledger <--> sheet["Google Sheets gviz"]
    server --> study["strategyStudy<br/>scripts/strategyStudy.js"]
    study --> reports["docs/strategy-reports"]
  end

  server --> telegramBot["TelegramNotifier<br/>alertas bot"]
  telegramBot --> telegram["Telegram Bot API"]
```

## Secuencia de una senal

```mermaid
sequenceDiagram
  participant Source as YouTube / Telegram Web
  participant Scraper as youtubeScraper.js
  participant Store as PostStore
  participant Server as server.js
  participant Parser as futuresSignalParser.js
  participant Trader as futuresTrader.js
  participant BingX as BingX REST
  participant UI as Frontend/SSE
  participant Bot as Telegram Bot

  Source->>Scraper: Publicacion o mensaje visible
  Scraper->>Store: upsert post/mensaje
  Scraper->>Server: evento posts
  Server->>Parser: parsear texto
  Parser-->>Server: senales normalizadas
  Server->>Trader: processPosts
  Trader->>Trader: validar modo, SL, duplicado, riesgo y antiguedad
  alt modo test
    Trader->>Store: paper/local event
  else demo/live/dual
    Trader->>BingX: order / close / TP / SL
    BingX-->>Trader: respuesta exchange
  end
  Trader-->>Server: trade event
  Server->>UI: SSE state/trade/log
  Server->>Bot: alerta si procede
```

## Modelo de datos local

```mermaid
flowchart LR
  config[".data/config.json<br/>configuracion y secretos"] --> server["server.js"]
  posts[".data/posts.json<br/>posts/mensajes"] --> server
  events[".data/trade-events.json<br/>eventos auditables"] --> server
  paper[".data/paper-trades.json<br/>paper/test"] --> server
  study[".data/strategy-study/*.json/md<br/>informe runtime"] --> server
  backups[".data/backups/*.json<br/>backup redacted"] --> server
  profile[".yt-profile/<br/>sesiones web"] --> scraper["youtubeScraper.js"]
```

Regla de seguridad: `.data/` y `.yt-profile/` son runtime local y no forman parte del repositorio.

## Componentes

### `src/server.js`

Orquesta:

- API HTTP.
- Server-Sent Events para la UI.
- Arranque/parada del scraper.
- Estado, logs y salud.
- Telegram bot de alertas.
- Telegram Web como fuente de mensajes.
- BingX.
- Portfolio dinamico.
- PnL historico.

### `src/youtubeScraper.js`

Usa Playwright con perfil persistente:

```text
.yt-profile/
```

Responsabilidades:

- abrir YouTube;
- leer posts visibles;
- abrir Telegram Web;
- leer mensajes visibles de canal;
- refrescar Telegram Web cada `refreshSeconds`;
- emitir `posts`, `status`, `progress` y `log`.

Los mensajes de Telegram Web se guardan como posts con `source: "telegram_web"`.

### `src/store.js`

Guarda posts y mensajes filtrados en:

```text
.data/posts.json
```

Hace upsert por `post.id`, mantiene `firstSeenAt`, `lastSeenAt`, `seenCount` y `source`.

### `src/futuresSignalParser.js`

Convierte texto libre en senales normalizadas:

- aperturas `LONG` / `SHORT`;
- entradas LIMIT con precio;
- cierres por simbolo;
- cierre global;
- TP;
- modificacion de SL;
- SL a break even;
- multi-ticker y mensajes mixtos.

### `src/futuresTrader.js`

Gestiona ejecucion:

- valida configuracion y riesgo;
- consulta contrato y ticker en BingX;
- calcula cantidad;
- envia ordenes `MARKET` o `LIMIT`;
- adjunta SL/TP a aperturas;
- cancela y recrea TP/SL de gestion;
- abre/cierra paper local;
- cierra posiciones demo/live;
- soporta modo `dual`.

### `src/bingxClient.js`

Cliente REST firmado con HMAC para BingX:

- balance;
- income/PnL;
- contracts;
- ticker;
- positions;
- open orders;
- margin type;
- leverage;
- place order;
- cancel order;
- close position;
- VST.

Los IDs largos de orden se parsean como string para evitar redondeo de JavaScript.

Entornos:

- `prod-live`: BingX real.
- `prod-vst`: BingX Demo VST.

### `src/bingxPriceWebSocket.js`

Conecta al WebSocket de mercado de BingX y emite precios para simbolos con posiciones paper abiertas.

Se usa para:

- marcar PnL flotante paper;
- disparar cierres paper por SL/TP.

### `src/paperTradeStore.js`

Guarda operaciones locales:

```text
.data/paper-trades.json
```

Calcula:

- PnL diario;
- PnL mensual;
- exposicion abierta;
- cierres;
- cierre global;
- TP/SL paper;
- win rate.

### `src/referenceLedger.js`

Lee Google Sheets via endpoint `gviz` y transforma la hoja mensual a posiciones de referencia.

Tambien resuelve enlaces acortados de portfolio que embeben Google Sheets en iframe.

### `src/portfolioDetector.js`

Detecta posts de portfolio con enlaces nuevos y actualiza la fuente activa.

## Persistencia

```text
.data/config.json        Config local y claves
.data/posts.json         Posts/mensajes scrapeados
.data/paper-trades.json  Operaciones paper
.yt-profile/             Sesiones Chromium/YouTube/Telegram Web
```

Nada de eso debe subirse al repositorio.

## API principal

Estado:

```text
GET /api/state
GET /api/health
GET /api/events
GET /api/audit
```

Posts:

```text
GET  /api/posts
POST /api/posts/clear
GET  /api/export.json
GET  /api/export.csv
```

Scraper:

```text
POST /api/browser/open
POST /api/browser/open-telegram
POST /api/scrape/start
POST /api/scrape/stop
```

Telegram:

```text
GET  /api/telegram
PUT  /api/telegram
POST /api/telegram/test
POST /api/telegram/detect-chat
GET  /api/telegram-source
PUT  /api/telegram-source
```

BingX:

```text
GET  /api/bingx
PUT  /api/bingx
GET  /api/bingx/open-positions
POST /api/bingx/test-connection
POST /api/bingx/vst
POST /api/bingx/probe
POST /api/bingx/replay-latest-signal
POST /api/bingx/paper/clear
GET  /api/bingx/pnl
GET  /api/bingx/pnl-sources
POST /api/bingx/parse-test
```

Portfolio/PnL:

```text
GET /api/portfolio
PUT /api/portfolio
GET /api/reference-ledger
GET /api/historical-pnl
GET /api/risk
GET /api/price-feed
```

## Eventos SSE

La UI escucha:

- `state`
- `posts`
- `log`
- `telegram`
- `telegramSource`
- `bingx`
- `portfolio`
- `trade`
- `price`

## Ciclo de un item nuevo

1. Scraper extrae posts de YouTube y mensajes de Telegram Web.
2. Store inserta o actualiza.
3. Si hay URL de portfolio nueva, actualiza fuente.
4. Telegram bot envia alerta si procede.
5. Parser busca senales.
6. Trader ejecuta segun modo.
7. UI recibe eventos por SSE.
8. PnL se recalcula al actualizar.

Para Telegram Web, el servidor filtra mensajes sin senales para reducir ruido.

## Validacion

```bash
npm run lint
```

El comando hace `node --check` sobre archivos principales. No ejecuta pruebas end-to-end ni ordenes contra BingX.
