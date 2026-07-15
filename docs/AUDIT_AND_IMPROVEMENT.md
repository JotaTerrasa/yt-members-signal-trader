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

La pestaña `PnL` usa `/api/replica-audit` como fuente única para la comparación entre la hoja, la réplica teórica y BingX VST. La cabecera muestra las aperturas ejecutadas frente al total de la hoja, por lo que en esta línea base debe leerse **88/103 ejecutadas** y **15 no ejecutadas**.

El detalle operación por operación se presenta en una tabla con desplazamiento vertical y horizontal. Los botones de navegación desplazan esa tabla sin modificar la operativa ni los datos de ejecución.

## Causas demostradas

### 1. Entradas perseguidas

De 88 aperturas medibles, 65 entraron a un precio peor que el publicado y 14 superaron el 0,15% de desviación adversa. El arrastre estimado de entrada fue de unos 54,90 VST.

La estimación usa exposición y diferencia de precio. Sirve para medir magnitud, pero no sustituye el PnL oficial de BingX.

### 2. Salidas tardías

En 44 de 58 cierres medibles, el mercado estaba peor que el precio publicado. Nueve superaron el 0,15%. El arrastre estimado fue de unos 39,44 VST.

Esperar a que el precio volviera a la cifra escrita añadía una apuesta nueva que no formaba parte de la orden de cierre.

### 3. Costes

Las comisiones superaron en valor absoluto el PnL bruto. El tamaño de la cuenta no corrige este problema de ROI: al aumentar tamaño, crecen tanto el PnL como las fees.

### 4. Operaciones ausentes

La diferencia de 15 aperturas se explica completamente por eventos registrados: diez bloqueos y cinco errores. No hay señales sin rastro ni ejecuciones duplicadas en la ventana auditada.

Nueve bloqueos procedían del filtro anterior, que rechazaba indiscriminadamente todas las entradas a x25. Ese criterio no distinguía una señal con ventaja de otra sin ella.

### 5. Posiciones agregadas

BingX puede combinar varias entradas del mismo activo en una posición. La auditoría detectó cuatro ciclos agregados, con ocho filas de la hoja implicadas. El comparador ahora reparte PnL y costes entre esas aperturas en vez de marcar falsamente una operación como abierta.

### 6. Reset con posiciones heredadas

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
- Cada publicación con aperturas forma un paquete auditable: símbolos esperados, ejecutados, pendientes y ausentes.
- Una alerta informa cuando un paquete queda incompleto al terminar su ventana de reintento.
- La cohorte posterior a las mejoras conserva el histórico anterior, pero calcula sus métricas desde una marca temporal independiente.
- Al iniciar una cohorte, la aplicación archiva las fronteras temporales de hasta doce cohortes anteriores para poder compararlas sin reescribir eventos.
- Cada apertura usa un identificador determinista. Un reintento conserva la misma identidad en BingX y no puede convertirse en una orden nueva por cambiar la hora local.
- La cola de aperturas y cierres pendientes se guarda en `.data/execution-retries.json` y se recupera después de reiniciar.
- Antes de reintentar una apertura, la app reconcilia posiciones para resolver respuestas ambiguas sin duplicar exposición.
- Si la cobertura detecta en Demo una apertura reciente sin evento de ejecución, vuelve a validarla por la misma ruta idempotente. Las ejecuciones procedentes de otra fuente se enlazan y no se cuentan como huecos.
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
