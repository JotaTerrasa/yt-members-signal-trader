# Operación diaria

Runbook para operar Futures Magician en local.

## 1. Arrancar

Desarrollo:

```bash
npm run dev
```

PM2:

```bash
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

La configuración del ecosistema limita las tormentas de reinicio, introduce espera creciente y concede tiempo al servidor para vaciar sus escrituras pendientes durante el apagado.

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
- `Leer mensajes`: frecuencia de lectura del DOM de Telegram Web.
- `Recargar pestaña`: cada cuántos segundos refresca Telegram Web.

El modo live es polling. YouTube y Telegram Web no se leen como stream. La lectura de Telegram funciona en un bucle independiente del de YouTube: puede revisar los mensajes cada 5 segundos y mantener la recarga completa de la pestaña cada 30 segundos.

Autorecuperación de YouTube:

- una lectura vacía aislada solo genera un aviso agrupado;
- los avisos vacíos se limitan a uno cada 30 minutos mientras dure el incidente;
- tras tres lecturas vacías consecutivas, la app recrea la pestaña de YouTube;
- el perfil persistente y la pestaña de Telegram Web se conservan;
- Salud del monitor expone `Lecturas vacías` y `Autorrecuperaciones`.

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
- `Disparador SL VST`: usa `Último precio` (`CONTRACT_PRICE`) para los nuevos stops de Demo VST.
- `Disparador SL real`: conserva `Precio de marca` (`MARK_PRICE`) para los nuevos stops reales.
- `Max posiciones`: consulta la cuenta BingX activa y bloquea nuevas aperturas si se alcanza el límite.
- `Max leverage señal`: bloquea señales con demasiado apalancamiento.
- `Edad máxima`: bloquea aperturas publicadas hace más de cinco minutos; no impide gestionar cierres, TP o SL.
- `Desvío entrada`: en mercado, bloquea únicamente el desplazamiento desfavorable superior al 0,15%; un precio mejor sí se acepta.
- `Distancia máxima SL`: bloquea stops anormalmente alejados, incluidos posibles errores tipográficos.
- `Filtro de coste`: siempre avisa si el coste es alto. En modo `block` solo rechaza cuando hay un TP explícito que no cubre la ida y vuelta estimada.
- `Filtro neto Demo`: se aplica solo en Demo VST. Por defecto está activo en modo `shadow`; avisa si la entrada supera 18% de coste/riesgo, 3% de break-even de margen, baja de 0,9 R/R o deja un TP neto no positivo. En modo `block` esos mismos criterios bloquean la apertura Demo.
- `Auditoría del filtro neto`: el panel de fiabilidad enlaza las aperturas evaluadas con sus cierres, resta el coste de ida y vuelta estimado y señala si el umbral de break-even marca automáticamente todas las operaciones con el apalancamiento observado.
- `Devolución fees estimada`: crea un escenario comparativo; no modifica la equity real ni da por abonado el reembolso.
- `Capital mes USDT`: capital inicial mensual para futuros reales.
- `Capital mes VST`: capital inicial mensual para Demo VST.
- `% fijo por señal`: porcentaje fijo aplicado a ambos capitales.
- Criterio actual: 300 USDT/VST de capital mensual y 15% por señal, es decir 45 USDT en real y 45 VST en demo por ticker.

Cambiar cualquiera de los disparadores solo afecta a los SL que se creen o modifiquen después de guardar. La aplicación no cancela ni recrea automáticamente las protecciones ya abiertas. El take profit mantiene su configuración independiente.

### Publicaciones editadas

YouTube puede mostrar primero una señal con un error tipográfico y corregir el mismo post segundos después. En Demo VST, la aplicación compara ambas versiones y recupera únicamente la apertura cuya entrada, stop o apalancamiento hayan cambiado.

- La corrección debe seguir dentro de la edad máxima configurada para señales.
- La apertura pasa por las mismas validaciones y por el mismo antiduplicados que una señal nueva.
- Si esa posición ya fue abierta, la edición no crea otra.
- Una edición no puede añadir un ticker o una dirección nuevos a la recuperación.
- Los cambios de prosa o take profit no vuelven a abrir posiciones.
- Esta recuperación no se ejecuta en Live real.

### Reserva técnica de Demo VST

La reserva técnica evita que un paquete quede a medias por falta de margen virtual. Antes de la primera apertura de cada publicación, la app calcula el margen necesario para todas sus señales y comprueba el saldo libre una sola vez.

- Objetivo operativo actual: 500 VST de margen libre.
- Si falta margen, la app solicita únicamente la diferencia mediante la API de Demo VST.
- La recarga se comparte entre todos los tickers del paquete; no se hace una recarga independiente por ticker.
- El capital estadístico continúa siendo 300 VST y el tamaño de cada orden continúa siendo 45 VST.
- Toda recarga se registra como aportación externa. La equity estratégica, el PnL y el ROI descuentan esas aportaciones para que el rendimiento no se infle.
- La UI muestra por separado la equity estratégica, el colateral bruto y la reserva técnica acumulada.
- Esta automatización solo existe en `demo`. Nunca aporta fondos ni modifica el saldo de la cuenta real.

Activación explícita:

```bash
curl -X POST http://localhost:5178/api/bingx/vst-reserve \
  -H "content-type: application/json" \
  --data '{"confirm":"ACTIVAR_RESERVA_VST","targetVST":500}'
```

## 7. Aperturas

Cuando detecta una apertura:

1. Valida que BingX esté activado.
2. Valida allowlist, stop loss, distancia del stop, riesgo real de la cuenta, antigüedad, desvío, filtro de coste y filtro neto Demo.
3. En Demo VST, hace un único preflight de margen para el paquete completo y repone la reserva técnica si es necesario.
4. Consulta contrato y ticker en BingX.
5. Usa el apalancamiento exacto de la señal, salvo bloqueo por máximo.
6. Calcula cantidad según modo.
7. Genera un `clientOrderId` determinista para esa publicación, modo, ticker, dirección, entrada y stop.
8. Envía orden.
9. Adjunta SL y TP si existen.

Tipo de orden:

- Si la línea de dirección trae precio, por ejemplo `LONG SUI 1.123`, envía `LIMIT` a ese precio.
- Si no trae precio, usa `MARKET`.
- Si `Entradas siempre a mercado` está activo, ignora el precio de entrada de la señal y envía `MARKET`.
- Incluso en mercado, el stop debe seguir siendo válido: en LONG por debajo del mercado y en SHORT por encima.
- Si el precio se ha alejado más de un 0,15% en contra, la entrada espera como máximo tres minutos a que vuelva a zona; después caduca.
- El filtro neto Demo deja trazas en cada evento. En `shadow` no corta la ejecución; en `block` devuelve razón `net_entry_filter:*` y no envía la orden Demo.
- La recomendación del panel permanece exploratoria hasta reunir 20 operaciones marcadas cerradas. Nunca cambia el modo a `block` de forma automática.
- Los fallos transitorios de red, rate limit y precio inválido se guardan en `.data/execution-retries.json`.
- Antes de reenviar una apertura, la app reconcilia las posiciones de BingX. Si la primera petición fue aceptada aunque su respuesta se perdiera, el reintento se cancela.
- La cola se recupera después de reiniciar PM2, Node o el contenedor. Conserva su caducidad original y no convierte una señal antigua en una nueva.
- La falta de saldo real no se reintenta ni se corrige automáticamente. La reserva automática solo puede actuar en Demo VST cuando ya está habilitada.

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
- Si un cierre falla por timeout, red o error transitorio del exchange, queda en una cola idempotente durante tres minutos, con un máximo de doce intentos.
- Los errores definitivos de validación no se reintentan. El estado final queda en el historial y genera una alerta operativa.

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

- En live real, el resumen compara la equity de la cuenta contra el capital inicial configurado del mes.
- En Demo VST, el resumen utiliza la equity estratégica: equity bruta menos todas las aportaciones técnicas registradas.
- El ROI mensual sigue usando la base mensual; la línea `Equity vs inicial` ayuda a distinguir balance/equity de PnL realizado.
- La última respuesta histórica completa de BingX se guarda de forma atómica en `.data/pnl-snapshots.json`.
- Tras reiniciar, la app restaura ese snapshot antes de consultar BingX. Si una fuente responde `system busy`, rate limit o error transitorio, solo esa fuente usa el último dato bueno y el panel la marca como obsoleta con su hora de lectura.
- Un reset mensual, un cambio de credenciales o una recarga de reserva VST invalidan el snapshot; los cambios ordinarios de filtros no borran el histórico de respaldo.

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

- Espera tres pasadas para permitir la recuperación automática de la pestaña.
- Revisa `Lecturas vacías`, `Autorrecuperaciones` y la hora de la última lectura correcta.
- Comprueba que la cuenta tenga acceso al canal.
- Abre sesión otra vez solo si la recuperación automática sigue sin devolver publicaciones.

`El puerto 5178 ya está ocupado`

- El servidor no salta a otro puerto automáticamente.
- En Windows, el error de arranque muestra el PID y el nombre del proceso propietario.
- Si es una instancia anterior de la app, usa `pm2 status` y reinicia esa instancia en vez de arrancar una segunda.

`No llega Telegram`

- Envía `/start` al bot.
- Usa detectar chat.
- Comprueba que el token no haya sido rotado.

`Telegram Web no lee mensajes`

- Comprueba que Chromium esté logueado.
- Abre el canal desde la UI.
- Revisa `maxMessages`, `pollSeconds` y `refreshSeconds`.

`BingX bloquea una señal`

- Revisa allowlist.
- Revisa stop loss.
- Revisa apalancamiento máximo.
- Revisa el filtro de coste, su modo y el break-even máximo de margen.
- Revisa el filtro neto Demo: en modo `shadow` solo avisa; en modo `block` puede bloquear por coste/riesgo, break-even, R/R o TP neto no positivo.
- Revisa capital disponible.
- Revisa confirmación live.

`No se puede cancelar una orden`

- Revisa que el ID sea string. Los IDs de BingX superan la precisión segura de JavaScript.

## 14. Copias y recuperación

Backup diario de datos:

```bash
npm run backup:secure
```

Backup de datos y perfil Chromium, deteniendo PM2 durante la captura:

```powershell
npm run backup:secure:profile:maintenance
```

Verificación y restauración aislada:

```bash
node scripts/secureBackup.js verify --input ".data/backups/secure/ARCHIVO.fmbak"
node scripts/secureBackup.js restore --input ".data/backups/secure/ARCHIVO.fmbak"
```

La restauración normal usa `.data/restore-tests/`. Restaurar sobre el proyecto exige la confirmación literal `RESTORE_LIVE_DATA` y debe hacerse con PM2 detenido.

Registro reproducible de tareas en Windows:

```powershell
npm run windows:tasks
```

Horarios: datos diarios a las 03:15, perfil Chromium los domingos a las 04:00 y PM2 al iniciar sesión.

## 15. Cohorte y siguiente paquete

- `GET /api/signal-coverage` resume paquetes completos, pendientes e incompletos.
- `GET /api/execution-packages` añade la cola persistente y el estado de promoción.
- `GET /api/promotion-gate` devuelve cada criterio de forma auditable.
- `GET /api/replica-audit` incluye la cohorte posterior a las mejoras.
- `cohortComparison` contrasta la cohorte activa con la última cohorte archivada que terminó antes de ella. No compara contra un periodo solapado ni modifica las fronteras guardadas.
- Las incidencias, desviaciones, latencia, costes y resultados se presentan por cierre. Las métricas dependientes de la hoja se presentan por operación emparejada y quedan marcadas como parciales cuando la referencia no cubre al menos el 80% o 30 operaciones actuales.
- El intervalo exploratorio procede de 4.000 remuestreos deterministas del PnL neto por ciclo. Si cruza cero, el resultado correcto es `rentabilidad no demostrada`; una mejora de fiabilidad no debe traducirse manualmente en una promesa económica.
- El informe diario conserva el mismo contraste bajo `Contraste antes y después` y genera incidencias separadas para regresión de entradas, neto negativo, cobertura parcial y efecto económico inconcluso.
- El subpanel `Dónde se deterioran las entradas` separa `señal → cotización previa` de `cotización previa → fill`, y agrupa la cohorte por activo, posición dentro del paquete, ruta, latencia y franja horaria de Madrid. Una comparación necesita al menos tres aperturas en cada cohorte; con menos evidencia se marca como insuficiente.
- `openingAttemptAt` representa el inicio local del intento y `openingFillAt` la hora de la orden en el histórico firmado de BingX. El panel separa detección a primer intento, espera por reintento, inicio a fill y latencia total. La precisión temporal del exchange es de un segundo.
- `Microestructura prospectiva` utiliza `bookTicker` para registrar el mejor ask de una apertura LONG o el mejor bid de una apertura SHORT justo antes del envío. También conserva spread, antigüedad de la instantánea, RTT de la lectura REST y RTT local de la petición de orden.
- Cuando BingX aporta una marca temporal válida, el panel separa `BingX → recepción local` de `recepción local → envío`. El primer valor puede incluir desfase entre el reloj de BingX y el equipo; sirve para diagnosticar y nunca alimenta una validación operativa.
- El panel de fiabilidad mide también el reloj público REST de BingX cada cinco minutos mediante el punto medio de la petición. Presenta offset, RTT y antigüedad; una lectura superior a quince minutos aparece caducada. La consulta está fuera de la cola de trading y nunca bloquea una orden.
- Si `BingX → recepción local` aparece negativo, comprueba `w32tm /query /status`. Un estado `sin sincronizar` requiere abrir PowerShell como administrador y ejecutar `w32tm /resync`; la aplicación solo informa del desfase y nunca cambia el reloj del sistema.
- La sección `Hoja externa en vivo` usa la misma lectura `gviz` que alimenta la auditoría y la muestra como tabla local desplazable. Si Google bloquea su visor dentro de un `iframe`, la tabla sigue funcionando; `Hoja externa` abre el documento original en otra pestaña.
- Mientras la vista PnL permanece visible, la hoja y `GET /api/replica-audit` se actualizan cada cinco minutos. La carga se pausa con la pestaña oculta, nunca se solapa con una actualización manual y conserva el último dato válido ante un fallo. Los reintentos aplican una espera exponencial de hasta treinta minutos y cada petición caduca a los sesenta segundos. La auditoría puede leer el histórico firmado de Demo VST, pero ninguna de estas rutas crea, modifica o cierra órdenes en BingX.
- Los símbolos con aperturas detectadas durante los últimos 30 días permanecen suscritos, con un máximo de 24. Esta suscripción es pública y pasiva; no consulta la cuenta ni puede crear, modificar o cerrar posiciones.
- Al detectar un paquete, la aplicación fotografía de forma síncrona el bid/ask ya disponible de todos sus activos. Cada evento conserva `packageObservation.startedAt`, `size`, `slot` y `startQuote`, de modo que la auditoría mida por separado la espera secuencial y el movimiento ocurrido antes del envío de cada orden.
- La fotografía no espera a que llegue una cotización. Si el símbolo es nuevo o el dato no está fresco, se registra como no disponible y la orden sigue exactamente el mismo recorrido.
- La cobertura de bid/ask empieza con las aperturas posteriores al despliegue. Un histórico sin `entryTelemetry` queda marcado como no instrumentado; nunca se completa con el spread actual ni con una estimación retroactiva.
- El WebSocket observa simultáneamente todos los símbolos de un paquete durante diez minutos. La observación no espera a recibir una cotización y no añade llamadas REST, por lo que una caída o una instantánea caducada no bloquea ni retrasa la señal.
- `Microestructura de los cierres` registra el bid para cerrar LONG y el ask para cerrar SHORT. La evidencia se guarda por cada solicitud de cierre completo o parcial y conserva el último precio disponible, la instantánea del libro, el RTT de la orden y el tipo de solicitud.
- Un cierre no espera a que llegue `bookTicker`. Si no hay una instantánea fresca, se ejecuta igual y `closeTelemetry` conserva la falta de evidencia. Los stops quedan fuera de esta muestra porque los ejecuta BingX sin una solicitud de cierre explícita de la aplicación.
- `mixAnalysis` reconcilia el cambio de desviación media como efecto de composición más cambio dentro de cada grupo. Se calcula por activo y por posición, pero ambos resultados son alternativas correlacionadas y no deben sumarse.
- Este diagnóstico es estrictamente informativo. No bloquea activos u horarios, no cambia el umbral de entrada, no reordena reintentos y no modifica ninguna orden de apertura o cierre. Antes de atribuir el tramo `cotización → fill` al exchange, exige cobertura fresca de bid/ask y una muestra suficiente. Cualquier cambio operativo posterior requiere una hipótesis explícita y una muestra controlada nueva.
- La comparación distingue entre filas emparejables y aperturas VST posteriores al último día disponible en la hoja. Estas últimas quedan como `Fuera de cobertura de la hoja` hasta que la referencia se actualice y nunca se utilizan para rellenar huecos anteriores.
- Las filas `No ejecutada en VST` enlazan el intento fallido únicamente cuando coinciden día, activo, dirección y precio. La API expone `failure` y `missingReasonCounts`; el frontend muestra el motivo y la publicación original sin alterar la ejecución.
- Los stops se auditan como `alineado`, `con deslizamiento`, `divergente` o `sin referencia`. `/api/replica-audit` expone `stopAnalysis`; el denominador incluye solo stops con una operación comparable en la hoja. Cada divergencia conserva también las señales de cierre fallidas que ocurrieron durante la vida de la posición, de modo que un fallo previo no se atribuya erróneamente a la agregación posterior.
- El emparejamiento usa el precio publicado en la señal para conservar la identidad de la operación. La calidad de ejecución se calcula de forma independiente con el `avgPrice` confirmado por BingX. Nunca se usa la instantánea previa al envío como si fuera el precio ejecutado.
- El precio de salida procede prioritariamente de `avgPrice` en el histórico firmado de órdenes de BingX. La reconstrucción por PnL realizado, precio medio y cantidad solo actúa como fallback cuando el histórico no está disponible o no alcanza la cobertura mínima. La API expone `signalEntry`, `signalClose`, `entryPriceSource`, `closePriceSource`, `entrySlippagePercent`, `closeSlippagePercent` y `fillQuality`.
- El histórico conserva `orderId`, `positionID` y `tradeId` como cadenas. La auditoría enlaza cada orden de cierre con su registro `REALIZED_PNL`, reparte la cantidad entre aperturas de la misma posición y admite varios cierres parciales. Una cobertura inferior al 80% descarta esa reconstrucción completa y activa el fallback, sin mezclar ambas fuentes silenciosamente.
- `summary.orderHistoryEvidence` publica aperturas respaldadas, ciclos cerrados, fills exactos, órdenes de cierre, posiciones, aperturas recuperadas, cobertura de eventos locales y cierres sin enlazar. `source.orderHistory` indica disponibilidad, obsolescencia, hora de lectura y error. El frontend muestra ambas piezas junto a la cadena de precios.
- Un cierre histórico genérico se considera stop inferido solo si no existe una señal de cierre, el PnL es negativo y el precio ejecutado alcanzó el SL. La fila conserva `closeKind` y `closeKindSource`; esta inferencia afecta exclusivamente a la auditoría.
- Los resultados de signo contrario se separan en `Signo distinto de mercado` y `Ganancia absorbida por costes`. `signAnalysis` resume ambas categorías para no atribuir a la ejecución una pérdida causada exclusivamente por comisiones y funding.
- `gapBridge` reconcilia exactamente la réplica teórica con el neto BingX mediante pasos separados: diferencia en operaciones emparejadas, operaciones no ejecutadas, resultados posteriores a la cobertura, extras, cierres sin apertura enlazada, comisiones y funding. `residual` debe quedar como máximo en 0,01 VST; cualquier desviación genera una incidencia crítica en el informe. El frontend representa el puente con Plotly y señala expresamente las operaciones que todavía no tienen hoja de referencia.
- `matchedGapAttribution` descompone exclusivamente las operaciones emparejadas. Recalcula el PnL lineal con los precios de la hoja y con los fills BingX, atribuye entrada y salida mediante un reparto simétrico y deja cantidad, redondeos o ejecuciones agregadas en un residual separado. Expone el resultado total, por activo, por tipo de cierre y para las ocho operaciones con mayor gap. También debe reconciliar con un residual máximo de 0,01 VST y no modifica ninguna decisión operativa.
- `executionRouteAnalysis` separa las operaciones emparejadas por la ruta causal observada antes del cierre: cierre explícito, stop sin cierre anterior, publicación no procesada, error histórico del guard, reintento protegido u operación sin señal local enlazada. Expone resultados por ruta y por familia, impactos de entrada y salida, costes, posiciones agregadas, intentos fallidos, cierres sin evento y latencia. La suma de las rutas debe coincidir con el gap emparejado con un residual máximo de 0,01 VST.
- La familia `Incidencia histórica corregida` sirve para aislar defectos que ya no representan el comportamiento vigente. Su gap es una asociación histórica, no una estimación de beneficio que se habría recuperado. La cohorte posterior a las mejoras sigue siendo la fuente válida para evaluar el sistema actual.
- `executionPriceChain` abre ese mismo gap en `hoja → señal/objetivo → cotización previa → fill`. Las filas exponen `preOrderMarket`, `closeTarget` y `preCloseMarket`; el resumen separa referencia, movimiento previo, diferencia hasta el fill, trazas intermedias ausentes y cantidad. La suma debe reconciliar exactamente con el bruto BingX emparejado.
- `executionLatency` mide por separado la reacción desde `firstSeenAt`, la espera entre el primer intento y el intento ejecutado, y el tiempo total. Deduplica eventos de cierre compartidos por posiciones agregadas y publica mediana, p90, p95, máximo, reintentos y operaciones superiores a cinco segundos.
- Una cotización previa no equivale necesariamente al mejor bid/ask. El tramo `cotización → fill` puede contener spread, diferencia entre `lastPrice` o `markPrice` y precio de contrato, además de la ejecución del exchange. No debe presentarse como slippage puro.
- La auditoría detecta publicaciones de cierre que el parser actual reconoce pero que históricamente no generaron ningún evento. Esas publicaciones se enlazan únicamente con posiciones del mismo activo abiertas antes del mensaje; la API expone `unprocessedCloses`, `unprocessedCloseRows` y `unprocessedClosePosts` sin reejecutar señales antiguas.
- La cobertura compara la señal actual con el evento procesado. Si una entrada, un stop o el apalancamiento se corrigieron después de un bloqueo, muestra ambos valores y conserva la apertura como fallo histórico explicado.
- `Nueva cohorte` conserva las fronteras de hasta doce cohortes anteriores y mueve únicamente el punto de inicio comparativo.
- La auditoría separa réplica bruta, réplica neta estimada con órdenes de mercado, escenario con entrada maker y devolución acreditada.
- La trazabilidad enlaza publicación, identidad de ejecución, evento de cierre, posición y operación de BingX cuando esos identificadores están disponibles.
- Un hueco reciente `no_execution_event` puede recuperarse automáticamente solo en Demo y siempre por la ruta idempotente. Los fallos con causa, señales antiguas y modos Live no entran en esa recuperación.
- No se interpreta rentabilidad con menos de 30 cierres; de 30 a 99 la lectura es orientativa y a partir de 100 se contrastan hipótesis.

La puerta de promoción no activa live. Solo puede quedar como `Apta para revisión humana` cuando se cumplen simultáneamente, como mínimo:

- 50 paquetes observados;
- al menos un 99% de cobertura de aperturas;
- al menos un 99% de paquetes completos;
- cero fallos de parser y cero aperturas perdidas;
- cero reintentos pendientes;
- reconciliación de BingX vigente;
- cero posiciones sin stop y cero órdenes protectoras huérfanas;
- resultado neto positivo después de comisiones y funding.

Incluso con todos los criterios en verde, live exige una confirmación explícita independiente.
