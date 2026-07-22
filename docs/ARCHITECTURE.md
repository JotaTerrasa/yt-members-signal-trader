# Arquitectura

Futures Magician es un servidor Node.js local con frontend estático, scraping por Playwright, persistencia en JSON local y conexiones opcionales a Telegram y BingX.

## Vista de contenedores

```mermaid
flowchart TB
  user["Operador local"] --> browser["Interfaz web<br/>http://localhost:5178"]
  browser <--> server["Node HTTP API + SSE<br/>src/server.js"]

  subgraph local["Máquina local"]
    server --> static["public/index.html<br/>public/app.js<br/>public/styles.css"]
    server --> data[".data/*.json<br/>config, posts, eventos,<br/>paper, backups"]
    server --> profile[".yt-profile/<br/>sesiones Chromium"]
  end

  subgraph ingestion["Ingesta"]
    server --> scraper["YouTubePostsScraper<br/>src/youtubeScraper.js"]
    scraper <--> youtube["YouTube members posts"]
    scraper <--> telegramWeb["Telegram Web"]
    scraper --> store["PostStore<br/>src/store.js"]
  end

  subgraph trading["Trading y riesgo"]
    server --> trader["FuturesTrader<br/>src/futuresTrader.js"]
    trader --> parser["futuresSignalParser<br/>texto -> señal"]
    server --> matcher["ReplicaAuditMatcher<br/>hoja ↔ apertura ↔ cierre ↔ fees"]
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
    server --> audit["systemAudit<br/>scripts/systemAudit.js"]
    audit --> auditReports["docs/audits"]
  end

  server --> telegramBot["TelegramNotifier<br/>alertas bot"]
  telegramBot --> telegram["bot de Telegram API"]
```

## Secuencia de una señal

```mermaid
sequenceDiagram
  participant Source as YouTube / Telegram Web
  participant Scraper as youtubeScraper.js
  participant Store as PostStore
  participant Server as server.js
  participant Parser as futuresSignalParser.js
  participant Trader as futuresTrader.js
  participant Retry as executionRetryStore.js
  participant BingX as BingX REST
  participant UI as Frontend/SSE
  participant Bot as bot de Telegram

  Source->>Scraper: Publicación o mensaje visible
  Scraper->>Store: upsert post/mensaje
  Scraper->>Server: evento posts
  Server->>Parser: parsear texto
  Parser-->>Server: señales normalizadas
  Server->>Server: encolar por orden de llegada
  Server->>Trader: processPosts
  Trader->>Trader: validar modo, SL, distancia, duplicado, riesgo, antigüedad, desvío y filtro neto Demo
  Trader->>Trader: generar clientOrderId determinista por señal
  opt demo VST con reserva técnica
    Trader->>BingX: balance demo y, si falta margen libre, getVst
    BingX-->>Trader: margen VST actualizado
  end
  alt modo test
    Trader->>Store: paper/local event
  else demo/live/dual
    Trader->>BingX: order / close / TP / SL
    BingX-->>Trader: respuesta exchange
  end
  opt fallo transitorio o zona temporalmente inválida
    Trader->>Retry: persistir reintento con caducidad
    Retry-->>Trader: recuperar tras reinicio
    Trader->>BingX: reconciliar antes de reintentar
  end
  Trader-->>Server: trade event
  Server->>UI: SSE state/trade/log
  Server->>Bot: alerta si procede
```

## Modelo de datos local

```mermaid
flowchart LR
  config[".data/config.json<br/>configuración y secretos"] --> server["server.js"]
  posts[".data/posts.json<br/>posts/mensajes"] --> server
  events[".data/trade-events.json<br/>eventos compactados"] --> server
  journal[".data/trade-events.json.journal<br/>diario incremental"] --> server
  retries[".data/execution-retries.json<br/>cola persistente"] --> server
  paper[".data/paper-trades.json<br/>paper/test"] --> server
  study[".data/strategy-study/*.json/md<br/>informe runtime"] --> server
  backups[".data/backups/<br/>redactado y cifrado"] --> server
  key["~/.futures-magician/backup.key<br/>fuera del repositorio"] --> backups
  profile[".yt-profile/<br/>sesiones web"] --> scraper["youtubeScraper.js"]
```

Regla de seguridad: `.data/` y `.yt-profile/` son entorno local y no forman parte del repositorio.

## Componentes

### `src/server.js`

Orquesta:

- API HTTP.
- Server-Sent Events para la UI.
- Arranque/parada del scraper.
- Estado, logs y salud.
- bot de Telegram de alertas.
- Telegram Web como fuente de mensajes.
- BingX.
- Cola serial de señales para evitar carreras entre YouTube y Telegram Web.
- Reintentos cortos de entradas cuyo stop o precio aún no estén en zona válida.
- Recuperación de reintentos pendientes después de reiniciar el proceso.
- Reconciliación de posiciones antes de reenviar una apertura.
- Cierre inmediato a mercado con auditoría de slippage.
- Reintentos idempotentes de cierres que fallen por red o error transitorio de BingX.
- Cohorte posterior a mejoras y cobertura de paquetes de señales.
- Filtro neto de entrada Demo con modo sombra por defecto y modo bloqueo opcional.
- Auditoría del filtro neto que enlaza cada apertura evaluada con el cierre de su posición, estima el resultado tras costes y detecta umbrales no discriminantes.
- Reserva técnica Demo VST activada solo con confirmación explícita y endpoint dedicado.
- Portfolio dinámico.
- PnL histórico.

### `src/executionReliability.js`

Genera una identidad estable para cada apertura a partir de modo, publicación, símbolo, dirección, entrada y stop. El `clientOrderId` enviado a BingX es determinista, por lo que un timeout ambiguo no puede generar una segunda orden distinta al reintentarse.

También clasifica qué errores son transitorios. No reintenta errores de credenciales, límites de riesgo ni configuraciones inválidas.

### `src/executionRetryStore.js`

Mantiene la cola local de aperturas y cierres pendientes mediante reemplazo atómico. La cola no contiene secretos y conserva modo, señal, caducidad, intentos y último motivo. Al arrancar, `server.js` la recupera y reconcilia BingX antes de cualquier reenvío.

### `src/coverageRecovery.js`

Selecciona huecos recientes de cobertura que pueden recuperarse de forma segura. Solo propone aperturas Demo con motivo `no_execution_event`, dentro de la ventana temporal y con una señal parseada exacta. Los fallos ya explicados, los huecos antiguos y cualquier modo Live quedan fuera.

### `src/promotionGate.js`

Calcula una puerta informativa basada en muestra, cobertura, paquetes completos, fallos de parser, reintentos, reconciliación, SL, órdenes huérfanas y resultado neto tras costes. Nunca cambia el modo ni arma live automáticamente.

### `src/httpSecurity.js`

Centraliza cabeceras de seguridad, validación de origen, limitación de mutaciones y autenticación básica opcional. El servidor escucha en `127.0.0.1` de forma predeterminada.

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
- leer Telegram Web en un bucle independiente con `pollSeconds`;
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

Convierte texto libre en señales normalizadas:

- aperturas `LONG` / `SHORT`;
- entradas LIMIT con precio;
- cierres por símbolo;
- cierre global;
- TP;
- modificacion de SL;
- SL a break even;
- multi-ticker y mensajes mixtos.

### `src/futuresTrader.js`

Gestiona ejecución:

- valida configuración y riesgo;
- en Demo VST, puede hacer un preflight único de margen por paquete y pedir solo la diferencia necesaria de reserva técnica;
- calcula `netEntryFilter` para comparar coste/riesgo, break-even de margen, R/R y TP neto; en modo sombra solo audita y en modo bloqueo corta aperturas Demo desfavorables;
- publica `netEntryFilterAudit` en el estado para que la UI muestre muestra, operaciones marcadas, resultado neto estimado, motivo dominante y advertencias de configuración;
- consulta contrato y ticker en BingX;
- calcula cantidad;
- envía órdenes `MARKET` o `LIMIT`;
- adjunta SL/TP a aperturas;
- cancela y recrea TP/SL de gestión;
- abre/cierra paper local;
- cierra posiciones demo/live;
- soporta modo `dual`.
- consulta posiciones e ingresos de la cuenta activa para aplicar límites de riesgo reales;
- impide perseguir entradas y rechaza stops anormalmente lejanos;
- ejecuta cierres explícitos inmediatamente y conserva la desviación como telemetría.
- descuenta aportaciones técnicas VST de la equity estratégica y del ROI demo.

### `src/replicaAuditMatcher.js`

Reconstruye el ciclo operativo completo:

- empareja cada fila de la hoja con la apertura más probable del mismo activo;
- enlaza PnL, comisión de apertura, comisión de cierre y funding;
- tolera operaciones ausentes sin desplazar todas las posteriores;
- reparte un cierre de BingX entre varias entradas cuando el exchange las agregó en una posición.

### `src/operationalAudit.js`

Calcula métricas de ejecución y escenarios económicos comparables: bruto teórico, neto con entrada y salida taker y neto con entrada maker y salida taker. La devolución de comisiones solo se incorpora al resultado observado cuando aparece acreditada en los ingresos de BingX.

### `src/bingxClient.js`

Cliente REST firmado con HMAC para BingX:

- balance;
- income/PnL;
- contracts;
- ticker;
- positions;
- órdenes abiertas;
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

Conecta al WebSocket de mercado de BingX y emite precios para símbolos con posiciones paper abiertas.

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
- exposición abierta;
- cierres;
- cierre global;
- TP/SL paper;
- win rate.

### `src/referenceLedger.js`

Lee Google Sheets vía endpoint `gviz` y transforma la hoja mensual a posiciones de referencia.

También resuelve enlaces acortados de portfolio que embeben Google Sheets en iframe.

### `src/portfolioDetector.js`

Detecta posts de portfolio con enlaces nuevos y actualiza la fuente activa.

## Persistencia

```text
.data/config.json        Config local y claves
.data/posts.json         Posts/mensajes scrapeados
.data/paper-trades.json  Operaciones paper
.data/trade-events.json  Eventos compactados
.data/trade-events.json.journal Eventos nuevos pendientes de compactación
.data/execution-retries.json Cola de reintentos recuperable
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
GET /api/operational-status
GET /api/execution-packages
GET /api/promotion-gate
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
GET /api/replica-audit
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

Los eventos `state` se envían como snapshot completo de `currentState()`. La UI los usa para mantener sincronizados paneles derivados como `closeGuardRetryQueue`, PnL, monitor, Telegram Web y estado BingX aunque el origen del broadcast haya pasado un payload parcial.

## Ciclo de un item nuevo

1. Scraper extrae posts de YouTube y mensajes de Telegram Web.
2. Store inserta o actualiza.
3. Si hay URL de portfolio nueva, actualiza fuente.
4. bot de Telegram envía alerta si procede.
5. Parser busca señales.
6. Trader ejecuta según modo.
7. UI recibe eventos por SSE.
8. PnL se recalcula al actualizar.

Los cierres explícitos no se retienen por slippage ni por un beneficio estimado pequeño. `futuresTrader.js` envía el cierre a mercado y adjunta una advertencia auditable cuando el precio ejecutable ya difiere del publicado.

Para Telegram Web, el servidor filtra mensajes sin señales para reducir ruido.

## Validación

```bash
npm run lint
npm test
npm run audit:system
```

`npm test` cubre parser, guardas de entrada, cierres, riesgo, emparejamiento y persistencia. Ninguno de estos comandos envía órdenes reales a BingX.
