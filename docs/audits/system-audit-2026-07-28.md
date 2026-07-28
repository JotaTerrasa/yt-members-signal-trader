# Auditoría integral del sistema

Generada: 2026-07-28T07:33:12.873Z
Mes auditado: 2026-07
Ventana: 2026-07-01T10:55:57.218Z a 2026-07-28T07:33:13.400Z

## Resumen ejecutivo

- **HIGH · entry_chasing:** 91 entradas superaron el 0,15% de desviación adversa.
- **HIGH · close_slippage:** 54 cierres superaron el 0,15% de desviación adversa.
- **HIGH · fees_dominate:** Las comisiones acumuladas superan el PnL bruto de BingX.
- **HIGH · market_sign_mismatch:** 17 operaciones terminaron con signo neto contrario a la hoja y la diferencia ya estaba presente antes de costes.
- **HIGH · profit_absorbed_by_costs:** 6 operaciones coincidieron con la hoja en bruto, pero comisiones y funding convirtieron la ganancia VST en pérdida neta.
- **INFO · gross_sign_recovered_after_costs:** 1 operación tuvo signo bruto contrario a la hoja, pero volvió a coincidir en neto después de costes; no forma parte de los cambios de signo neto.
- **HIGH · paired_win_rate_gap:** Sobre las mismas 192 operaciones cerradas, la hoja gana el 71.88% y BingX VST neto el 59.90%; la brecha es de -11.9792 puntos y 23 resultados cambian de signo.
- **INFO · paired_outcome_gap_by_cause:** 17 cambios de signo anteriores a costes aportan -258.3584 VST de brecha y 6 cambios provocados por costes aportan -39.9812 VST.
- **HIGH · same_sign_economic_gap:** 169 operaciones coinciden en signo, pero la réplica suma 336.3922 VST y BingX neto -243.8397 VST; la brecha es -580.2319 VST: -392.8782 VST antes de costes y -187.3537 VST de costes.
- **INFO · historical_close_incidents_isolated:** 7 operaciones están asociadas a incidencias históricas ya corregidas, con un gap observado de -107.3859 VST; no se interpreta como contrafactual recuperable.
- **INFO · openings_recovered_from_exchange:** 3 aperturas ausentes en los eventos locales fueron recuperadas desde BingX.
- **HIGH · sheet_operations_missing:** 20 operaciones de la hoja no tienen apertura VST emparejada. Motivos: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 3 desviación de entrada.
- **HIGH · historical_close_unprocessed:** 1 publicación histórica de cierre no generó evento y afectó a 3 posiciones. La errata CUERRE ya está cubierta por el parser actual.
- **HIGH · reference_stop_divergence:** 10 stops cerraron con signo contrario a la hoja; 43 de 63 stops comparables sí quedaron alineados, 3 divergencias estuvieron precedidas por cierres fallidos por el fallo histórico del guard y esas 5 posiciones terminaron agregadas; 3 divergencias procedieron de cierres no procesados.
- **CRITICAL · post_correction_miss:** 1 apertura faltó tras procesar una versión anterior del post. La cohorte conserva el fallo histórico; las correcciones recientes ya se recuperan por la ruta idempotente.
- **CRITICAL · incomplete_signal_packages:** 2 aperturas faltan en paquetes posteriores a las mejoras sin una corrección posterior que las explique.
- **INFO · cohort_reliability_improved:** La cohorte actual reduce las incidencias técnicas observadas de 4 a 0 operaciones.
- **HIGH · cohort_net_per_close_negative:** La economía de la cohorte actual sigue siendo negativa: -3,322 VST netos por cierre; contraste inconcluso.
- **INFO · cohort_effect_inconclusive:** El intervalo exploratorio del cambio neto va de -5.3868 a 2.7971 VST por cierre y cruza cero.
- **INFO · entry_execution_attribution:** El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. Ningún activo tiene aún una comparación antes/después concluyente. La primera apertura del paquete promedia 0,0533%; las posteriores, 0,1671%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,91 s, mientras que inicio→fill ronda 2,03 s. El cambio de mezcla por posición explica descriptivamente 496,7% del aumento medio observado. 33/36 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/36, tras reintento.
- **INFO · rebate_not_detected:** BingX no acredita ninguna devolución de comisiones en el histórico consultado.

## Cobertura de señales

- Aperturas esperadas desde publicaciones: 219
- Ejecutadas: 194
- Bloqueadas: 14
- Sin evento: 0
- Tasa de ejecución: 88.58%
- Razones de bloqueo: {"exchange_stop_loss_invalid":1,"cost_guard_margin_break_even":9,"entry_adverse_deviation_too_high":3,"stop_loss_distance_too_high":1}

## Calidad de ejecución

- Entradas medibles: 194
- Entradas adversas: 175
- Entradas por encima del 0,15%: 91
- Arrastre neto estimado en entradas: 202.9996 VST
- Cierres medibles: 124
- Cierres por encima del 0,15%: 54
- Arrastre neto estimado en cierres: 186.9924 VST

## Réplica y costes

- Filas de la hoja: 212
- Aperturas VST: 197
- Réplica teórica escalada: 549.5214 VST
- PnL bruto BingX: -188.5322 VST
- Comisiones: -210.3507 VST
- Funding: -6.4362 VST
- Neto observado: -405.3191 VST
- Devolución acreditada por BingX: 0.0000 VST (no detectada)
- Tarifa taker observada: 0.05%
- Tarifa maker observada: 0.02%
- Devolución estimada (22%): 46.2771 VST
- Neto hipotético tras devolución estimada: -359.0420 VST
- Ciclos con entradas agregadas: 10 (16 filas)
- Histórico exacto de órdenes: disponible
- Órdenes históricas leídas: 536
- Cierres con fill exacto: 197 de 197
- Órdenes de cierre / posiciones reconstruidas: 193 / 188
- Aperturas recuperadas desde BingX: 3
- Cobertura de eventos locales: 98.48%
- Cierres sin apertura enlazada: 0
- Última operación disponible en la hoja: 2026-07-27T12:00:00.000Z
- Cobertura fiable para comparar hasta: 2026-07-27T23:59:59.999Z
- Cobertura permitida para emparejar hasta: 2026-07-27T23:59:59.999Z
- Última jornada provisional / filas abiertas: no / 0
- Última apertura VST: 2026-07-27T16:44:23.632Z
- Aperturas VST posteriores sin referencia: 0
- Motivos de aperturas ausentes: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 3 desviación de entrada
- Publicaciones históricas de cierre sin evento: 1
- Posiciones afectadas por cierres no procesados: 3
- Signos netos distintos antes de costes / por costes: 17 / 6
- Brutos de signo distinto / realineados después de costes: 18 / 1
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 192 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: 71.88% / 59.90%
- Brecha de win rate VST - hoja: -11.9792 puntos
- Mismo signo / signo neto distinto: 169 / 23
- Hoja ganadora y VST perdedora / caso inverso: 23 / 0
- Impacto comparable réplica / BingX bruto / BingX neto: 470.1528 / -194.0900 / -408.4187 VST
- Brecha bruta antes de costes: -664.2429 VST
- Costes comparables, comisiones / funding / total: -207.8924 / -6.4362 / -214.3286 VST
- Peso de costes sobre la brecha negativa: 24.40% del gap
- Brecha total BingX neto - réplica: -878.5715 VST
- Brecha por signo distinto antes de costes: 17 operaciones; bruta -238.5781 VST; costes -19.7803 VST; neta -258.3584 VST
- Brecha por signo cambiado por costes: 6 operaciones; bruta -32.7866 VST; costes -7.1946 VST; neta -39.9812 VST
- Brecha por otro cambio neto: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha aunque coincide el signo: 169 operaciones; bruta -392.8782 VST; costes -187.3537 VST; neta -580.2319 VST
- Residual del impacto: 0.0000 VST (reconciliado)
- Impacto SOL-USDT: 61 pares; 7 cambios de signo; réplica 113.7725 VST; brecha bruta -262.6869 VST; costes -68.6564 VST (20.72% del gap); BingX neto -217.5708 VST; brecha neta -331.3433 VST.
- Impacto ETH-USDT: 62 pares; 8 cambios de signo; réplica 227.0898 VST; brecha bruta -255.5587 VST; costes -67.9421 VST (21.00% del gap); BingX neto -96.4110 VST; brecha neta -323.5009 VST.
- Impacto BTC-USDT: 63 pares; 5 cambios de signo; réplica 133.3476 VST; brecha bruta -117.0566 VST; costes -70.8786 VST (37.71% del gap); BingX neto -54.5875 VST; brecha neta -187.9352 VST.
- Impacto SUI-USDT: 6 pares; 3 cambios de signo; réplica -4.0571 VST; brecha bruta -28.9407 VST; costes -6.8515 VST (19.14% del gap); BingX neto -39.8493 VST; brecha neta -35.7922 VST.
- Ejecuciones de entrada > 0,15%: 91 de 197
- Ejecuciones de salida > 0,15%: 54 de 124
- Fuentes de entrada: {"exchange_fill":197,"unavailable":20}
- Fuentes de salida: {"exchange_order_history":197,"unavailable":20}
- Stops comparables alineados / divergentes / con deslizamiento: 43 / 10 / 10
- Stops observados sin hoja comparable: 0
- Stops divergentes precedidos por cierres fallidos: 3
- Stops divergentes por el fallo histórico del guard: 3
- Stops divergentes tras un cierre no procesado: 3
- Stops divergentes en posiciones agregadas: 5
- Clasificación: {"Alineada":14,"Entrada desviada":62,"Stop antes del cierre":4,"Salida desviada":19,"Signo distinto de mercado":7,"No ejecutada en VST":20,"Diferencia de ejecución":38,"Fees dominan":10,"Stop alineado":16,"Ganancia absorbida por costes":6,"Stop con deslizamiento":10,"Cierre no procesado":3,"Cierre fallido antes del stop":3,"Extra en VST":5}

## Puente contable

- Réplica teórica inicial: 549.5214 VST
- Emparejadas vs hoja (192 operaciones): -664.2429 VST
- No ejecutadas (20 operaciones): -79.3686 VST
- Extras en cobertura (5 operaciones): 5.5578 VST
- Comisiones: -210.3507 VST
- Funding: -6.4362 VST
- Bruto BingX reconstruido: -188.5322 VST
- Neto BingX reconstruido: -405.3191 VST
- Residual: 0.0000 VST (reconciliado)

## Desglose del gap emparejado

- Operaciones emparejadas / descomponibles: 192 / 192
- Réplica teórica emparejada: 470.1528 VST
- Contabilidad de la hoja: 0.0000 VST
- Diferencia de entrada: -296.1634 VST
- Diferencia de salida: -367.6240 VST
- Cantidad y fills: -0.4554 VST
- Bruto BingX emparejado: -194.0900 VST
- Residual: 0.0000 VST (reconciliado)
- Por activo:
- SOL-USDT: gap -262.6869 VST; entrada -112.7910; salida -149.7608; cantidad/fills -0.1351.
- ETH-USDT: gap -255.5587 VST; entrada -150.1388; salida -105.2638; cantidad/fills -0.1561.
- BTC-USDT: gap -117.0566 VST; entrada -18.2151; salida -98.7004; cantidad/fills -0.1410.
- SUI-USDT: gap -28.9407 VST; entrada -15.0185; salida -13.8991; cantidad/fills -0.0232.

## Rutas causales de salida

- Operaciones emparejadas: 192
- Incidencias históricas ya corregidas: 7
- Reintentos protegidos: 7
- Salidas sin señal local enlazada: 5
- Residual: 0.0000 VST (reconciliado)
- Familias:
- Ejecución observada: 173 operaciones; gap -522.9366 VST; entrada -277.0329 VST; salida -253.4651 VST.
- Incidencia histórica corregida: 7 operaciones; gap -107.3859 VST; entrada -6.6801 VST; salida -93.1546 VST.
- Reintento protegido: 7 operaciones; gap -26.0973 VST; entrada -7.8002 VST; salida -18.2580 VST.
- Evidencia local incompleta: 5 operaciones; gap -7.8230 VST; entrada -4.6502 VST; salida -2.7464 VST.
- Rutas:
- Cierre explícito ejecutado: 116 operaciones; réplica 851.1174 VST; BingX bruto 534.4658 VST; gap -316.6515 VST; 0 intentos fallidos; 0 cierres sin evento.
- Stop antes de otra señal de cierre: 57 operaciones; réplica -566.4787 VST; BingX bruto -772.7638 VST; gap -206.2851 VST; 0 intentos fallidos; 0 cierres sin evento.
- Cierre no procesado; salida posterior por stop: 3 operaciones; réplica 16.8605 VST; BingX bruto -48.5519 VST; gap -65.4125 VST; 0 intentos fallidos; 3 cierres sin evento.
- Error histórico del guard; salida posterior por stop: 3 operaciones; réplica 14.9111 VST; BingX bruto -31.6776 VST; gap -46.5887 VST; 6 intentos fallidos; 0 cierres sin evento.
- Error histórico del guard; cierre recuperado: 1 operaciones; réplica 14.4634 VST; BingX bruto 19.0786 VST; gap 4.6153 VST; 1 intentos fallidos; 0 cierres sin evento.
- Guard de cierre; ejecución posterior: 7 operaciones; réplica 94.6677 VST; BingX bruto 68.5705 VST; gap -26.0973 VST; 157 intentos fallidos; 0 cierres sin evento.
- Salida sin señal local enlazada: 5 operaciones; réplica 44.6113 VST; BingX bruto 36.7883 VST; gap -7.8230 VST; 0 intentos fallidos; 0 cierres sin evento.
- Nota: el gap asociado a una ruta describe lo observado y no equivale a dinero contrafactualmente recuperable.

## Cadena señal, cotización y fill

- Operaciones emparejadas / cadena base completa: 192 / 192
- Entradas con señal y cotización / salidas con objetivo y cotización: 192 / 180
- Contabilidad de la hoja (192 operaciones): 0.0000 VST
- Referencia de entrada (192 operaciones): -28.3553 VST
- Señal a cotización (192 operaciones): -107.2449 VST
- Cotización a fill de entrada (192 operaciones): -160.5632 VST
- Objetivo de salida (184 operaciones): -117.7582 VST
- Objetivo a cotización (180 operaciones): 33.3020 VST
- Cotización a fill de salida (188 operaciones): -259.9925 VST
- Salida sin traza intermedia (12 operaciones): -23.1753 VST
- Cantidad y fills (192 operaciones): -0.4554 VST
- Bruto BingX reconstruido: -194.0900 VST
- Residual: 0.0000 VST (reconciliado)
- Latencia de apertura: mediana 1.88 s, p95 82.3 s, 40 con espera de reintento.
- Latencia de cierre por señal: mediana 0.73 s, p95 3.06 s, 3 con espera de reintento.

## Cohorte posterior a las mejoras

- Inicio: 2026-07-15T07:05:17.987Z
- Muestra: Muestra preliminar (71 cierres)
- Aperturas / cierres: 71 / 71
- Filas comparables / VST posteriores sin referencia: 73 / 0
- Última operación disponible en la hoja: 2026-07-27T12:00:00.000Z
- Última jornada provisional / filas abiertas: no / 0
- Neto observado: -235.8647 VST
- Comisiones: -79.7623 VST
- Paquetes completos: 24 de 26
- Aperturas esperadas / ejecutadas / faltantes: 77 / 74 / 3
- Faltantes con corrección posterior demostrada: 1
- Motivos de aperturas ausentes: 2 desviación de entrada
- Cierres históricos sin evento / posiciones afectadas: 0 / 0
- Signos netos distintos antes de costes / por costes: 4 / 0
- Brutos de signo distinto / realineados después de costes: 5 / 1
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 68 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: 63.24% / 57.35%
- Brecha de win rate VST - hoja: -5.8824 puntos
- Mismo signo / signo neto distinto: 64 / 4
- Impacto comparable réplica / BingX bruto / BingX neto: 22.2247 / -155.5656 / -234.6271 VST
- Brecha bruta antes de costes: -177.7903 VST
- Costes comparables, comisiones / funding / total: -76.3846 / -2.6768 / -79.0615 VST
- Peso de costes sobre la brecha negativa: 30.78% del gap
- Brecha total BingX neto - réplica: -256.8518 VST
- Brecha por signo distinto antes de costes: 4 operaciones; bruta -47.7892 VST; costes -4.7953 VST; neta -52.5845 VST
- Brecha por signo cambiado por costes: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha por otro cambio neto: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha aunque coincide el signo: 64 operaciones; bruta -130.0011 VST; costes -74.2661 VST; neta -204.2672 VST
- Residual del impacto: 0.0000 VST (reconciliado)
- Impacto SOL-USDT: 23 pares; 2 cambios de signo; réplica -7.2919 VST; brecha bruta -92.1239 VST; costes -26.7511 VST (22.50% del gap); BingX neto -126.1670 VST; brecha neta -118.8750 VST.
- Impacto ETH-USDT: 21 pares; 2 cambios de signo; réplica 5.8099 VST; brecha bruta -68.5115 VST; costes -24.1563 VST (26.07% del gap); BingX neto -86.8578 VST; brecha neta -92.6677 VST.
- Impacto BTC-USDT: 22 pares; 0 cambios de signo; réplica 23.4880 VST; brecha bruta -9.1710 VST; costes -25.9062 VST (73.85% del gap); BingX neto -11.5892 VST; brecha neta -35.0772 VST.
- Impacto SUI-USDT: 2 pares; 0 cambios de signo; réplica 0.2187 VST; brecha bruta -7.9839 VST; costes -2.2479 VST (21.97% del gap); BingX neto -10.0131 VST; brecha neta -10.2318 VST.
- Ejecuciones de entrada / salida > 0,15%: 36 / 12
- Stops comparables alineados / divergentes: 17 / 2
- Divergencias precedidas por cierres fallidos: 0
- Fallos heurísticos de parseo: 0
- Clasificación: {"Entrada desviada":25,"Fees dominan":4,"Stop alineado":7,"Stop con deslizamiento":7,"Diferencia de ejecución":14,"Signo distinto de mercado":2,"Alineada":6,"Salida desviada":1,"Stop antes del cierre":2,"No ejecutada en VST":2,"Extra en VST":3}

## Contraste antes y después

- Estado: Muestra preliminar. 71/100 cierres para una comparación contrastable.
- Antes: 34 cierres; 34/34 con referencia; 100.00% con precio ejecutado exacto.
- Ahora: 71 cierres; 68/71 con referencia; 100.00% con precio ejecutado exacto.
- Veredicto global: Mejora técnica; rentabilidad no demostrada. Fiabilidad: mejora observada; entradas: lectura mixta; cierres: mejora observada. El intervalo del cambio neto cruza cero.
- Lecturas por ámbito:
- Fiabilidad: mejora. 0 incidencias técnicas y 0 cierres sin enlazar en la cohorte actual.
- Entradas: mixto. 50,7% superan el 0,15% adverso.
- Cierres: mejora. Media adversa 0,1087%; p95 2,04 s.
- Economía: negativo. -3,322 VST netos por cierre; contraste inconcluso.
- Alineación: mixto. 68/71 cierres comparables con la hoja.
- Métricas normalizadas:
- Incidencias técnicas: antes 11.76%; ahora 0.00%; cambio -11.76 pp; mejora.
- Cobertura de precios exactos: antes 100.00%; ahora 100.00%; cambio 0.00 pp; estable.
- Entradas sobre 0,15%: antes 42.86%; ahora 50.70%; cambio +7.85 pp; empeora.
- Desviación media de entrada: antes 0.13%; ahora 0.13%; cambio +0.00 pp; estable.
- Cierres sobre 0,15%: antes 57.14%; ahora 28.57%; cambio -28.57 pp; mejora.
- Desviación media de cierre: antes 0.17%; ahora 0.11%; cambio -0.07 pp; mejora.
- Latencia de cierre p95: antes 3.45 s; ahora 2.04 s; cambio -1.41 s; mejora.
- Coste por cierre: antes 1.1878 VST; ahora 1.1611 VST; cambio -0.0266 VST; mejora.
- Bruto por cierre: antes -0.8608 VST; ahora -2.1609 VST; cambio -1.3002 VST; empeora.
- Neto por cierre: antes -2.0485 VST; ahora -3.3220 VST; cambio -1.2735 VST; empeora.
- Cobertura de la hoja: antes 100.00%; ahora 95.77%; cambio -4.23 pp; estable.
- Gap por operación comparable: antes -4.9771 VST; ahora -2.6146 VST; cambio +2.3625 VST; mejora.
- Impacto de entrada por comparable: antes -1.4257 VST; ahora -1.7585 VST; cambio -0.3328 VST; empeora.
- Impacto de salida por comparable: antes -3.5547 VST; ahora -0.8546 VST; cambio +2.7001 VST; mejora.
- Diagnóstico de entrada: El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. Ningún activo tiene aún una comparación antes/después concluyente. La primera apertura del paquete promedia 0,0533%; las posteriores, 0,1671%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,91 s, mientras que inicio→fill ronda 2,03 s. El cambio de mezcla por posición explica descriptivamente 496,7% del aumento medio observado. 33/36 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/36, tras reintento.
- Descomposición por fase:
- Fase Señal a cotización: antes 0.05%; ahora 0.05%; cambio -0.0019 pp; estable.
- Fase Cotización a fill: antes 0.07%; ahora 0.08%; cambio +0.0081 pp; empeora.
- Comparación por activo:
- SUI-USDT: 2 → 3 aperturas; media 0.18% → 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- SOL-USDT: 9 → 24 aperturas; media 0.17% → 0.17%; 70.83% sobre 0,15%; mixto.
- ETH-USDT: 11 → 21 aperturas; media 0.17% → 0.16%; 71.43% sobre 0,15%; mejora.
- BTC-USDT: 13 → 23 aperturas; media 0.04% → 0.04%; 4.35% sobre 0,15%; estable.
- Comparación por ruta:
- Con espera de reintento: 3 aperturas actuales; media 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- Sin espera de reintento: 68 aperturas actuales; media 0.12%; 48.53% sobre 0,15%; empeora.
- Tiempo observado hasta el fill:
- Reacción hasta el intento: 1.56 s → 1.89 s.
- Inicio del intento a fill: 1.70 s → 2.03 s.
- Latencia total p95: 6.41 s → 7.23 s; 71 aperturas actuales con hora del histórico de BingX.
- Microestructura prospectiva (solo aperturas nuevas):
- Cobertura bid/ask prospectiva: 33/71 aperturas; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; last a precio ejecutable 0.01%; precio ejecutable a fill 0.07%.
- RTT local medio: ticker 176 ms; orden 333 ms; antigüedad mediana de la cotización 166 ms.
- Reloj de bookTicker: 33/33 con marca BingX; BingX a recepción local -504 ms de mediana; recepción local a envío 166 ms; 31 con desfase aparente.
- Secuencia del paquete: 30/71 con cotización inicial; espera media hasta el envío 3386 ms; movimiento adverso durante la cola 0.00%.
- Comparación por posición dentro del paquete:
- Cuarta o posterior: 1 → 2 aperturas; media 0.16% → 0.22%; detección a primer intento 2.92 s; inicio a fill 2.00 s; muestra insuficiente.
- Tercera del paquete: 8 → 20 aperturas; media 0.19% → 0.18%; detección a primer intento 3.94 s; inicio a fill 1.97 s; mejora.
- Segunda del paquete: 11 → 24 aperturas; media 0.16% → 0.16%; detección a primer intento 2.05 s; inicio a fill 2.00 s; mixto.
- Primera del paquete: 15 → 25 aperturas; media 0.06% → 0.05%; detección a primer intento 0.02 s; inicio a fill 2.10 s; mixto.
- Mezcla por posición del paquete: +0.0092 pp; cambio dentro de cada posición: -0.0073 pp; variación observada: +0.0019 pp.
- Proporción descriptiva asociada a la mezcla por posición: 496.75%. Este desglose no se suma al desglose por activo.
- Límite del diagnóstico: Es una asociación descriptiva. Activo y posición dentro del paquete están correlacionados; sus desgloses son lecturas alternativas y no deben sumarse como causas. La microestructura solo se mide en aperturas nuevas con bookTicker fresco y no modifica la ejecución.
- Microestructura prospectiva de cierre (solo cierres explícitos nuevos):
- Cobertura bid/ask prospectiva: 14/42 cierres; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; último precio a ejecutable 0.00%; ejecutable a fill 0.07%.
- RTT local medio: ticker 187 ms; orden 270 ms; antigüedad mediana de la cotización 130 ms.
- Reloj de bookTicker: 14/14 con marca BingX; BingX a recepción local -497 ms de mediana; recepción local a envío 130 ms; 12 con desfase aparente.
- BTC-USDT: 6/16 cierres medidos; ejecutable a fill 0.00%; 0 sobre 0,15%.
- SOL-USDT: 4/13 cierres medidos; ejecutable a fill 0.12%; 0 sobre 0,15%.
- ETH-USDT: 4/11 cierres medidos; ejecutable a fill 0.12%; 0 sobre 0,15%.
- Media neta enlazada: antes -2.0307 VST; ahora -3.3220 VST; diferencia -1.2913 VST por cierre.
- Bootstrap determinista (4000 iteraciones): intervalo del 95% -5.3868 a 2.7971 VST; probabilidad exploratoria de mejora 27.48%; lectura inconclusa.
- Límite: el contraste describe esta muestra. La cobertura parcial y un intervalo que cruce cero impiden afirmar una mejora económica o garantizar rentabilidad futura.

## Puerta de promoción

- Veredicto: No apta para revisión.
- Diagnóstico: Pendiente: muestra, fiabilidad y rentabilidad.
- Revisión humana habilitada: no.
- Promoción automática: no.
- Muestra: recogiendo muestra. 26/50 paquetes.
- Fiabilidad: no cumple. 74/77 aperturas · 1 fallo por corrección posterior.
- Rentabilidad: no cumple. -235,8647 VST · -3,322 VST/cierre · 71 cierres.
- Colas: verificado. 0 aperturas · 0 reintentos.
- Seguridad: verificado. 0 posiciones sin SL · 0 órdenes huérfanas.
- Criterios pendientes: Muestra de paquetes, Cobertura de aperturas, Paquetes completos, Aperturas perdidas, Neto tras costes.

## Estado operativo

- Monitor: ok
- Fase: live
- Posiciones abiertas: 0
- PnL diario: 0.0000
- PnL mensual: 203.8751
- Modo: demo
- Desviación adversa máxima: 0.15%
- Antigüedad máxima de apertura: 5 min
- Distancia máxima del stop: 5.00%
- Lectura Telegram: 5 s
- Recarga Telegram: 30 s
- Reloj REST BingX: +379 ms de offset; RTT 176 ms; antigüedad 257.4 s; warn; solo observación

## Interpretación

El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. La cohorte posterior a las mejoras mide el comportamiento nuevo sin reescribir el histórico. El contraste normaliza las métricas por cierre y muestra su cobertura; una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.
