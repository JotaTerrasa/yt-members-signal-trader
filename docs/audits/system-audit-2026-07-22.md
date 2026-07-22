# Auditoría integral del sistema

Generada: 2026-07-22T16:22:10.612Z
Mes auditado: 2026-07
Ventana: 2026-07-01T10:55:57.218Z a 2026-07-22T16:22:08.414Z

## Resumen ejecutivo

- **HIGH · entry_chasing:** 80 entradas superaron el 0,15% de desviación adversa.
- **HIGH · close_slippage:** 51 cierres superaron el 0,15% de desviación adversa.
- **HIGH · fees_dominate:** Las comisiones acumuladas superan el PnL bruto de BingX.
- **HIGH · market_sign_mismatch:** 7 operaciones terminaron con signo bruto contrario a la hoja; no se explican solo por comisiones.
- **HIGH · profit_absorbed_by_costs:** 6 operaciones coincidieron con la hoja en bruto, pero comisiones y funding convirtieron la ganancia VST en pérdida neta.
- **INFO · historical_close_incidents_isolated:** 7 operaciones están asociadas a incidencias históricas ya corregidas, con un gap observado de -107.3859 VST; no se interpreta como contrafactual recuperable.
- **INFO · openings_recovered_from_exchange:** 3 aperturas ausentes en los eventos locales fueron recuperadas desde BingX.
- **HIGH · sheet_operations_missing:** 21 operaciones de la hoja no tienen apertura VST emparejada. Motivos: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 1 desviación de entrada, 3 sin evidencia.
- **HIGH · historical_close_unprocessed:** 1 publicación histórica de cierre no generó evento y afectó a 3 posiciones. La errata CUERRE ya está cubierta por el parser actual.
- **HIGH · reference_stop_divergence:** 8 stops cerraron con signo contrario a la hoja; 31 de 45 stops comparables sí quedaron alineados, 3 divergencias estuvieron precedidas por cierres fallidos por el fallo histórico del guard y esas 5 posiciones terminaron agregadas; 3 divergencias procedieron de cierres no procesados.
- **INFO · sheet_reference_stale:** 6 aperturas VST son posteriores al último día disponible en la hoja (cobertura hasta 2026-07-20T23:59:59.999Z). No se clasifican como extras mientras falte esa referencia.
- **HIGH · post_correction_miss:** 1 apertura faltó tras procesar una versión anterior del post. La cohorte conserva el fallo histórico; las correcciones recientes ya se recuperan por la ruta idempotente.
- **INFO · cohort_reliability_improved:** La cohorte actual reduce las incidencias técnicas observadas de 4 a 0 operaciones.
- **HIGH · cohort_entry_execution_worse:** La ejecución de entrada empeora frente a la cohorte anterior: 61% superan el 0,15% adverso.
- **HIGH · cohort_net_per_close_negative:** La economía de la cohorte actual sigue siendo negativa: -1,7968 VST netos por cierre; contraste inconcluso.
- **INFO · cohort_effect_inconclusive:** El intervalo exploratorio del cambio neto va de -4.3211 a 4.7784 VST por cierre y cruza cero.
- **INFO · entry_execution_attribution:** El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. El deterioro comparable más claro está en SOL-USDT: 55,6% → 85,7% sobre el umbral. La primera apertura del paquete promedia 0,0558%; las posteriores, 0,1892%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,93 s, mientras que inicio→fill ronda 1,96 s. El cambio de mezcla por posición explica descriptivamente 61% del aumento medio observado. 22/25 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/25, tras reintento.
- **INFO · rebate_not_detected:** BingX no acredita ninguna devolución de comisiones en el histórico consultado.

## Cobertura de señales

- Aperturas esperadas desde publicaciones: 187
- Ejecutadas: 164
- Bloqueadas: 12
- Sin evento: 0
- Tasa de ejecución: 87.70%
- Razones de bloqueo: {"exchange_stop_loss_invalid":1,"cost_guard_margin_break_even":9,"entry_adverse_deviation_too_high":1,"stop_loss_distance_too_high":1}

## Calidad de ejecución

- Entradas medibles: 164
- Entradas adversas: 148
- Entradas por encima del 0,15%: 80
- Arrastre neto estimado en entradas: 168.8666 VST
- Cierres medibles: 111
- Cierres por encima del 0,15%: 51
- Arrastre neto estimado en cierres: 173.1587 VST

## Réplica y costes

- Filas de la hoja: 177
- Aperturas VST: 167
- Réplica teórica escalada: 540.1042 VST
- PnL bruto BingX: -60.8300 VST
- Comisiones: -174.9805 VST
- Funding: -4.8178 VST
- Neto observado: -240.6283 VST
- Devolución acreditada por BingX: 0.0000 VST (no detectada)
- Tarifa taker observada: 0.05%
- Tarifa maker observada: 0.02%
- Devolución estimada (22%): 38.4957 VST
- Neto hipotético tras devolución estimada: -202.1326 VST
- Ciclos con entradas agregadas: 10 (16 filas)
- Histórico exacto de órdenes: disponible
- Órdenes históricas leídas: 456
- Cierres con fill exacto: 165 de 165
- Órdenes de cierre / posiciones reconstruidas: 161 / 156
- Aperturas recuperadas desde BingX: 3
- Cobertura de eventos locales: 98.20%
- Cierres sin apertura enlazada: 0
- Última operación disponible en la hoja: 2026-07-20T12:00:00.000Z
- Cobertura temporal asumida hasta: 2026-07-20T23:59:59.999Z
- Última apertura VST: 2026-07-22T13:58:34.246Z
- Aperturas VST posteriores sin referencia: 6
- Motivos de aperturas ausentes: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 1 desviación de entrada, 3 sin evidencia
- Publicaciones históricas de cierre sin evento: 1
- Posiciones afectadas por cierres no procesados: 3
- Signos distintos por mercado / por costes: 7 / 6
- Ejecuciones de entrada > 0,15%: 80 de 167
- Ejecuciones de salida > 0,15%: 51 de 111
- Fuentes de entrada: {"exchange_fill":167,"unavailable":21}
- Fuentes de salida: {"exchange_order_history":165,"unavailable":23}
- Stops comparables alineados / divergentes / con deslizamiento: 31 / 8 / 6
- Stops observados sin hoja comparable: 2
- Stops divergentes precedidos por cierres fallidos: 3
- Stops divergentes por el fallo histórico del guard: 3
- Stops divergentes tras un cierre no procesado: 3
- Stops divergentes en posiciones agregadas: 5
- Clasificación: {"Alineada":11,"Entrada desviada":50,"Stop antes del cierre":2,"Salida desviada":18,"Signo distinto de mercado":7,"No ejecutada en VST":21,"Diferencia de ejecución":30,"Fees dominan":9,"Stop alineado":11,"Ganancia absorbida por costes":6,"Stop con deslizamiento":6,"Cierre no procesado":3,"Cierre fallido antes del stop":3,"Extra en VST":5,"Fuera de cobertura de la hoja":6}

## Puente contable

- Réplica teórica inicial: 540.1042 VST
- Emparejadas vs hoja (156 operaciones): -553.6747 VST
- No ejecutadas (21 operaciones): -37.0753 VST
- Posteriores sin hoja (6 operaciones): -15.7421 VST
- Extras en cobertura (5 operaciones): 5.5578 VST
- Comisiones: -174.9805 VST
- Funding: -4.8178 VST
- Bruto BingX reconstruido: -60.8300 VST
- Neto BingX reconstruido: -240.6283 VST
- Residual: 0.0000 VST (reconciliado)

## Desglose del gap emparejado

- Operaciones emparejadas / descomponibles: 156 / 156
- Réplica teórica emparejada: 503.0289 VST
- Contabilidad de la hoja: 0.0000 VST
- Diferencia de entrada: -252.5771 VST
- Diferencia de salida: -300.7302 VST
- Cantidad y fills: -0.3674 VST
- Bruto BingX emparejado: -50.6458 VST
- Residual: 0.0000 VST (reconciliado)
- Por activo:
- SOL-USDT: gap -210.2438 VST; entrada -92.5182; salida -117.6800; cantidad/fills -0.0456.
- ETH-USDT: gap -201.4707 VST; entrada -130.6527; salida -70.6646; cantidad/fills -0.1534.
- BTC-USDT: gap -113.0195 VST; entrada -14.3877; salida -98.4866; cantidad/fills -0.1453.
- SUI-USDT: gap -28.9407 VST; entrada -15.0185; salida -13.8991; cantidad/fills -0.0232.

## Rutas causales de salida

- Operaciones emparejadas: 156
- Incidencias históricas ya corregidas: 7
- Reintentos protegidos: 7
- Salidas sin señal local enlazada: 2
- Residual: 0.0000 VST (reconciliado)
- Familias:
- Ejecución observada: 140 operaciones; gap -418.6373 VST; entrada -237.3289 VST; salida -188.9486 VST.
- Incidencia histórica corregida: 7 operaciones; gap -107.3859 VST; entrada -6.6801 VST; salida -93.1546 VST.
- Reintento protegido: 7 operaciones; gap -26.0973 VST; entrada -7.8002 VST; salida -18.2580 VST.
- Evidencia local incompleta: 2 operaciones; gap -1.5542 VST; entrada -0.7680 VST; salida -0.3690 VST.
- Rutas:
- Cierre explícito ejecutado: 101 operaciones; réplica 748.8665 VST; BingX bruto 464.1756 VST; gap -284.6909 VST; 0 intentos fallidos; 0 cierres sin evento.
- Stop antes de otra señal de cierre: 39 operaciones; réplica -391.7122 VST; BingX bruto -525.6586 VST; gap -133.9465 VST; 0 intentos fallidos; 0 cierres sin evento.
- Cierre no procesado; salida posterior por stop: 3 operaciones; réplica 16.8605 VST; BingX bruto -48.5519 VST; gap -65.4125 VST; 0 intentos fallidos; 3 cierres sin evento.
- Error histórico del guard; salida posterior por stop: 3 operaciones; réplica 14.9111 VST; BingX bruto -31.6776 VST; gap -46.5887 VST; 6 intentos fallidos; 0 cierres sin evento.
- Error histórico del guard; cierre recuperado: 1 operaciones; réplica 14.4634 VST; BingX bruto 19.0786 VST; gap 4.6153 VST; 1 intentos fallidos; 0 cierres sin evento.
- Guard de cierre; ejecución posterior: 7 operaciones; réplica 94.6677 VST; BingX bruto 68.5705 VST; gap -26.0973 VST; 157 intentos fallidos; 0 cierres sin evento.
- Salida sin señal local enlazada: 2 operaciones; réplica 4.9719 VST; BingX bruto 3.4177 VST; gap -1.5542 VST; 0 intentos fallidos; 0 cierres sin evento.
- Nota: el gap asociado a una ruta describe lo observado y no equivale a dinero contrafactualmente recuperable.

## Cadena señal, cotización y fill

- Operaciones emparejadas / cadena base completa: 156 / 156
- Entradas con señal y cotización / salidas con objetivo y cotización: 156 / 147
- Contabilidad de la hoja (156 operaciones): 0.0000 VST
- Referencia de entrada (156 operaciones): -28.3553 VST
- Señal a cotización (156 operaciones): -95.3315 VST
- Cotización a fill de entrada (156 operaciones): -128.8903 VST
- Objetivo de salida (151 operaciones): -80.2306 VST
- Objetivo a cotización (147 operaciones): -12.9242 VST
- Cotización a fill de salida (152 operaciones): -187.9673 VST
- Salida sin traza intermedia (9 operaciones): -19.6080 VST
- Cantidad y fills (156 operaciones): -0.3674 VST
- Bruto BingX reconstruido: -50.6458 VST
- Residual: 0.0000 VST (reconciliado)
- Latencia de apertura: mediana 1.90 s, p95 85.3 s, 40 con espera de reintento.
- Latencia de cierre por señal: mediana 0.73 s, p95 3.41 s, 3 con espera de reintento.

## Cohorte posterior a las mejoras

- Inicio: 2026-07-15T07:05:17.987Z
- Muestra: Muestra preliminar (39 cierres)
- Aperturas / cierres: 41 / 39
- Filas comparables / VST posteriores sin referencia: 38 / 6
- Última operación disponible en la hoja: 2026-07-20T12:00:00.000Z
- Neto observado: -70.0735 VST
- Comisiones: -43.2918 VST
- Paquetes completos: 14 de 15
- Aperturas esperadas / ejecutadas / faltantes: 45 / 44 / 1
- Faltantes con corrección posterior demostrada: 1
- Motivos de aperturas ausentes: 3 sin evidencia
- Cierres históricos sin evento / posiciones afectadas: 0 / 0
- Signos distintos por mercado / por costes: 2 / 0
- Ejecuciones de entrada / salida > 0,15%: 25 / 9
- Stops comparables alineados / divergentes: 5 / 0
- Divergencias precedidas por cierres fallidos: 0
- Fallos heurísticos de parseo: 0
- Clasificación: {"Entrada desviada":13,"Fees dominan":3,"Stop alineado":2,"Stop con deslizamiento":3,"Diferencia de ejecución":6,"Signo distinto de mercado":2,"Alineada":3,"No ejecutada en VST":3,"Extra en VST":3,"Fuera de cobertura de la hoja":6}

## Contraste antes y después

- Estado: Muestra preliminar. 39/100 cierres para una comparación contrastable.
- Antes: 34 cierres; 34/34 con referencia; 100.00% con precio ejecutado exacto.
- Ahora: 39 cierres; 32/39 con referencia; 100.00% con precio ejecutado exacto.
- Veredicto global: Mejora técnica; rentabilidad no demostrada. Fiabilidad: mejora observada; entradas: empeoramiento observado; cierres: mejora observada. El intervalo del cambio neto cruza cero.
- Lecturas por ámbito:
- Fiabilidad: mejora. 0 incidencias técnicas y 0 cierres sin enlazar en la cohorte actual.
- Entradas: empeora. 61% superan el 0,15% adverso.
- Cierres: mejora. Media adversa 0,1128%; p95 2,36 s.
- Economía: negativo. -1,7968 VST netos por cierre; contraste inconcluso.
- Alineación: mixto. 32/39 cierres comparables con la hoja.
- Métricas normalizadas:
- Incidencias técnicas: antes 11.76%; ahora 0.00%; cambio -11.76 pp; mejora.
- Cobertura de precios exactos: antes 100.00%; ahora 100.00%; cambio 0.00 pp; estable.
- Entradas sobre 0,15%: antes 42.86%; ahora 60.98%; cambio +18.12 pp; empeora.
- Desviación media de entrada: antes 0.13%; ahora 0.14%; cambio +0.02 pp; empeora.
- Cierres sobre 0,15%: antes 57.14%; ahora 31.03%; cambio -26.11 pp; mejora.
- Desviación media de cierre: antes 0.17%; ahora 0.11%; cambio -0.06 pp; mejora.
- Latencia de cierre p95: antes 3.45 s; ahora 2.36 s; cambio -1.10 s; mejora.
- Coste por cierre: antes 1.1878 VST; ahora 1.1372 VST; cambio -0.0506 VST; mejora.
- Bruto por cierre: antes -0.8608 VST; ahora -0.6596 VST; cambio +0.2012 VST; mejora.
- Neto por cierre: antes -2.0485 VST; ahora -1.7968 VST; cambio +0.2518 VST; mejora.
- Cobertura de la hoja: antes 100.00%; ahora 82.05%; cambio -17.95 pp; empeora.
- Gap por operación comparable: antes -4.9771 VST; ahora -2.1007 VST; cambio +2.8764 VST; mejora.
- Impacto de entrada por comparable: antes -1.4257 VST; ahora -2.3748 VST; cambio -0.9491 VST; empeora.
- Impacto de salida por comparable: antes -3.5547 VST; ahora 0.2745 VST; cambio +3.8291 VST; mejora.
- Diagnóstico de entrada: El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. El deterioro comparable más claro está en SOL-USDT: 55,6% → 85,7% sobre el umbral. La primera apertura del paquete promedia 0,0558%; las posteriores, 0,1892%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,93 s, mientras que inicio→fill ronda 1,96 s. El cambio de mezcla por posición explica descriptivamente 61% del aumento medio observado. 22/25 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/25, tras reintento.
- Descomposición por fase:
- Fase Señal a cotización: antes 0.05%; ahora 0.07%; cambio +0.0125 pp; empeora.
- Fase Cotización a fill: antes 0.07%; ahora 0.08%; cambio +0.0087 pp; empeora.
- Comparación por activo:
- SUI-USDT: 2 → 3 aperturas; media 0.18% → 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- SOL-USDT: 9 → 14 aperturas; media 0.17% → 0.19%; 85.71% sobre 0,15%; empeora.
- ETH-USDT: 11 → 11 aperturas; media 0.17% → 0.18%; 81.82% sobre 0,15%; empeora.
- BTC-USDT: 13 → 13 aperturas; media 0.04% → 0.05%; 7.69% sobre 0,15%; empeora.
- Comparación por ruta:
- Con espera de reintento: 3 aperturas actuales; media 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- Sin espera de reintento: 38 aperturas actuales; media 0.14%; 57.89% sobre 0,15%; empeora.
- Tiempo observado hasta el fill:
- Reacción hasta el intento: 1.56 s → 1.93 s.
- Inicio del intento a fill: 1.70 s → 1.96 s.
- Latencia total p95: 6.41 s → 32.4 s; 41 aperturas actuales con hora del histórico de BingX.
- Microestructura prospectiva (solo aperturas nuevas):
- Cobertura bid/ask prospectiva: 3/41 aperturas; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; last a precio ejecutable 0.00%; precio ejecutable a fill 0.07%.
- RTT local medio: ticker 167 ms; orden 291 ms; antigüedad mediana de la cotización 166 ms.
- Reloj de bookTicker: 3/3 con marca BingX; BingX a recepción local -422 ms de mediana; recepción local a envío 166 ms; 3 con desfase aparente.
- Secuencia del paquete: 0/41 con cotización inicial; espera media hasta el envío sin datos; movimiento adverso durante la cola sin datos.
- Comparación por posición dentro del paquete:
- Cuarta o posterior: 1 → 2 aperturas; media 0.16% → 0.22%; detección a primer intento 2.92 s; inicio a fill 2.00 s; muestra insuficiente.
- Tercera del paquete: 8 → 11 aperturas; media 0.19% → 0.21%; detección a primer intento 4.01 s; inicio a fill 1.97 s; empeora.
- Segunda del paquete: 11 → 14 aperturas; media 0.16% → 0.17%; detección a primer intento 2.08 s; inicio a fill 1.92 s; empeora.
- Primera del paquete: 15 → 14 aperturas; media 0.06% → 0.06%; detección a primer intento 0.02 s; inicio a fill 1.98 s; empeora.
- Mezcla por posición del paquete: +0.0113 pp; cambio dentro de cada posición: +0.0072 pp; variación observada: +0.0185 pp.
- Proporción descriptiva asociada a la mezcla por posición: 61.00%. Este desglose no se suma al desglose por activo.
- Límite del diagnóstico: Es una asociación descriptiva. Activo y posición dentro del paquete están correlacionados; sus desgloses son lecturas alternativas y no deben sumarse como causas. La microestructura solo se mide en aperturas nuevas con bookTicker fresco y no modifica la ejecución.
- Microestructura prospectiva de cierre (solo cierres explícitos nuevos):
- Cobertura bid/ask prospectiva: 1/29 cierres; 0 instantáneas caducadas.
- Spread medio observado: 0.02%; último precio a ejecutable 0.01%; ejecutable a fill 0.11%.
- RTT local medio: ticker 184 ms; orden 294 ms; antigüedad mediana de la cotización 47 ms.
- Reloj de bookTicker: 1/1 con marca BingX; BingX a recepción local -457 ms de mediana; recepción local a envío 47 ms; 1 con desfase aparente.
- SOL-USDT: 1/10 cierres medidos; ejecutable a fill 0.11%; 0 sobre 0,15%.
- Media neta enlazada: antes -2.0307 VST; ahora -1.7968 VST; diferencia 0.2340 VST por cierre.
- Bootstrap determinista (4000 iteraciones): intervalo del 95% -4.3211 a 4.7784 VST; probabilidad exploratoria de mejora 53.10%; lectura inconclusa.
- Límite: el contraste describe esta muestra. La cobertura parcial y un intervalo que cruce cero impiden afirmar una mejora económica o garantizar rentabilidad futura.

## Estado operativo

- Monitor: ok
- Fase: live
- Posiciones abiertas: 2
- PnL diario: 0.0000
- PnL mensual: 264.0840
- Modo: demo
- Desviación adversa máxima: 0.15%
- Antigüedad máxima de apertura: 5 min
- Distancia máxima del stop: 5.00%
- Lectura Telegram: 5 s
- Recarga Telegram: 30 s
- Puerta de promoción: Bloqueada por fiabilidad
- Criterios pendientes: Muestra de paquetes, Cobertura de aperturas, Paquetes completos, Aperturas perdidas, Neto tras costes
- Reloj REST BingX: +581 ms de offset; RTT 189 ms; antigüedad 58.1 s; warn; solo observación

## Interpretación

El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. La cohorte posterior a las mejoras mide el comportamiento nuevo sin reescribir el histórico. El contraste normaliza las métricas por cierre y muestra su cobertura; una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.
