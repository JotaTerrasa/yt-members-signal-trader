# Auditoría y mejora continua

Este documento describe cómo se mide y mejora el sistema sin confundir calidad de ejecución con rentabilidad garantizada.

## Línea base del 10 de julio de 2026

Ventana auditada: desde el reset mensual del 1 de julio hasta el 10 de julio.

| Métrica | Resultado observado |
|---|---:|
| Operaciones de la hoja | 103 |
| Aperturas VST | 88 |
| Cierres VST de BingX | 87 |
| Señales ejecutadas | 88 |
| Señales bloqueadas | 10 |
| Errores sin ejecución | 5 |
| PnL teórico escalado de la hoja | +272,4109 VST |
| PnL bruto de BingX | -10,5657 VST |
| Comisiones | -92,9171 VST |
| Funding | -2,0737 VST |
| Neto observado | -105,5564 VST |
| Devolución de fees acreditada por BingX | 0,0000 VST |
| Devolución de fees estimada al 22% | +20,4418 VST |
| Neto con devolución estimada | -85,1146 VST |

La devolución del 22% es un escenario. No se suma a la equity real hasta que BingX la registre como ingreso. En la línea base no aparece ningún ingreso de devolución en el histórico de la cuenta; la tarifa observada es 0,05% taker y 0,02% maker.

## Lectura desde el frontend

La pestaña `PnL` usa `/api/replica-audit` como fuente única para la comparación entre la hoja, la réplica teórica y BingX VST. En esta línea base histórica se observaron **88/103 aperturas emparejables** y **15 no ejecutadas**.

La lectura actual separa tres grupos: filas emparejadas, operaciones realmente ausentes y aperturas VST posteriores al último día disponible en la hoja. El tercer grupo queda como `Fuera de cobertura de la hoja` y no se considera una desalineación hasta que la referencia se actualice. El emparejador no permite que una apertura de días posteriores rellene un hueco antiguo. Para las cohortes, las fuentes se acotan a su ventana antes de emparejar, evitando cruces falsos con operaciones anteriores.

Cada operación ausente se cruza de forma conservadora con los intentos fallidos del mismo día, activo, dirección y precio. En el corte del 22 de julio, las **19/19 ausencias** tienen evidencia: seis stops inválidos, nueve bloqueos del filtro de costes anterior, tres rechazos por margen VST insuficiente y un reintento expirado por desviación de entrada. El panel conserva el estado, el motivo técnico y el enlace de la publicación; una coincidencia aproximada o de otro día no se acepta como explicación.

La auditoría distingue ahora el precio publicado del precio real de ejecución. Para la entrada utiliza el `avgPrice` confirmado por BingX, no la instantánea tomada antes de enviar la orden. Para la salida usa el precio informado por el exchange o lo reconstruye con el PnL realizado y la cantidad cerrada; cada fila indica la fuente utilizada. En el corte del 22 de julio se midieron **161 ejecuciones de entrada**, todas con precio confirmado por BingX, y **110 ejecuciones de salida** con una señal de cierre comparable. De ellas, 78 entradas y 51 salidas superaron el 0,15% de desviación adversa. Las medias adversas fueron del 0,1401% y del 0,1474%, respectivamente.

El panel incorpora además un puente contable que reconcilia la réplica teórica con el neto observado. En el mismo corte parte de **457,8050 VST**, resta 432,6090 VST por la diferencia de las 132 operaciones emparejadas, resta 64,6145 VST por 19 operaciones no ejecutadas, suma 39,0905 VST de 25 operaciones posteriores a la cobertura de la hoja, suma 2,5445 VST de cuatro extras, resta 67,3342 VST de cinco cierres todavía sin apertura enlazada y resta 179,7983 VST de comisiones y funding. El resultado es **-244,9160 VST**, con residual contable cero. La hoja pública se comprobó directamente: contiene 151 operaciones y termina el 15 de julio; por ello las 25 posteriores se muestran como `Posteriores sin hoja`, no como una contradicción de estrategia.

La bolsa de operaciones emparejadas también se descompone de forma exacta. Sus **393,1905 VST** teóricos pasan a **-39,4185 VST** brutos en BingX: la diferencia de entrada aporta **-188,8446 VST**, la diferencia de salida **-236,0674 VST** y cantidad, redondeos y fills residuales **-7,6970 VST**. La contabilidad publicada de la hoja coincide con el cálculo lineal escalado y no deja diferencia material. La atribución de entrada y salida es simétrica, por lo que ninguna de las dos absorbe artificialmente la interacción entre ambos precios. Este desglose usa las 132 operaciones con precios suficientes y reconcilia con residual cero.

Por activo, el gap emparejado es **-171,6944 VST en ETH**, **-161,5703 VST en SOL**, **-70,4036 VST en BTC** y **-28,9407 VST en SUI**. Esta medición es anterior a comisiones: demuestra que el principal desalineamiento histórico está en los precios de entrada y, sobre todo, de salida; los costes se añaden después como una pérdida separada.

La cadena de precios abre ahora esas diferencias en puntos observables. En las entradas, la referencia de la hoja frente a la señal aporta **+4,0190 VST**, el movimiento entre la señal y la cotización previa al envío **-83,5338 VST**, y el tramo entre esa cotización y el fill confirmado **-109,3298 VST**. En las salidas, la diferencia entre el cierre de la hoja y el objetivo conocido por la app aporta **-76,8356 VST**, el movimiento hasta la cotización previa **-15,1839 VST**, el tramo entre cotización y fill **-131,0434 VST**, y doce salidas sin toda la evidencia intermedia **-13,0045 VST**. Los ocho tramos, junto con cantidad y fills residuales, reconstruyen exactamente los **-39,4185 VST** brutos observados.

La cotización previa es una instantánea de `lastPrice` o `markPrice`, no necesariamente el mejor bid/ask ejecutable. Por ello, `cotización → fill` incluye spread, diferencia de base y ejecución del exchange; el panel no lo etiqueta como slippage puro. Esta distinción evita atribuir al scraper un coste que puede proceder del mercado o del entorno VST de BingX.

La latencia también se separa entre reacción inicial y espera por reintentos. En el corte del 22 de julio, las 161 aperturas medibles tuvieron una reacción mediana de **1,652 s** y un p95 de **4,129 s**; sin embargo, 39 esperaron un reintento y elevaron el p95 total a **95,610 s**. Los 108 cierres por señal medibles reaccionaron en una mediana de **0,462 s** y tuvieron un p95 total de **3,412 s**. Por tanto, la demora ordinaria del monitor no aparece como el cuello de botella principal; las esperas largas están concentradas y quedan identificadas como reintentos.

Los cierres por stop se comparan por signo y precio antes de considerarse una incidencia. Un stop es `alineado` cuando la hoja y BingX terminan con el mismo signo y el cierre difiere como máximo un 0,15%; un cierre con el mismo signo pero mayor diferencia se clasifica como `Stop con deslizamiento`, y solo el signo contrario queda como `Stop antes del cierre`. Cuando BingX guardó históricamente un cierre como `exchange_position_closed`, se infiere que fue un stop únicamente si no existe señal de cierre, el PnL es negativo y el precio ejecutado está en el SL o más allá. Con esta medición hay **27 de 35 stops comparables alineados**, tres con deslizamiento y cinco divergentes. Tres divergencias BTC estuvieron precedidas por cierres fallidos debido al error histórico `CLOSE_GUARD_MIN_NET_PNL is not defined`; una divergencia SOL procede del `CUERRE TOTAL` omitido del 5 de julio; y una divergencia ETH ejecutó el stop publicado en 1860 mientras la fila equivalente de la hoja terminó ganadora. Otros ocho stops observados no tienen todavía una fila comparable en la hoja y quedan fuera del denominador.

El detalle operación por operación se presenta en una tabla con desplazamiento vertical y horizontal. Los botones de navegación desplazan esa tabla sin modificar la operativa ni los datos de ejecución.

## Causas demostradas

### 1. Entradas perseguidas

La línea base original usaba la instantánea de mercado previa al envío y, por tanto, infravaloraba el deslizamiento. Al reprocesar el mes con el precio ejecutado confirmado por BingX, 145 de 161 entradas fueron adversas y 78 superaron el 0,15%. El arrastre neto estimado de entrada asciende a 162,8521 VST.

La estimación usa exposición y diferencia de precio. Sirve para medir magnitud, pero no sustituye el PnL oficial de BingX.

El desglose reconciliado frente a los precios finales de la hoja asigna **-188,8446 VST** a la diferencia de entrada en las operaciones emparejadas. Esta cifra no sustituye la métrica de slippage frente al mensaje: responde a una pregunta distinta, cuánto del gap final hoja/BingX queda explicado al cambiar el precio de entrada de la hoja por el fill de BingX.

### 2. Salidas tardías

La línea base también comparaba la señal de cierre con un precio de marca, no con el precio ejecutado. Con el cierre reconstruido a partir del PnL realizado, 51 de 110 salidas comparables superaron el 0,15% de desviación adversa. El arrastre neto estimado asciende a 171,6368 VST.

Esperar a que el precio volviera a la cifra escrita añadía una apuesta nueva que no formaba parte de la orden de cierre.

El desglose reconciliado asigna **-236,0674 VST** a la diferencia de salida. Incluye tanto el precio ejecutado al recibir un cierre como las posiciones que alcanzaron un stop antes de que la operación equivalente de la hoja registrara otro resultado. Por eso es mayor que la métrica de slippage de cierres explícitos: mide toda la divergencia final de salida en las operaciones emparejadas.

### 3. Costes

Las comisiones superaron en valor absoluto el PnL bruto. El tamaño de la cuenta no corrige este problema de ROI: al aumentar tamaño, crecen tanto el PnL como las fees.

La auditoría separa cinco operaciones cuyo PnL bruto tuvo signo contrario a la hoja de otras seis que sí coincidieron en bruto, pero acabaron negativas después de comisiones y funding. De este modo, una divergencia de mercado ya no se confunde con una ganancia absorbida por costes.

### 4. Operaciones ausentes

Las 19 aperturas ausentes se explican completamente por eventos registrados: seis stops inválidos, nueve bloqueos del filtro de costes anterior, tres rechazos por margen VST insuficiente y una desviación de entrada. No hay señales sin rastro ni ejecuciones duplicadas en la ventana auditada.

Nueve bloqueos procedían del filtro anterior, que rechazaba indiscriminadamente todas las entradas a x25. Ese criterio no distinguía una señal con ventaja de otra sin ella.

### 5. Cierre histórico no procesado

La única publicación de cierre del mes guardada sin evento fue `CUERRE TOTAL · BTC 63170 · ETH 1790 · SOL 81.92`, detectada el 5 de julio a las 21:58 UTC. Afectó a tres posiciones que ya estaban abiertas: BTC, ETH y SOL. SOL debía cerrar con beneficio en 81,92, pero permaneció abierta hasta el stop en 80,819; esta es la causa demostrada de la cuarta divergencia de stop.

La auditoría reconstruye esta incidencia desde la publicación almacenada, el parser actual y la ausencia de eventos. Solo enlaza el cierre omitido con posiciones del mismo activo que ya estaban abiertas y que todavía no se habían cerrado en ese instante.

### 6. Posiciones agregadas

BingX puede combinar varias entradas del mismo activo en una posición. La auditoría detectó cuatro ciclos agregados, con ocho filas de la hoja implicadas. El comparador ahora reparte PnL y costes entre esas aperturas en vez de marcar falsamente una operación como abierta.

### 7. Reset con posiciones heredadas

Existen cierres posteriores al reset cuya apertura quedó fuera de la ventana. Se conservan en el neto real, pero se clasifican como cierres heredados y no se fuerzan contra una fila incorrecta de la hoja.

## Mejoras activadas

### Calidad de entrada

- Las aperturas a mercado aceptan un precio mejor.
- Si el precio se ha desplazado más de un 0,15% en contra, la entrada no se persigue.
- La entrada puede reintentarse durante un máximo de tres minutos.
- Las aperturas publicadas hace más de cinco minutos se consideran caducadas.
- Un stop a más del 5% de la entrada se bloquea como posible error tipográfico.

### Calidad de salida

- Los cierres explícitos se envían inmediatamente a mercado.
- El slippage se guarda como advertencia auditable.
- La aplicación no retiene una salida esperando que el precio vuelva a la cifra publicada.
- Si BingX o la red rechazan temporalmente un cierre, la aplicación conserva el modo de ejecución y lo reintenta de forma idempotente durante tres minutos.
- `CLOSE_ALL` vuelve a consultar las posiciones en cada intento para no cerrar dos veces una posición que ya haya desaparecido.

### Costes

- El break-even por fees sigue visible.
- Una señal sin TP no se bloquea solo por usar x25.
- En modo bloqueo, el filtro solo rechaza una operación si hay un TP explícito y ese objetivo no cubre el coste estimado.
- La auditoría presenta el bruto teórico, el neto estimado con entrada y salida taker, el escenario con entrada maker y la devolución que BingX haya acreditado realmente.

### Riesgo

- Los límites de posiciones y pérdidas consultan la cuenta BingX activa.
- Demo VST y real ya no usan el almacén paper vacío para calcular riesgo.
- Si un límite está activado y BingX no permite verificar el riesgo, la apertura falla de forma segura.

### Fiabilidad

- YouTube y Telegram se procesan en una cola única.
- Telegram Web se lee en un bucle independiente cada 5 segundos y refresca su pestaña cada 30 segundos.
- Una lectura vacía aislada de YouTube se registra como aviso transitorio; solo un monitor parado, obsoleto o sin estado verificable se clasifica como incidencia crítica.
- El histórico usa un diario incremental y compactación atómica.
- Una caída durante una escritura no obliga a reescribir ni perder el archivo completo.
- El parser, las guardas, el riesgo, los cierres, la auditoría y la persistencia tienen pruebas automáticas.
- La errata histórica `CUERRE` se reconoce como cierre y está cubierta con el mensaje exacto que se perdió el 5 de julio.
- Cada publicación con aperturas forma un paquete auditable: símbolos esperados, ejecutados, pendientes y ausentes.
- Una alerta informa cuando un paquete queda incompleto al terminar su ventana de reintento.
- La cohorte posterior a las mejoras conserva el histórico anterior, pero calcula sus métricas desde una marca temporal independiente.
- Al iniciar una cohorte, la aplicación archiva las fronteras temporales de hasta doce cohortes anteriores para poder compararlas sin reescribir eventos.
- Cada apertura usa un identificador determinista. Un reintento conserva la misma identidad en BingX y no puede convertirse en una orden nueva por cambiar la hora local.
- La cola de aperturas y cierres pendientes se guarda en `.data/execution-retries.json` y se recupera después de reiniciar.
- Antes de reintentar una apertura, la app reconcilia posiciones para resolver respuestas ambiguas sin duplicar exposición.
- Si la cobertura detecta en Demo una apertura reciente sin evento de ejecución, vuelve a validarla por la misma ruta idempotente. Las ejecuciones procedentes de otra fuente se enlazan y no se cuentan como huecos.
- Si el contenido actual de una señal difiere del valor conservado en su evento, la auditoría identifica la corrección posterior campo por campo. El fallo histórico permanece en la muestra, pero deja de aparecer como una apertura ausente sin explicación.
- La puerta de promoción exige muestra, cobertura, seguridad y PnL neto positivo; nunca arma live automáticamente.

## Cómo ejecutar la auditoría

```bash
npm run audit:system
```

Salidas:

```text
.data/audits/system-audit.json
docs/audits/latest.md
docs/audits/system-audit-*.md
```

Comprobaciones técnicas:

```bash
npm run lint
npm test
git diff --check
```

## Indicadores para el nuevo periodo

La cohorte posterior a estas mejoras debe evaluarse por separado. Los indicadores principales son:

1. Cobertura de aperturas: ejecutadas, bloqueadas y errores con causa.
2. Desviación adversa de entrada: objetivo, cero operaciones por encima del 0,15%.
3. Latencia y desviación de cierre.
4. PnL bruto, fees, funding y neto, siempre separados.
5. Resultado bruto y neto estimado bajo costes taker/maker, sin mezclar escenarios con la equity real.
6. Stops antes de cierre frente a la hoja.
7. Operaciones agregadas y reparto del PnL.
8. Diferencias por activo y por tipo de salida.
9. Paquetes completos y aperturas ausentes tras agotar reintentos.
10. Devolución de comisiones acreditada, separada de la estimación.
11. Reintentos recuperados, expirados y resueltos sin duplicado.
12. Estado de la puerta de promoción y criterio exacto que impide avanzar.

Con menos de 30 cierres posteriores al cambio, la lectura es exploratoria. Entre 30 y 99 puede orientar ajustes, pero sigue siendo frágil. A partir de 100 se pueden contrastar hipótesis, todavía con validación fuera de muestra y sin convertir correlaciones en reglas automáticas.

## Límites de la mejora

El sistema puede reducir latencia, errores, duplicados, slippage evitable y mediciones incorrectas. No puede garantizar que las señales futuras sean rentables ni reproducir un precio que ya no está disponible.

No debe construirse una estrategia autónoma a partir de la hoja hasta separar claramente:

- resultado antes y después de fees;
- precio publicado y precio ejecutable;
- stop real y cierre posterior de la hoja;
- posiciones individuales y posiciones agregadas;
- muestra de aprendizaje y muestra de validación.
