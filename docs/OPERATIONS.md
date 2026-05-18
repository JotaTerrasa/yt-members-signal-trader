# Operacion diaria

Esta guia describe como arrancar, configurar y operar la aplicacion en local.

## 1. Arrancar la app

```bash
npm run dev
```

La URL local por defecto es:

```text
http://localhost:5178
```

Si el puerto esta ocupado, arranca con otro puerto:

```bash
PORT=5179 npm run dev
```

## 2. Sesion de YouTube

La app usa Playwright con un perfil persistente en `.yt-profile/`.

Flujo:

1. Pulsa `Abrir sesion`.
2. Inicia sesion en YouTube en Chromium.
3. Vuelve a la UI local.
4. Pega la URL del canal o posts.
5. Lanza el scraping.

La aplicacion no pide ni almacena la contrasena de YouTube. Solo reutiliza la sesion del perfil Chromium local.

## 3. Scraping

Opciones:

- `Posts pasados`: baja historial haciendo scroll.
- `Monitor continuo`: revisa posts nuevos cada intervalo configurado.
- `Intervalo`: frecuencia del monitor.
- `Scrolls max.`: limite de scroll para backfill.

El modo "tiempo real" es polling. YouTube no ofrece un stream publico de posts de miembros.

## 4. Telegram

Uso recomendado:

1. Crea el bot en BotFather.
2. Envia `/start` al bot desde tu Telegram.
3. Guarda el token en la UI.
4. Usa `Detectar chat` para obtener el chat ID.
5. Usa `Prueba Telegram`.
6. Activa `Alertas nuevas`.

Por defecto se pueden enviar:

- Posts nuevos.
- Alertas de salud del monitor.
- Cierres paper por SL/TP en modo test.

No actives `Incluir historico` salvo que quieras recibir tambien los posts ya guardados durante un backfill.

## 5. BingX

Modos:

- `Test order`: no crea orden real. Simula localmente en `.data/paper-trades.json`.
- `Demo VST`: envia ordenes a BingX Demo VST.
- `Live real`: envia ordenes reales. Requiere armar live en la UI.

Configuracion importante:

- `API key` y `API secret`: se guardan localmente en `.data/config.json`.
- `Allowlist`: si esta vacia permite cualquier ticker soportado por BingX. Si tiene valores, solo permite esos simbolos.
- `Stop obligatorio`: bloquea aperturas sin stop.
- `Max posiciones`: bloquea nuevas aperturas cuando se alcanza el limite local.
- `Max leverage senal`: bloquea senales con demasiado apalancamiento.
- `Capital VST por senal %`: en Demo VST usa este porcentaje del capital disponible como margen por senal.

## 6. Aperturas

Cuando detecta una senal de apertura:

1. Valida que BingX este activado.
2. Valida allowlist, stop loss y riesgo.
3. Consulta el contrato en BingX.
4. Usa el apalancamiento exacto de la senal.
5. Consulta el ultimo precio de mercado.
6. Envia una orden `MARKET`.
7. Adjunta stop loss y take profit si existen.

Notas:

- El precio de entrada escrito en la senal se guarda como referencia, pero la entrada real se manda a mercado.
- Si BingX dice que el contrato no permite ese apalancamiento, la orden se bloquea.
- En `demo`, el tamano sale del porcentaje de capital VST disponible.
- En `test`, la posicion se abre en paper local.

## 7. Cierres

Cuando detecta una orden de cierre:

- En `test`, cierra posiciones paper por simbolo.
- En `demo` y `live`, busca posiciones abiertas en BingX para ese simbolo.
- Si el cierre es total y BingX devuelve `positionId`, usa cierre de posicion.
- Si el cierre es parcial, envia orden market opuesta con cantidad proporcional.

Ejemplos soportados:

```text
CIERRE TOTAL

BTC 78440
ETH 2194
```

```text
CIERRE PARCIAL 50%
SOL 92.4
```

## 8. Stop a break even

El parser detecta mensajes de mover SL a BE.

Estado actual:

- En `test`, mueve el stop paper a precio de entrada.
- En `demo` y `live`, queda registrado como evento detectado. No modifica todavia el stop real en BingX.

## 9. PnL y portfolio

La app calcula PnL desde:

- Paper local.
- Ingresos de BingX si la API esta disponible.
- Hoja de referencia del portfolio si hay URL valida.

La URL del portfolio se actualiza automaticamente cuando aparece un post de miembros con texto de portfolio y un enlace `4tfs.short.gy` o Google Sheets.

Endpoint para ver la fuente activa:

```text
GET /api/portfolio
```

La hoja esperada para mayo de 2026 es:

```text
FUTUROS MAYO 2026
```

## 10. Uso desde movil

En la misma red local puedes abrir el host LAN del ordenador.

Si el movil esta en 5G o fuera de la red local, usa un tunel temporal como Cloudflare Tunnel. No publiques el tunel de forma permanente sin autenticacion, porque la UI permite operar y guardar claves.

## 11. Checklist antes de live

Antes de armar live:

1. Monitor activo y leyendo posts.
2. Telegram activo y probado.
3. API BingX validada.
4. Demo VST probado con una orden manual minima.
5. Cierre demo probado.
6. Stop loss obligatorio activado.
7. Allowlist revisada si quieres limitar pares.
8. Dry-run completado.
9. Live armado manualmente en la UI.

## 12. Problemas comunes

`YouTube no muestra posts visibles`

- Abre sesion otra vez.
- Comprueba que la cuenta tenga acceso al canal.
- Baja el intervalo si YouTube esta lento.

`No llega Telegram`

- Envia `/start` al bot.
- Usa detectar chat.
- Comprueba que el token no haya sido rotado.

`BingX bloquea una senal`

- Revisa allowlist.
- Revisa stop loss.
- Revisa apalancamiento maximo del contrato.
- Revisa capital disponible.
- Revisa que live este armado si estas en modo real.

`PnL no coincide`

- Pulsa actualizar.
- Comprueba la URL activa en `/api/portfolio`.
- Revisa que la hoja tenga el nombre esperado del mes.
- Revisa si estas mirando paper local, BingX real o Excel de referencia.
