# Operacion diaria

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

1. Pulsa `Abrir sesion`.
2. Inicia sesion en Chromium.
3. Comprueba que la cuenta ve los posts de miembros.

Telegram Web:

1. Activa `Scrapear canal`.
2. Guarda la URL `https://web.telegram.org/k/#-1323595523` o la que corresponda.
3. Pulsa `Abrir canal`.
4. Inicia sesion en Telegram Web si hace falta.
5. Deja el canal abierto en Chromium.

La aplicacion no pide ni almacena contrasenas web.

## 3. Monitor

Opciones:

- `Posts pasados`: baja historial haciendo scroll.
- `Monitor continuo`: revisa posts nuevos cada intervalo.
- `Intervalo`: frecuencia del monitor.
- `Scrolls max.`: limite de scroll para backfill.
- `Telegram Web`: lee mensajes visibles del canal configurado.
- `Recargar pestana`: cada cuantos segundos refresca Telegram Web.

El modo live es polling. YouTube y Telegram Web no se leen como stream.

Persistencia:

- Al iniciar el monitor continuo, la app guarda la configuracion live en `.data/config.json`.
- Si PM2 o Node reinician la app, el monitor live se rearma automaticamente con la ultima URL, intervalo y fuente de Telegram Web guardados.
- Pulsar `Parar` desactiva ese auto-resume, para que un stop manual siga siendo manual.

## 4. Telegram de alertas

Uso recomendado:

1. Crea el bot en BotFather.
2. Envia `/start` al bot.
3. Guarda el token en la UI.
4. Usa `Detectar chat`.
5. Usa `Prueba Telegram`.
6. Activa `Alertas nuevas`.

Puede avisar de:

- posts nuevos de YouTube;
- salud del monitor;
- eventos importantes;
- avisos de scraper.

## 5. Telegram Web como fuente de senales

Telegram Web tiene controles separados de las alertas del bot.

Modos:

- `Solo lectura`: guarda mensajes con senales, pero no opera.
- `Cierres/TP/SL`: permite gestion de posiciones.
- `Permitir aperturas`: permite tambien aperturas desde Telegram Web.

Regla de seguridad:

- En `live` o `dual`, `Cierres/TP/SL` exige confirmacion `Confirmo Telegram hacia BingX real`.
- Las aperturas desde Telegram Web deben dejarse desactivadas salvo decision consciente.

Ejemplo critico:

```text
CERRADLO TODO
```

Se interpreta como `CLOSE_ALL` y cierra todas las posiciones abiertas en los modos activos.

## 6. BingX

Modos:

- `test`: no crea orden real; simula en `.data/paper-trades.json`.
- `demo`: envia ordenes a BingX Demo VST.
- `live`: envia ordenes reales.
- `dual`: envia a Demo VST y a live real.

Configuracion importante:

- `API key` y `API secret`: se guardan localmente en `.data/config.json`.
- `Allowlist`: si esta vacia permite cualquier ticker soportado por BingX.
- `Stop obligatorio`: bloquea aperturas sin SL.
- `Max posiciones`: bloquea nuevas aperturas si se alcanza el limite.
- `Max leverage senal`: bloquea senales con demasiado apalancamiento.
- `Capital base VST`: base fija usada en Demo VST.
- `Capital VST por senal %`: con 1000 VST y 15%, abre 150 VST de margen por ticker.
- `Real por orden`: se limita por `maxNotionalUSDT` o por el fijo que configures en la UI.

## 7. Aperturas

Cuando detecta una apertura:

1. Valida que BingX este activado.
2. Valida allowlist, stop loss y riesgo.
3. Consulta contrato y ticker en BingX.
4. Usa el apalancamiento exacto de la senal, salvo bloqueo por maximo.
5. Calcula cantidad segun modo.
6. Envia orden.
7. Adjunta SL y TP si existen.

Tipo de orden:

- Si la linea de direccion trae precio, por ejemplo `LONG SUI 1.123`, envia `LIMIT` a ese precio.
- Si no trae precio, usa `MARKET`.
- Si `Entradas siempre a mercado` esta activo, ignora el precio de entrada de la senal y envia `MARKET`.
- Incluso en mercado, el stop debe seguir siendo valido: en LONG por debajo del mercado y en SHORT por encima.

## 8. Gestion de posiciones

TP:

- Cancela TP anteriores del simbolo/side.
- Crea un `TAKE_PROFIT_MARKET` nuevo con la cantidad abierta.

SL:

- Cancela SL anteriores del simbolo/side.
- Crea un `STOP_MARKET` nuevo con la cantidad abierta.

Cierres:

- `CLOSE` por simbolo cierra la posicion de ese ticker.
- `CLOSE_ALL` cierra todas las posiciones abiertas.
- Cierres parciales respetan el porcentaje detectado.

Notas:

- BingX usa IDs de orden largos; el cliente los conserva como string para evitar redondeo.
- El replay de una senal live requiere confirmacion explicita.

## 9. Reejecutar una senal fallida

Ultima publicacion con senales:

```bash
curl -X POST http://localhost:5178/api/bingx/replay-latest-signal \
  -H "content-type: application/json" \
  --data "{}"
```

Publicacion concreta:

```bash
curl -X POST http://localhost:5178/api/bingx/replay-latest-signal \
  -H "content-type: application/json" \
  --data "{\"postId\":\"ID_O_URL_DEL_POST\"}"
```

En `live` o `dual`:

```json
{"postId":"ID_O_URL_DEL_POST","confirm":"REPLAY_LIVE"}
```

Usalo con cuidado. Un replay puede duplicar una apertura si la posicion ya existe.

## 10. Checklist nocturno

Antes de irte:

1. `GET /api/health` devuelve `ok`.
2. PM2 esta `online`.
3. YouTube devuelve posts visibles.
4. Telegram Web esta abierto si dependes de cierres por escrito.
5. Cada posicion real tiene SL.
6. Cada posicion con TP esperado tiene TP.
7. No hay duplicados de TP/SL por simbolo.
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

Endpoint:

```text
GET /api/portfolio
```

La URL del portfolio se actualiza automaticamente cuando aparece un post de miembros con enlace `4tfs.short.gy`, `short.gy` o Google Sheets.

## 12. Uso desde movil

En la misma red local puedes abrir el host LAN del ordenador.

Fuera de la red, usa Cloudflare Tunnel solo temporalmente:

```bash
cloudflared tunnel --url http://localhost:5178
```

No compartas esa URL: la UI permite operar.

## 13. Problemas comunes

`YouTube no muestra posts visibles`

- Abre sesion otra vez.
- Comprueba que la cuenta tenga acceso al canal.
- Espera una pasada: a veces una lectura devuelve 0 y la siguiente recupera.

`No llega Telegram`

- Envia `/start` al bot.
- Usa detectar chat.
- Comprueba que el token no haya sido rotado.

`Telegram Web no lee mensajes`

- Comprueba que Chromium este logueado.
- Abre el canal desde la UI.
- Revisa `maxMessages` y `refreshSeconds`.

`BingX bloquea una senal`

- Revisa allowlist.
- Revisa stop loss.
- Revisa apalancamiento maximo.
- Revisa capital disponible.
- Revisa confirmacion live.

`No se puede cancelar una orden`

- Revisa que el ID sea string. Los IDs de BingX superan la precision segura de JavaScript.
