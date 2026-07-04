# Futures Magician

Futures Magician es una aplicación local para monitorizar publicaciones de miembros de YouTube, leer mensajes de Telegram Web, emitir alertas por Telegram y gestionar señales de futuros en BingX con varios modos de seguridad.

La aplicación está pensada para ejecutarse en tu propia máquina. Las sesiones web viven en un perfil Chromium persistente y los secretos se guardan en `.data/config.json`, que está ignorado por Git.

## Índice

- [Qué hace](#qué-hace)
- [Arquitectura](#arquitectura)
- [Modos de BingX](#modos-de-bingx)
- [Requisitos](#requisitos)
- [Instalación rápida](#instalación-rápida)
- [Paquetización portable](#paquetización-portable)
- [Arranque con PM2](#arranque-con-pm2)
- [Configuración inicial](#configuración-inicial)
- [Operación diaria](#operación-diaria)
- [Seguridad y límites](#seguridad-y-límites)
- [Paneles de la UI](#paneles-de-la-ui)
- [Informes, backups y auditoría](#informes-backups-y-auditoría)
- [Endpoints útiles](#endpoints-útiles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Datos locales](#datos-locales)
- [Guía para Codex](#guía-para-codex)
- [Troubleshooting](#troubleshooting)
- [Documentación ampliada](#documentación-ampliada)

## Qué hace

- Rastrea posts de miembros de YouTube con Playwright.
- Puede leer un canal de Telegram Web para detectar mensajes de gestión antes de que aparezcan en YouTube.
- Detecta señales de futuros: aperturas, cierres, cierre total, take profits, modificaciones de stop loss y stop a break even.
- Permite alertas por Telegram para posts, eventos críticos y salud del monitor.
- Opera contra BingX en `test`, Demo VST, live real o modo mixto, según configuración.
- Requiere stop loss si se activa esa protección.
- Mantiene anti-duplicados para evitar repetir señales ya procesadas.
- Reconcilia lo que la app cree que existe con lo que BingX devuelve.
- Muestra PnL real, hoja de Google de referencia, ROI mensual, historial auditable, línea de vida de señales e incidencias.
- Destaca equity frente al capital inicial y muestra la cola de cierres protegidos cuando un cierre espera una zona válida.
- Genera informes de estudio estratégico para aprender patrones de la operativa.
- Genera backups redactados sin credenciales.

## Arquitectura

```mermaid
flowchart LR
  operator["Operador local"] --> ui["UI local<br/>public/index.html<br/>public/app.js"]
  ui <--> api["Node HTTP API + SSE<br/>src/server.js"]
  api --> config[".data/config.json<br/>configuración y secretos locales"]
  api --> stores[".data/*.json<br/>posts, eventos, trades, backups"]
  api --> pm2["PM2 / npm run dev<br/>proceso en segundo plano"]

  subgraph sources["Fuentes de señales"]
    youtube["YouTube members posts"] --> scraper["Playwright Chromium<br/>src/youtubeScraper.js"]
    telegramWeb["Telegram Web channel"] --> scraper
  end

  scraper --> parser["Parser de señales<br/>src/futuresSignalParser.js"]
  parser --> trader["Motor de futuros<br/>src/futuresTrader.js"]
  trader --> risk["Validaciones<br/>SL obligatorio, anti-duplicados,<br/>límites, antigüedad y modo real"]
  risk --> bingxClient["Cliente BingX REST<br/>src/bingxClient.js"]
  bingxClient <--> bingx["BingX Futures"]

  api --> priceWs["Precios WebSocket<br/>src/bingxPriceWebSocket.js"]
  priceWs <--> bingx
  api --> reconcile["Reconciliación real<br/>posiciones, SL/TP y órdenes huérfanas"]
  reconcile <--> bingx

  api --> notifier["Alertas Telegram<br/>src/telegramNotifier.js"]
  notifier --> telegramBot["bot de Telegram"]

  api --> sheet["Google Sheet / referencia<br/>src/referenceLedger.js"]
  api --> study["Estudio estratégico<br/>scripts/strategyStudy.js"]
  study --> reports["docs/strategy-reports/"]
  api --> backup["Backup redactado<br/>.data/backups/"]
```

Flujo principal:

1. La UI configura fuentes, Telegram, BingX, límites y modo de ejecución a través de la API local.
2. Playwright mantiene sesiones persistentes en `.yt-profile/` y lee YouTube/Telegram Web.
3. El parser convierte texto libre en eventos operables: apertura, cierre, TP, SL, break even o cierre total.
4. El motor de futuros valida cada señal antes de enviarla: stop loss, duplicados, límites, antigüedad, modo y bloqueo local.
5. BingX ejecuta o reconcilia según el modo activo; la app compara periódicamente estado local contra estado real.
6. El bot de Telegram avisa de señales, ejecuciones, errores, descuadres, salud del monitor y acciones críticas.
7. Los almacenes locales, backups redactados e informes permiten auditar lo ocurrido sin subir secretos al repo.

## Modos de BingX

| Modo | Descripción | Uso recomendado |
|---|---|---|
| `test` | Simulación local/paper. No envía órdenes reales. | Primeras pruebas y validación de parser. |
| `demo` | Opera en BingX Demo VST. | Ensayo con entorno exchange sin dinero real. |
| `live` | Opera en cuenta real USDT. | Solo con API validada, live confirmado y riesgo revisado. |
| `dual` | Ejecuta Demo VST y live real en paralelo. | Comparar ejecución demo/real. |

La pestaña de futuros reales muestra solo USDT y estado de la cuenta real.

## Requisitos

- Node.js 20 o superior.
- npm.
- Playwright Chromium.
- Cuenta de YouTube con acceso al canal que se quiera monitorizar.
- Opcional: bot de Telegram para alertas.
- Opcional: API key y secret de BingX.
- Opcional: PM2 para dejar la app en segundo plano.

## Instalación rápida

```bash
git clone https://github.com/JotaTerrasa/yt-members-signal-trader.git
cd yt-members-signal-trader
npm install
npm run install:browsers
npm run dev
```

Abre la app:

```text
http://localhost:5178
```

Comprueba salud:

```bash
curl http://localhost:5178/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "health": {
    "level": "ok"
  }
}
```

## Paquetización portable

El repositorio incluye tres formas de dejar la app funcionando:

| Modo | Comando | Cuándo usarlo |
|---|---|---|
| Local | `npm run start` | Desarrollo, uso en escritorio e inicio de sesión visual en Chromium. |
| PM2 | `pm2 start ecosystem.config.cjs` | Mantenerla viva en la misma máquina tras reinicios. |
| Docker | `npm run docker:up` | Ejecutarla de forma reproducible en servidores o mini-PC. |

Comprobación portable:

```bash
npm run package:check
```

Docker:

```bash
cp .env.example .env
npm run docker:up
```

Los datos persistentes siguen fuera de Git:

- `.data/`
- `.yt-profile/`
- `docs/strategy-reports/`

Guía completa: [docs/PACKAGING.md](docs/PACKAGING.md).

## Arranque con PM2

Instala PM2 si no lo tienes:

```bash
npm install -g pm2
```

Arranca la app:

```bash
pm2 start npm --name yt-members-signal-trader -- run dev
pm2 save
pm2 status yt-members-signal-trader
```

En Windows, si PM2 interpreta mal los argumentos de `npm`, arranca el servidor directamente:

```powershell
pm2 start src/server.js --name yt-members-signal-trader --cwd "C:\ruta\yt-members-signal-trader"
pm2 save
```

Ver logs:

```bash
pm2 logs yt-members-signal-trader
```

Reiniciar:

```bash
pm2 restart yt-members-signal-trader --update-env
```

El monitor puede auto-resumir tras reinicio si se guardo con `autoResume` activo desde la UI.

## Configuración inicial

### 1. YouTube

1. Pega la URL de la pestaña de publicaciones.
2. Pulsa `Abrir sesión`.
3. Inicia sesión en Chromium.
4. Activa `Monitor continuo`.
5. Usa un intervalo razonable, por ejemplo `30 s`.
6. Pulsa `Iniciar`.

### 2. Telegram Web como fuente

1. Activa `Scrapear canal`.
2. Pega la URL de Telegram Web.
3. Pulsa `Abrir canal`.
4. Inicia sesión si Chromium lo pide.
5. Deja activo `Cierres/TP/SL` si quieres usar Telegram para gestión.
6. Mantener `Permitir aperturas` desactivado es lo más conservador.
7. Si el modo BingX es live, marca la confirmación explícita.

### 3. bot de Telegram para alertas

1. Crea un bot con BotFather.
2. Pega el token en `Bot token`.
3. Detecta o introduce el `Chat ID`.
4. Pulsa `Probar`.
5. Activa alertas de salud.

No escribas tokens en README, issues, commits ni capturas.

### 4. BingX

1. Activa `Auto-operar señales` solo cuando estés listo.
2. Elige modo: `test`, `demo`, `live` o `dual`.
3. Pega API key y API secret.
4. Configura capital mensual, porcentaje fijo por señal, margen, apalancamiento máximo y límites.
5. Activa `Exigir stop loss`.
6. Si vas a live, revisa el checklist `Preparado para live`.
7. Arma live solo desde la UI y con confirmación consciente.

## Operación diaria

Antes de dejar la app funcionando:

- `/api/health` debe devolver `ok`.
- PM2 debe estar `online`.
- En la UI, `Monitor live activo` debe estar verde.
- `API BingX validada` debe estar verde si usas BingX.
- `Stop loss obligatorio` debe estar verde.
- `Seguro real BingX` debe indicar que no faltan SL/TP críticos.
- `Watchdog Telegram Web` debe indicar lectura reciente si Telegram es fuente de gestión.
- `Guardia nocturna` debe estar estable.
- `Incidencias 24h` no debe mostrar errores críticos sin revisar.
- `Backup auto` debe tener una ejecución reciente o programada.

Durante la sesión:

- Revisa `Línea de vida real` para ver cada señal: recibida, parseada, validada, enviada, aceptada y cerrada.
- Revisa `Historial de señales` para auditar la señal original, orden enviada, respuesta de BingX, PnL y motivo.
- Revisa `Rendimiento` para comparar futuros reales y Google Sheet.
- Revisa `Cierres protegidos` si un cierre queda retenido por slippage o neto negativo; no abras nuevas posiciones para probarlo.
- Revisa `Estudio estratégico` para conclusiones estadísticas, no para ejecutar decisiones autónomas todavía.

## Seguridad y límites

La app puede enviar órdenes reales si la config lo permite. Trata el panel local como una consola de producción.

Reglas recomendadas:

- No actives live sin haber probado en `test` y `demo`.
- No des permisos de retirada a las API keys.
- Usa IP whitelist si BingX lo permite.
- Mantener stop loss obligatorio.
- Configurar límite de pérdida diaria.
- Configurar límite de pérdida mensual.
- Configurar máximo de órdenes por dia.
- No expongas `localhost:5178` a internet sin autenticación.
- No subas `.data/config.json`.
- No borres `.yt-profile/` si quieres conservar sesiones de YouTube/Telegram Web.

Botones de emergencia disponibles:

- `Pausar entradas`.
- `Solo gestión`.
- `Cancelar pendientes`.
- `Cerrar todo real`.

Los botones destructivos piden confirmación textual.

## Paneles de la UI

### Posts

Muestra posts guardados, mensajes detectados, enlaces y texto scrapeado.

### Eventos

Muestra logs internos: scraping, Telegram, BingX, health, backups e incidencias.

### PnL

Incluye:

- Futuros reales en USDT.
- hoja de Google de referencia.
- ROI mensual.
- Equity frente al capital inicial en Demo VST y live real.
- Simulador de capital inicial para Google Sheet.
- Cierres protegidos pendientes, con precio de señal, mercado, slippage, límite, próximo intento y caducidad.
- Guardia nocturna.
- Incidencias 24h.
- Preparado para live.
- Salud del monitor.
- Watchdog Telegram Web.
- Riesgo operativo local.
- Seguro real BingX.
- Emergencia real.
- Posiciones abiertas.
- Estudio estratégico.
- Línea de vida real.
- Historial auditable.
- Rendimiento detallado.

## Informes, backups y auditoría

### Estudio estratégico

Ejecutar manualmente:

```bash
npm run study:strategy
```

Genera:

```text
.data/strategy-study/strategy-study.json
.data/strategy-study/strategy-report.md
docs/strategy-reports/latest.md
docs/strategy-reports/strategy-study-*.md
```

La UI lee el último informe desde:

```text
/api/strategy-study/latest
```

### Backup redactado

Endpoint manual:

```text
/api/backup/redacted
```

Backups automaticos:

```text
.data/backups/latest-redacted.json
.data/backups/futures-magician-backup-YYYY-MM-DD.json
```

El backup redactado omite:

- API keys.
- API secrets.
- Bot token.
- Chat ID.
- Previews de secretos.

### Auditoría

Endpoints:

```text
/api/audit
/api/trade-events
/api/trades.csv
/api/export.json
/api/export.csv
```

## Endpoints útiles

| Endpoint | Descripción |
|---|---|
| `GET /api/health` | Salud del monitor. |
| `GET /api/state` | Estado completo de app y monitor. |
| `GET /api/audit` | Snapshot auditable. |
| `GET /api/operational-status` | Guardia, incidencias, backup y cooldown PnL. |
| `GET /api/bingx/positions` | Reconciliación de posiciones. |
| `GET /api/bingx/pnl-sources` | Fuentes de rendimiento. |
| `GET /api/historical-pnl` | Histórico local/Google Sheet. |
| `GET /api/strategy-study/latest` | Último estudio estratégico. |
| `GET /api/backup/redacted` | Backup seguro descargable. |

## Estructura del proyecto

```text
public/
  index.html             UI local
  app.js                 Estado frontend, paneles, PnL, auditoría
  styles.css             Estilos

src/
  server.js              API HTTP, SSE, salud, PM2 runtime
  youtubeScraper.js      Playwright, YouTube y Telegram Web
  futuresSignalParser.js Parser de señales
  futuresTrader.js       Test/demo/live/dual y gestión
  bingxClient.js         Cliente REST BingX
  bingxPriceWebSocket.js WebSocket de precios
  referenceLedger.js     hoja de Google de referencia
  portfolioDetector.js   Detección de portfolio
  *Store.js              Persistencia local

scripts/
  strategyStudy.js       Informe estratégico

docs/
  ARCHITECTURE.md
  DEPLOYMENT.md
  OPERATIONS.md
  SECURITY.md
  SIGNALS.md
  STRATEGY_STUDY.md
  strategy-reports/
```

## Datos locales

Ignorados por Git:

```text
.data/
.yt-profile/
node_modules/
tmp/
.env
.env.*
```

Contenido importante:

```text
.data/config.json             Configuración local con secretos
.data/posts.json              Posts/mensajes guardados
.data/trade-events.json       Eventos de trading
.data/paper-trades.json       Simulación local
.data/backups/                Backups redacted
.yt-profile/                  Sesiones Chromium
```

No borres `.yt-profile/` salvo que quieras reiniciar sesiones web.

## Guía para Codex

El repositorio incluye [AGENTS.md](AGENTS.md), que es la guía operativa para Codex y otros agentes de código.

Resume:

- límites de seguridad para no tocar trading live sin confirmación;
- archivos que nunca deben subirse;
- comandos de validación;
- mapa de modulos;
- reglas para cambios de parser, BingX, UI y documentación;
- checklist antes de hacer commit o push.

Si trabajas con un agente, empieza por ese archivo antes de pedir cambios sobre señales, ejecución, riesgo o PM2.

## Troubleshooting

### La app no abre

```bash
pm2 status yt-members-signal-trader
pm2 logs yt-members-signal-trader
```

Si no usas PM2:

```bash
npm run dev
```

### `/api/health` no devuelve `ok`

Revisa:

- Si Chromium está logueado.
- Si YouTube devuelve posts visibles.
- Si el monitor está activo.
- Si el puerto `5178` está libre.

### Telegram Web no lee mensajes

Revisa el panel `Watchdog Telegram Web`.

Acciones:

1. Pulsa `Abrir canal`.
2. Comprueba si Telegram pide login.
3. Espera el refresh configurado o reinicia monitor.
4. Mira `Incidencias 24h`.

### BingX PnL muestra rate-limit

Es normal si se consulta demasiado el histórico. La app entra en cooldown y usa último dato/fallback hasta que BingX permita reintentar.

Revisa:

```text
Guardia nocturna -> PnL histórico
Watchdog Telegram Web -> PnL BingX
```

### Hay posiciones sin SL/TP confirmado

Revisa:

- `Seguro real BingX`.
- `Línea de vida real`.
- `Historial de señales`.
- La cuenta de BingX directamente.

### El monitor se para tras reinicio

Comprueba que auto-resume esté guardado y PM2 online:

```bash
pm2 status yt-members-signal-trader
curl http://localhost:5178/api/health
```

## Documentación ampliada

- [Despliegue](docs/DEPLOYMENT.md)
- [Operación diaria](docs/OPERATIONS.md)
- [Formato de señales](docs/SIGNALS.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Seguridad](docs/SECURITY.md)
- [Estudio estratégico](docs/STRATEGY_STUDY.md)
- [Guía para agentes Codex](AGENTS.md)

## Aviso

Este proyecto automatiza acciones de trading a partir de texto scrapeado. El parser y la ejecución pueden fallar si cambia el formato de las señales, si el exchange responde distinto, si hay latencia, rate-limit, sesión web caducada o errores humanos de configuración.

Antes de usar live real, valida en test/demo, revisa la auditoría y usa límites de riesgo.
