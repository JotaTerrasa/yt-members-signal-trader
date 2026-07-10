# Operación diaria

Runbook para operar Futures Magician en local.

## 1. Arrancar

Desarrollo:

```bash
npm run dev
```

PM2:

```bash
pm2 start npm --name yt-members-signal-trader -- run dev
pm2 save
```

Alternativa directa en Windows si PM2 no pasa bien `npm run dev`:

```powershell
pm2 start src/server.js --name yt-members-signal-trader --cwd "C:\ruta\yt-members-signal-trader"
pm2 save
```

URL local:

```text
http://localhost:5178
```

## 2. Sesiones web

La app usa Playwright con perfil persistente:

```text
.yt-profile/
```

YouTube:

1. Pulsa `Abrir sesión`.
2. Inicia sesión en Chromium.
3. Comprueba que la cuenta ve los posts de miembros.

Telegram Web:

1. Activa `Scrapear canal`.
2. Guarda la URL `https://web.telegram.org/k/#-XXXXXXXXXX` o la que corresponda.
3. Pulsa `Abrir canal`.
4. Inicia sesión en Telegram Web si hace falta.
5. Deja el canal abierto en Chromium.

La aplicación no pide ni almacena contraseñas web.

## 3. Monitor

Opciones:

- `Posts pasados`: baja historial haciendo scroll.
- `Monitor continuo`: revisa posts nuevos cada intervalo.
- `Intervalo`: frecuencia del monitor.
- `Scrolls max.`: límite de scroll para backfill.
- `Telegram Web`: lee mensajes visibles del canal configurado.
- `Recargar pestaña`: cada cuántos segundos refresca Telegram Web.

El modo live es polling. YouTube y Telegram Web no se leen como stream.

Persistencia:

- Al iniciar el monitor continuo, la app guarda la configuración live en `.data/config.json`.
- Si PM2 o Node reinician la app, el monitor live se rearma automáticamente con la última URL, intervalo y fuente de Telegram Web guardados.
- Pulsar `Parar` desactiva ese auto-resume, para que un stop manual siga siendo manual.

## 4. Telegram de alertas

Uso recomendado:

1. Crea el bot en BotFather.
2. Envía `/start` al bot.
3. Guarda el token en la UI.
4. Usa `Detectar chat`.
5. Usa `Prueba Telegram`.
6. Activa `Alertas nuevas`.

Puede avisar de:

- posts nuevos de YouTube;
- salud del monitor;
- eventos importantes;
- avisos de scraper.

## 5. Telegram Web como fuente de señales

Telegram Web tiene controles separados de las alertas del bot.

Modos:

- `Solo lectura`: guarda mensajes con señales, pero no opera.
- `Cierres/TP/SL`: permite gestión de posiciones.
- `Permitir aperturas`: permite también aperturas desde Telegram Web.

Regla de seguridad:

- En `live` o `dual`, `Cierres/TP/SL` exige confirmación `Confirmo Telegram hacia BingX real`.
- Las aperturas desde Telegram Web deben dejarse desactivadas salvo decisión consciente.

Ejemplo crítico:

```text
CERRADLO TODO
```

Se interpreta como `CLOSE_ALL` y cierra todas las posiciones abiertas en los modos activos.

## 6. BingX

Modos:

- `test`: no crea orden real; simula en `.data/paper-trades.json`.
- `demo`: envía órdenes a BingX Demo VST.
- `live`: envía órdenes reales.
- `dual`: envía a Demo VST y a live real.

Configuración importante:

- `API key` y `API secret`: se guardan localmente en `.data/config.json`.
- `Allowlist`: si está vacía permite cualquier ticker soportado por BingX.
- `Stop obligatorio`: bloquea aperturas sin SL.
- `Max posiciones`: consulta la cuenta BingX activa y bloquea nuevas aperturas si se alcanza el límite.
- `Max leverage señal`: bloquea señales con demasiado apalancamiento.
- `Edad máxima`: bloquea aperturas publicadas hace más de cinco minutos; no impide gestionar cierres, TP o SL.
- `Desvío entrada`: en mercado, bloquea únicamente el desplazamiento desfavorable superior al 0,15%; un precio mejor sí se acepta.
- `Distancia máxima SL`: bloquea stops anormalmente alejados, incluidos posibles errores tipográficos.
- `Filtro de coste`: siempre avisa si el coste es alto. En modo `block` solo rechaza cuando hay un TP explícito que no cubre la ida y vuelta estimada.
- `Devolución fees estimada`: crea un escenario comparativo; no modifica la equity real ni da por abonado el reembolso.
- `Capital mes USDT`: capital inicial mensual para futuros reales.
- `Capital mes VST`: capital inicial mensual para Demo VST.
- `% fijo por señal`: porcentaje fijo aplicado a ambos capitales.
- Criterio actual: 300 USDT/VST de capital mensual y 15% por señal, es decir 45 USDT en real y 45 VST en demo por ticker.

## 7. Aperturas

Cuando detecta una apertura:

1. Valida que BingX esté activado.
2. Valida allowlist, stop loss, distancia del stop, riesgo real de la cuenta, antigüedad, desvío y filtro de coste.
3. Consulta contrato y ticker en BingX.
4. Usa el apalancamiento exacto de la señal, salvo bloqueo por máximo.
5. Calcula cantidad según modo.
6. Envía orden.
7. Adjunta SL y TP si existen.

Tipo de orden:

- Si la línea de dirección trae precio, por ejemplo `LONG SUI 1.123`, envía `LIMIT` a ese precio.
- Si no trae precio, usa `MARKET`.
- Si `Entradas siempre a mercado` está activo, ignora el precio de entrada de la señal y envía `MARKET`.
- Incluso en mercado, el stop debe seguir siendo valido: en LONG por debajo del mercado y en SHORT por encima.
- Si el precio se ha alejado más de un 0,15% en contra, la entrada espera como máximo tres minutos a que vuelva a zona; después caduca.

## 8. Gestión de posiciones

TP:

- Cancela TP anteriores del símbolo/side.
- Crea un `TAKE_PROFIT_MARKET` nuevo con la cantidad abierta.

SL:

- Cancela SL anteriores del símbolo/side.
- Crea un `STOP_MARKET` nuevo con la cantidad abierta.

Cierres:

- `CLOSE` por símbolo cierra la posición de ese ticker.
- `CLOSE_ALL` cierra todas las posiciones abiertas.
- Cierres parciales respetan el porcentaje detectado.
- En cierres completos, la app intenta cancelar después los SL/TP protectores asociados a esa posición.
- Un cierre explícito se ejecuta inmediatamente a mercado. Si el precio difiere del publicado, la app registra una advertencia de slippage, pero no especula esperando una recuperación.

Notas:

- BingX usa IDs de orden largos; el cliente los conserva como string para evitar redondeo.
- El replay de una señal live requiere confirmación explícita.
- Las alertas de SL/órdenes huérfanas tienen una pequeña ventana de gracia tras aperturas y cierres para evitar falsos positivos mientras BingX confirma la posición y sus protectoras.
- YouTube y Telegram se procesan en una cola única para impedir carreras entre dos fuentes que detecten la misma gestión casi a la vez.

## 9. Reejecutar una señal fallida

Última publicación con señales:

```bash
curl -X POST http://localhost:5178/api/bingx/replay-latest-signal \
  -H "content-type: application/json" \
  --data "{}"
```

Publicación concreta:

```bash
curl -X POST http://localhost:5178/api/bingx/replay-latest-signal \
  -H "content-type: application/json" \
  --data "{\"postId\":\"ID_O_URL_DEL_POST\"}"
```

En `live` o `dual`:

```json
{"postId":"ID_O_URL_DEL_POST","confirm":"REPLAY_LIVE"}
```

Úsalo con cuidado. Un replay puede duplicar una apertura si la posición ya existe.

## 10. Checklist nocturno

Antes de irte:

1. `GET /api/health` devuelve `ok`.
2. PM2 está `online`.
3. YouTube devuelve posts visibles.
4. Telegram Web está abierto si dependes de cierres por escrito.
5. Cada posición real tiene SL.
6. Cada posición con TP esperado tiene TP.
7. No hay duplicados de TP/SL por símbolo.
8. SUI/BTC/ETH/SOL coinciden con lo que esperas en BingX.
9. No hay errores recientes en logs.

Comandos:

```bash
curl http://localhost:5178/api/health
pm2 status yt-members-signal-trader
```

## 11. PnL y portfolio

Fuentes:

- paper local;
- ingresos de BingX;
- hoja de referencia si hay URL valida.

Lectura rápida:

- En Demo VST y live real, el resumen compara la equity actual contra el capital inicial configurado del mes.
- El ROI mensual sigue usando la base mensual; la línea `Equity vs inicial` ayuda a distinguir balance/equity de PnL realizado.

Endpoint:

```text
GET /api/portfolio
```

La URL del portfolio se actualiza automáticamente cuando aparece un post de miembros con enlace `4tfs.short.gy`, `short.gy` o Google Sheets.

## 12. Uso desde móvil

En la misma red local puedes abrir el host LAN del ordenador.

Fuera de la red, usa Cloudflare Tunnel solo temporalmente:

```bash
cloudflared tunnel --url http://localhost:5178
```

No compartas esa URL: la UI permite operar.

## 13. Problemas comunes

`YouTube no muestra posts visibles`

- Abre sesión otra vez.
- Comprueba que la cuenta tenga acceso al canal.
- Espera una pasada: a veces una lectura devuelve 0 y la siguiente recupera.

`No llega Telegram`

- Envía `/start` al bot.
- Usa detectar chat.
- Comprueba que el token no haya sido rotado.

`Telegram Web no lee mensajes`

- Comprueba que Chromium esté logueado.
- Abre el canal desde la UI.
- Revisa `maxMessages` y `refreshSeconds`.

`BingX bloquea una señal`

- Revisa allowlist.
- Revisa stop loss.
- Revisa apalancamiento máximo.
- Revisa el filtro de coste, su modo y el break-even máximo de margen.
- Revisa capital disponible.
- Revisa confirmación live.

`No se puede cancelar una orden`

- Revisa que el ID sea string. Los IDs de BingX superan la precisión segura de JavaScript.
