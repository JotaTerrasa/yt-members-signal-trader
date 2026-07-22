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

## Corte reconciliado del 22 de julio de 2026

La línea base anterior se conserva como referencia histórica. Tras incorporar el histórico exacto de órdenes, el corte acumulado queda así:

| Métrica | Resultado observado |
|---|---:|
| Operaciones de la hoja | 180 |
| Aperturas VST reconstruidas | 170 |
| Órdenes de cierre ejecutadas | 165 |
| Ciclos con fill de cierre exacto | 169/169 |
| Aperturas recuperadas desde BingX | 3 |
| Cierres sin apertura enlazada | 0 |
| PnL teórico escalado de la hoja | +540,1042 VST |
| PnL bruto de BingX | -78,8946 VST |
| Comisiones | -174,9805 VST |
| Funding | -4,8178 VST |
| Neto observado | -258,6929 VST |
| Devolución acreditada por BingX | 0,0000 VST |
| Devolución estimada al 22% | +38,4957 VST |
| Neto con devolución estimada | -220,1972 VST |

La auditoría leyó 465 registros del histórico de órdenes. Esa cifra incluye estados no ejecutados y no equivale al número de operaciones cerradas. La evidencia ejecutada relevante son 165 órdenes de cierre, repartidas entre 169 ciclos cerrados pertenecientes a 160 posiciones del exchange. El puente contable y la cadena de precios tienen residual cero.

## Lectura desde el frontend

La pestaña `PnL` usa `/api/replica-audit` como fuente única para la comparación entre la hoja, la réplica teórica y BingX VST. En esta línea base histórica se observaron **88/103 aperturas emparejables** y **15 no ejecutadas**.

La lectura actual separa tres grupos: filas emparejadas, operaciones realmente ausentes y aperturas VST que todavía no tienen una referencia cerrada en la hoja. El tercer grupo queda como `Fuera de cobertura de la hoja` y no se considera una desalineación hasta que la referencia se actualice. Si la fecha más reciente contiene filas abiertas, el emparejador puede enlazarlas con fills posteriores de esa misma jornada, pero la comparación económica mantiene el día como provisional. Las aperturas VST adicionales de esa fecha quedan pendientes, sin ocultar los extras históricos de jornadas ya cerradas. El emparejador tampoco permite que una apertura de días posteriores rellene un hueco antiguo. Para las cohortes, las fuentes se acotan a su ventana antes de emparejar, evitando cruces falsos con operaciones anteriores.

El frontend resume esta situación inmediatamente debajo de las fuentes de PnL. El bloque `Estado de alineación` muestra filas emparejadas, ausencias, entradas y salidas por encima del 0,15% adverso, costes acumulados y neto de BingX. Distingue una hoja al día, una hoja desactualizada y una última jornada provisional con filas abiertas. En los dos últimos casos separa las operaciones VST que todavía quedan fuera de cobertura. Es una lectura informativa y no activa filtros ni cambia la ejecución.

El win rate ya no compara universos distintos. En el corte del 22 de julio hay **159 pares cerrados con resultado en ambos lados**: Google Sheet registra 119 ganadoras (**74,8%**) y BingX VST neto registra 98 (**61,6%**). La brecha comparable es de **-13,2 puntos porcentuales**. En 138 pares coincide el signo neto y en 21 cambia: 15 diferencias ya existían antes de costes y seis ganancias brutas fueron absorbidas por fees y funding. Los pares abiertos, las operaciones ausentes y las que todavía no tienen resultado de hoja permanecen visibles en sus contadores, pero no entran en estos porcentajes.

Cada operación ausente se cruza de forma conservadora con los intentos fallidos del mismo día, activo, dirección y precio. En el corte del 22 de julio hay **18 ausencias**, todas con evidencia concreta: cinco stops inválidos, nueve bloqueos del filtro de costes anterior, tres rechazos por margen VST insuficiente y un reintento expirado por desviación de entrada. El panel conserva el estado, el motivo técnico y el enlace de la publicación; una coincidencia aproximada o de otro día no se acepta como explicación.

La auditoría distingue ahora el precio publicado del precio real de ejecución. Para la entrada utiliza el `avgPrice` confirmado por BingX, no la instantánea tomada antes de enviar la orden. Para la salida usa prioritariamente el `avgPrice` del histórico firmado de órdenes. En este corte reconstruye **170 aperturas**: 167 tenían evento local y tres fueron recuperadas directamente desde BingX. Los **169 ciclos cerrados** tienen fill exacto y no queda ningún cierre huérfano. De las ejecuciones medibles, 82 entradas y 52 salidas superaron el 0,15% de desviación adversa; las medias fueron del 0,1381% y del 0,1481%, respectivamente.

El panel incorpora además un puente contable que reconcilia la réplica teórica con el neto observado. Parte de **540,1042 VST**, resta 558,1973 VST por la diferencia de las 159 operaciones emparejadas y 52,5824 VST por 18 operaciones no ejecutadas. Después suma 14,4951 VST de tres resultados pendientes en la hoja, resta 28,2720 VST de tres operaciones todavía fuera de cobertura, suma 5,5578 VST de cinco extras históricos y resta 179,7983 VST de comisiones y funding. Los cierres sin apertura enlazada aportan exactamente **0 VST**. El resultado es **-258,6929 VST**, con residual contable cero. La última jornada de la hoja sigue provisional porque conserva tres filas abiertas; esas operaciones se muestran como pendientes y no como contradicciones de estrategia.

La bolsa de operaciones emparejadas también se descompone de forma exacta. Sus **487,5218 VST** teóricos pasan a **-70,6756 VST** brutos en BingX: la diferencia de entrada aporta **-256,1414 VST**, la diferencia de salida **-301,6238 VST** y cantidad, redondeos y fills residuales **-0,4322 VST**. La contabilidad publicada de la hoja coincide con el cálculo lineal escalado y no deja diferencia material. La atribución de entrada y salida es simétrica, por lo que ninguna de las dos absorbe artificialmente la interacción entre ambos precios. Este desglose usa las 159 operaciones con precios suficientes y reconcilia con residual cero.

Por activo, el gap emparejado es **-212,3036 VST en SOL**, **-204,0369 VST en ETH**, **-112,9161 VST en BTC** y **-28,9407 VST en SUI**. Esta medición es anterior a comisiones: demuestra que el principal desalineamiento histórico está en los precios de entrada y de salida; los costes se añaden después como una pérdida separada.

La nueva clasificación causal separa lo ocurrido antes de cada fill de cierre. De las 159 operaciones emparejadas, **143** siguieron una ruta observada ordinaria: 102 cierres explícitos y 41 stops sin una incidencia de cierre anterior. Su gap conjunto es **-423,1600 VST**, repartido principalmente entre entrada (**-240,8932 VST**) y salida (**-189,8422 VST**). Otras **siete** operaciones están asociadas a incidencias históricas ya corregidas: tres cierres que no generaron evento y cuatro posiciones afectadas por el error del guard de cierre. Su gap observado es **-107,3859 VST**, con **-93,1546 VST** atribuibles a la salida. Siete operaciones adicionales cerraron después de reintentos protegidos y aportan **-26,0973 VST**; dos fills exactos carecen de una señal local enlazada y aportan **-1,5542 VST**. Las cuatro familias suman exactamente **-558,1973 VST**, con residual cero.

El gap de una familia no debe interpretarse como beneficio recuperable. La clasificación demuestra asociación temporal y técnica, pero no construye un mercado contrafactual. Su utilidad es separar los defectos históricos del comportamiento vigente y evitar que se atribuyan al parser actual. La cohorte posterior a las mejoras sigue siendo la evidencia válida para evaluar si esos defectos han desaparecido y si la ejecución nueva reduce la diferencia.

La cadena de precios abre ahora esas diferencias en puntos observables. En las entradas, la referencia de la hoja frente a la señal aporta **-28,3553 VST**, el movimiento entre la señal y la cotización previa al envío **-96,3582 VST**, y el tramo entre esa cotización y el fill confirmado **-131,4279 VST**. En las salidas, la diferencia entre el cierre de la hoja y el objetivo conocido por la app aporta **-80,2306 VST**, el movimiento hasta la cotización previa **-1,6459 VST**, el tramo entre cotización y fill **-200,1392 VST**, y nueve salidas sin toda la evidencia intermedia aportan **-19,6080 VST**. Los tramos, junto con **-0,4322 VST** de cantidad y fills, reconstruyen exactamente los **-70,6756 VST** brutos observados.

La cotización previa es una instantánea de `lastPrice` o `markPrice`, no necesariamente el mejor bid/ask ejecutable. Por ello, `cotización → fill` incluye spread, diferencia de base y ejecución del exchange; el panel no lo etiqueta como slippage puro. Esta distinción evita atribuir al scraper un coste que puede proceder del mercado o del entorno VST de BingX.

La latencia también se separa entre reacción inicial y espera por reintentos. En el corte del 22 de julio, las 167 aperturas medibles tuvieron una reacción mediana de **1,655 s** y un p95 de **4,072 s**; sin embargo, 40 esperaron un reintento y elevaron el p95 total a **85,344 s**. Los 111 cierres por señal medibles reaccionaron en una mediana de **0,462 s** y tuvieron un p95 total de **3,412 s**. Por tanto, la demora ordinaria del monitor no aparece como el cuello de botella principal; las esperas largas están concentradas y quedan identificadas como reintentos.

Los cierres por stop se comparan por signo y precio antes de considerarse una incidencia. Un stop es `alineado` cuando la hoja y BingX terminan con el mismo signo y el cierre difiere como máximo un 0,15%; un cierre con el mismo signo pero mayor diferencia se clasifica como `Stop con deslizamiento`, y solo el signo contrario queda como `Stop antes del cierre`. Cuando BingX guardó históricamente un cierre como `exchange_position_closed`, se infiere que fue un stop únicamente si no existe señal de cierre, el PnL es negativo y el precio ejecutado está en el SL o más allá. Con la evidencia exacta hay **33 de 47 stops comparables alineados**, seis con deslizamiento y ocho divergentes. Tres divergencias estuvieron precedidas por el fallo histórico de cierre `CLOSE_GUARD_MIN_NET_PNL is not defined` y tres proceden de la publicación de cierre no procesada; cinco filas divergentes pertenecen a posiciones agregadas. Otros dos stops observados no tienen todavía una fila comparable en la hoja y quedan fuera del denominador.

El detalle operación por operación se presenta en una tabla con desplazamiento vertical y horizontal. Los filtros permiten aislar los 21 cambios netos, sus 15 causas anteriores a costes, los seis cambios provocados por costes, los 138 resultados del mismo signo y las filas no comparables. Cada fila comparable muestra su clasificación causal. Los botones de navegación desplazan esa tabla sin modificar la operativa ni los datos de ejecución.

## Causas demostradas

### 1. Entradas perseguidas

La línea base original usaba la instantánea de mercado previa al envío y, por tanto, infravaloraba el deslizamiento. Al reprocesar el mes con el precio ejecutado confirmado por BingX, 151 de 167 entradas fueron adversas y 82 superaron el 0,15%. El arrastre neto estimado de entrada asciende a 173,2092 VST.

La estimación usa exposición y diferencia de precio. Sirve para medir magnitud, pero no sustituye el PnL oficial de BingX.

El desglose reconciliado frente a los precios finales de la hoja asigna **-256,1414 VST** a la diferencia de entrada en las operaciones emparejadas. Esta cifra no sustituye la métrica de slippage frente al mensaje: responde a una pregunta distinta, cuánto del gap final hoja/BingX queda explicado al cambiar el precio de entrada de la hoja por el fill de BingX.

### 2. Salidas tardías

La línea base también comparaba la señal de cierre con un precio de marca, no con el precio ejecutado. Con el fill exacto del histórico, 52 de 113 salidas comparables superaron el 0,15% de desviación adversa. El arrastre neto estimado asciende a 177,4807 VST.

Esperar a que el precio volviera a la cifra escrita añadía una apuesta nueva que no formaba parte de la orden de cierre.

El desglose reconciliado asigna **-301,6238 VST** a la diferencia de salida. Incluye tanto el precio ejecutado al recibir un cierre como las posiciones que alcanzaron un stop antes de que la operación equivalente de la hoja registrara otro resultado. Por eso es mayor que la métrica de slippage de cierres explícitos: mide toda la divergencia final de salida en las operaciones emparejadas.

### 3. Costes

Las comisiones superaron en valor absoluto el PnL bruto. El tamaño de la cuenta no corrige este problema de ROI: al aumentar tamaño, crecen tanto el PnL como las fees.

La auditoría identifica 21 cambios de signo neto: en 15 el PnL ya era contrario a la hoja antes de costes y en seis el bruto coincidía, pero comisiones y funding lo convirtieron en pérdida. Existen 16 brutos de signo contrario en total porque un caso adicional volvió a coincidir con la hoja después de costes; ese caso no se cuenta entre los 21 cambios netos. De este modo, una divergencia previa a costes ya no se confunde con una ganancia absorbida por costes.

### 4. Operaciones ausentes

Las 18 aperturas ausentes se explican completamente por eventos registrados: cinco stops inválidos, nueve bloqueos del filtro de costes anterior, tres rechazos por margen VST insuficiente y una desviación de entrada. No hay señales sin rastro ni ejecuciones duplicadas en la ventana auditada.

Nueve bloqueos procedían del filtro anterior, que rechazaba indiscriminadamente todas las entradas a x25. Ese criterio no distinguía una señal con ventaja de otra sin ella.

### 5. Cierre histórico no procesado

La única publicación de cierre del mes guardada sin evento fue `CUERRE TOTAL · BTC 63170 · ETH 1790 · SOL 81.92`, detectada el 5 de julio a las 21:58 UTC. Afectó a tres posiciones que ya estaban abiertas: BTC, ETH y SOL. SOL debía cerrar con beneficio en 81,92, pero permaneció abierta hasta el stop en 80,819; esta es la causa demostrada de la cuarta divergencia de stop.

La auditoría reconstruye esta incidencia desde la publicación almacenada, el parser actual y la ausencia de eventos. Solo enlaza el cierre omitido con posiciones del mismo activo que ya estaban abiertas y que todavía no se habían cerrado en ese instante.

### 6. Posiciones agregadas

BingX puede combinar varias entradas del mismo activo en una posición y cerrarla con una o varias órdenes. La auditoría exacta detectó diez ciclos agregados, con dieciséis filas implicadas. El comparador reparte cantidad, PnL y costes entre esas aperturas en vez de cerrar todas con el primer registro de PnL o dejar los cierres restantes como huérfanos.

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
- Los bloqueos transitorios de renombrado en Windows se reintentan de forma acotada y dejan el diario intacto; los errores permanentes siguen siendo visibles.
- El parser, las guardas, el riesgo, los cierres, la auditoría y la persistencia tienen pruebas automáticas.
- La errata histórica `CUERRE` se reconoce como cierre y está cubierta con el mensaje exacto que se perdió el 5 de julio.
- Cada publicación con aperturas forma un paquete auditable: símbolos esperados, ejecutados, pendientes y ausentes.
- Una alerta informa cuando un paquete queda incompleto al terminar su ventana de reintento.
- La cohorte posterior a las mejoras conserva el histórico anterior, pero calcula sus métricas desde una marca temporal independiente.
- Al iniciar una cohorte, la aplicación archiva las fronteras temporales de hasta doce cohortes anteriores para poder compararlas sin reescribir eventos.
- Cada apertura usa un identificador determinista. Un reintento conserva la misma identidad en BingX y no puede convertirse en una orden nueva por cambiar la hora local.
- La cola de aperturas y cierres pendientes se guarda en `.data/execution-retries.json` y se recupera después de reiniciar.
- Antes de reintentar una apertura, la app reconcilia posiciones para resolver respuestas ambiguas sin duplicar exposición.
- La auditoría consulta el histórico firmado de órdenes en ventanas de siete días, conserva los identificadores largos sin redondearlos y refresca de forma incremental con solapamiento para no perder órdenes de borde.
- El frontend refresca de forma pasiva la referencia y la auditoría cada cinco minutos solo cuando PnL está visible. Si una fuente falla, muestra el aviso, conserva la última muestra válida y aumenta temporalmente el intervalo sin tocar la ejecución.
- Si la lectura exacta falla, conserva la última copia válida como obsoleta; si no existe o no cubre al menos el 80% de los eventos, activa un fallback explícito basado en eventos e ingresos.
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
docs/audits/system-audit-AAAA-MM-DD.md
```

La salida fechada conserva un único snapshot por día. Ejecutar de nuevo la auditoría durante la misma jornada actualiza ese archivo y `latest.md`, sin multiplicar informes equivalentes.

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

## Contraste antes y después

La aplicación compara siempre la cohorte activa con la cohorte archivada inmediatamente anterior. No compara totales sin ajustar: expresa incidencias por cada cien cierres y divide PnL, costes e impactos entre el número de operaciones correspondiente. La parte que depende de la hoja solo utiliza filas emparejadas y muestra su cobertura de forma explícita.

El corte de referencia del 22 de julio de 2026 contiene 34 cierres en la cohorte anterior y 38 en la actual. La lectura observada es:

- las incidencias técnicas históricas bajan de cuatro a cero;
- la desviación de cierre mejora: las salidas por encima del 0,15% pasan del 57,1% al 32,1%, la desviación adversa media baja del 0,1739% al 0,1116% y la latencia p95 baja de 3,454 a 2,356 segundos;
- la entrada empeora: las ejecuciones por encima del 0,15% suben del 42,9% al 60,5% y la desviación adversa media pasa del 0,1252% al 0,1409%;
- el coste por cierre mejora ligeramente, pero el neto continúa siendo negativo, aproximadamente -2,05 VST antes y -1,94 VST ahora;
- solo 9 de los 38 cierres actuales tienen todavía referencia en la hoja, por lo que la alineación de la cohorte vigente es parcial;
- la diferencia media neta observada es pequeña y su intervalo exploratorio del 95% cruza cero. No existe evidencia suficiente para afirmar que la mejora técnica haya producido una mejora económica.

El panel y el informe expresan por ello el veredicto `Mejora técnica; rentabilidad no demostrada`. El bootstrap usa una semilla fija y 4.000 remuestreos para que dos auditorías sobre la misma evidencia produzcan exactamente la misma salida. Es una medida descriptiva de incertidumbre, no una predicción ni una garantía de beneficio.

### Diagnóstico del deterioro de entrada

El diagnóstico añadido al corte del 22 de julio atribuye la desviación adversa sin modificar la operativa. En la cohorte actual hay 38 aperturas medibles y 23 superan el 0,15%. El tramo `señal → cotización previa` pasa del 0,0546% al 0,0643% de media adversa, mientras que `cotización previa → fill` pasa del 0,0718% al 0,0808%. Ambos tramos empeoran y el segundo sigue siendo el de mayor magnitud observada.

SUI presenta la media actual más alta, pero la cohorte anterior solo aporta dos aperturas y no permite contrastar el cambio. SOL es el deterioro comparable más claro. De las 23 aperturas que superan el umbral, 21 se ejecutaron sin espera de reintento y dos después de reintentarse. Por tanto, en esta muestra las esperas de la cola no explican la mayor parte de los desvíos.

La hora del histórico firmado permite corregir otra ambigüedad: el evento local marcaba el inicio del intento, no el fill. Las 38 aperturas actuales quedan ahora respaldadas por una hora de BingX. El intervalo entre el inicio del intento y el fill dura 1,99 segundos de media y apenas cambia entre posiciones. En cambio, la detección al primer intento promedia 0,01 segundos en la primera apertura, 2,09 en la segunda y 4,04 en la tercera, porque el paquete se procesa de forma secuencial.

La primera apertura del paquete promedia un 0,0558% de desviación adversa; las 25 posteriores, un 0,1852%. La cohorte actual contiene proporcionalmente menos primeras aperturas y más posiciones posteriores. La descomposición por posición atribuye **0,0110 puntos porcentuales** del aumento medio a ese cambio de composición y **0,0048 puntos** al cambio dentro de los grupos; ambas partes reconstruyen exactamente los **0,0157 puntos** observados. El efecto de composición representa un 69,6% de ese aumento en esta muestra.

La posición no es una causa aislada: suele coincidir con el activo, ya que BTC aparece primero y ETH, SOL o SUI después. El tramo `cotización → fill` actual es del 0,0052% en BTC, 0,1037% en ETH, 0,1214% en SOL y 0,1315% en SUI, con tiempos de inicio a fill muy parecidos. Esto es compatible con diferencias de spread o liquidez del entorno Demo VST, pero no las demuestra porque la cotización almacenada es `lastPrice`, no el mejor ask ejecutable.

### Captura prospectiva de microestructura

Para resolver esa última ambigüedad sin alterar la operativa, la aplicación suscribe el canal público `bookTicker` de BingX junto a `lastPrice`. Cada apertura nueva conservará el mejor bid y ask recibido antes del envío, el spread, la antigüedad de la instantánea, el RTT de la lectura de precio y el RTT local de la petición de orden. En LONG se toma el ask como precio ejecutable; en SHORT, el bid. La marca temporal del mensaje permite medir además `BingX → recepción local` y `recepción local → envío`. Como los relojes pueden no estar perfectamente sincronizados, el primer tramo se etiqueta como diferencia observada y no como latencia de red pura.

Para acotar ese desfase, el backend toma cada cinco minutos una muestra independiente del reloj público REST de BingX. El estimador usa el punto medio entre envío y recepción y conserva también el RTT como cota de incertidumbre. Se muestra en fiabilidad y en el informe diario, pero no corrige timestamps, no sincroniza el equipo y no participa en ninguna decisión operativa.

La siguiente instrumentación separa además la secuencia interna del paquete. Los activos vistos en aperturas de los últimos 30 días se mantienen suscritos, con un límite de 24, y al comenzar a procesar una publicación se conserva una fotografía simultánea del lado ejecutable de todos ellos. Cada señal guarda la hora de inicio, el tamaño del paquete y su posición exacta. La lectura `inicio del paquete → preenvío` mostrará cuánto se esperó y cuánto se movió el precio mientras se atendían las señales anteriores.

La descomposición prospectiva tendrá tres tramos: `señal → lastPrice`, `lastPrice → precio ejecutable` y `precio ejecutable → fill`. Esto permitirá distinguir movimiento previo, spread visible y diferencia posterior a la instantánea. La marca de fill de BingX mantiene precisión de un segundo, mientras que los RTT locales se registran en milisegundos.

Las 38 aperturas ya incluidas en la cohorte vigente son anteriores a esta instrumentación y, por tanto, no tienen bid/ask histórico ni fotografía inicial del paquete. El panel muestra inicialmente `0/38` con cobertura de microestructura y empezará a crecer con la siguiente apertura. No se imputan ceros, no se usa el spread actual para rellenar el pasado y ninguna de estas métricas alimenta guards, tamaños, stops, reintentos o cierres.

La misma captura se aplica prospectivamente a los cierres explícitos. Al cerrar LONG, el bid es el lado ejecutable; al cerrar SHORT, lo es el ask. La auditoría separa `último precio → ejecutable` y `ejecutable → fill`, mide el RTT de la solicitud y conserva resultados por activo. Una posición agregada se cuenta una sola vez por evento y símbolo.

Los cierres anteriores a esta instrumentación no se reconstruyen con el libro actual. Los stops tampoco se incluyen porque BingX los ejecuta sin que la aplicación pueda capturar una instantánea inmediatamente anterior a su disparo. La cobertura inicial aparece como `0/N` y solo crecerá con cierres explícitos nuevos; una ausencia de bid/ask nunca frena ni retrasa el cierre.

La lectura por activo, posición, ruta, latencia y franja horaria es descriptiva. No demuestra causalidad, no justifica bloquear un ticker o una hora, ni permite sumar el efecto por activo al efecto por posición. Tampoco sustituye una prueba controlada con suficiente muestra. Su finalidad es señalar dónde investigar antes de proponer otra modificación del camino de ejecución.

## Límites de la mejora

El sistema puede reducir latencia, errores, duplicados, slippage evitable y mediciones incorrectas. No puede garantizar que las señales futuras sean rentables ni reproducir un precio que ya no está disponible.

No debe construirse una estrategia autónoma a partir de la hoja hasta separar claramente:

- resultado antes y después de fees;
- precio publicado y precio ejecutable;
- stop real y cierre posterior de la hoja;
- posiciones individuales y posiciones agregadas;
- muestra de aprendizaje y muestra de validación.
