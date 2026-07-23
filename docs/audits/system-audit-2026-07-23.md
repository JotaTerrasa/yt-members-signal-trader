# Auditoría integral del sistema

Generada: 2026-07-23T03:14:36.560Z
Mes auditado: 2026-07
Ventana: 2026-07-01T10:55:57.218Z a 2026-07-23T03:14:36.941Z

## Resumen ejecutivo

- **HIGH · entry_chasing:** 82 entradas superaron el 0,15% de desviación adversa.
- **HIGH · close_slippage:** 52 cierres superaron el 0,15% de desviación adversa.
- **HIGH · fees_dominate:** Las comisiones acumuladas superan el PnL bruto de BingX.
- **HIGH · market_sign_mismatch:** 15 operaciones terminaron con signo neto contrario a la hoja y la diferencia ya estaba presente antes de costes.
- **HIGH · profit_absorbed_by_costs:** 6 operaciones coincidieron con la hoja en bruto, pero comisiones y funding convirtieron la ganancia VST en pérdida neta.
- **INFO · gross_sign_recovered_after_costs:** 1 operación tuvo signo bruto contrario a la hoja, pero volvió a coincidir en neto después de costes; no forma parte de los cambios de signo neto.
- **HIGH · paired_win_rate_gap:** Sobre las mismas 159 operaciones cerradas, la hoja gana el 74.84% y BingX VST neto el 61.64%; la brecha es de -13.2075 puntos y 21 resultados cambian de signo.
- **INFO · paired_outcome_gap_by_cause:** 15 cambios de signo anteriores a costes aportan -216.4457 VST de brecha y 6 cambios provocados por costes aportan -39.9812 VST.
- **HIGH · same_sign_economic_gap:** 138 operaciones coinciden en signo, pero la réplica suma 367.8335 VST y BingX neto -109.6113 VST; la brecha es -477.4448 VST: -326.4774 VST antes de costes y -150.9674 VST de costes.
- **INFO · historical_close_incidents_isolated:** 7 operaciones están asociadas a incidencias históricas ya corregidas, con un gap observado de -107.3859 VST; no se interpreta como contrafactual recuperable.
- **INFO · openings_recovered_from_exchange:** 3 aperturas ausentes en los eventos locales fueron recuperadas desde BingX.
- **HIGH · sheet_operations_missing:** 18 operaciones de la hoja no tienen apertura VST emparejada. Motivos: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 1 desviación de entrada.
- **HIGH · historical_close_unprocessed:** 1 publicación histórica de cierre no generó evento y afectó a 3 posiciones. La errata CUERRE ya está cubierta por el parser actual.
- **HIGH · reference_stop_divergence:** 8 stops cerraron con signo contrario a la hoja; 33 de 47 stops comparables sí quedaron alineados, 3 divergencias estuvieron precedidas por cierres fallidos por el fallo histórico del guard y esas 5 posiciones terminaron agregadas; 3 divergencias procedieron de cierres no procesados.
- **INFO · sheet_reference_provisional:** La última jornada de la hoja conserva 3 filas abiertas. 3 aperturas VST quedan pendientes de referencia y no se tratan como extras hasta que se publiquen los cierres.
- **HIGH · post_correction_miss:** 1 apertura faltó tras procesar una versión anterior del post. La cohorte conserva el fallo histórico; las correcciones recientes ya se recuperan por la ruta idempotente.
- **INFO · cohort_reliability_improved:** La cohorte actual reduce las incidencias técnicas observadas de 4 a 0 operaciones.
- **HIGH · cohort_entry_execution_worse:** La ejecución de entrada empeora frente a la cohorte anterior: 61,4% superan el 0,15% adverso.
- **HIGH · cohort_net_per_close_negative:** La economía de la cohorte actual sigue siendo negativa: -2,141 VST netos por cierre; contraste inconcluso.
- **INFO · cohort_effect_inconclusive:** El intervalo exploratorio del cambio neto va de -4.4039 a 4.2543 VST por cierre y cruza cero.
- **INFO · entry_execution_attribution:** El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. El deterioro comparable más claro está en SOL-USDT: 55,6% → 86,7% sobre el umbral. La primera apertura del paquete promedia 0,0531%; las posteriores, 0,189%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,91 s, mientras que inicio→fill ronda 1,95 s. El cambio de mezcla por posición explica descriptivamente 66% del aumento medio observado. 24/27 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/27, tras reintento.
- **INFO · rebate_not_detected:** BingX no acredita ninguna devolución de comisiones en el histórico consultado.

## Cobertura de señales

- Aperturas esperadas desde publicaciones: 190
- Ejecutadas: 167
- Bloqueadas: 12
- Sin evento: 0
- Tasa de ejecución: 87.89%
- Razones de bloqueo: {"exchange_stop_loss_invalid":1,"cost_guard_margin_break_even":9,"entry_adverse_deviation_too_high":1,"stop_loss_distance_too_high":1}

## Calidad de ejecución

- Entradas medibles: 167
- Entradas adversas: 151
- Entradas por encima del 0,15%: 82
- Arrastre neto estimado en entradas: 173.2092 VST
- Cierres medibles: 113
- Cierres por encima del 0,15%: 52
- Arrastre neto estimado en cierres: 177.4807 VST

## Réplica y costes

- Filas de la hoja: 180
- Aperturas VST: 170
- Réplica teórica escalada: 540.1042 VST
- PnL bruto BingX: -78.8946 VST
- Comisiones: -177.2317 VST
- Funding: -4.8178 VST
- Neto observado: -260.9440 VST
- Devolución acreditada por BingX: 0.0000 VST (no detectada)
- Tarifa taker observada: 0.05%
- Tarifa maker observada: 0.02%
- Devolución estimada (22%): 38.9910 VST
- Neto hipotético tras devolución estimada: -221.9531 VST
- Ciclos con entradas agregadas: 10 (16 filas)
- Histórico exacto de órdenes: disponible
- Órdenes históricas leídas: 465
- Cierres con fill exacto: 169 de 169
- Órdenes de cierre / posiciones reconstruidas: 165 / 160
- Aperturas recuperadas desde BingX: 3
- Cobertura de eventos locales: 98.24%
- Cierres sin apertura enlazada: 0
- Última operación disponible en la hoja: 2026-07-22T12:00:00.000Z
- Cobertura fiable para comparar hasta: 2026-07-21T23:59:59.999Z
- Cobertura permitida para emparejar hasta: 2026-07-22T23:59:59.999Z
- Última jornada provisional / filas abiertas: sí / 3
- Última apertura VST: 2026-07-22T17:10:43.595Z
- Aperturas VST posteriores sin referencia: 3
- Motivos de aperturas ausentes: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 1 desviación de entrada
- Publicaciones históricas de cierre sin evento: 1
- Posiciones afectadas por cierres no procesados: 3
- Signos netos distintos antes de costes / por costes: 15 / 6
- Brutos de signo distinto / realineados después de costes: 16 / 1
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 159 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: 74.84% / 61.64%
- Brecha de win rate VST - hoja: -13.2075 puntos
- Mismo signo / signo neto distinto: 138 / 21
- Hoja ganadora y VST perdedora / caso inverso: 21 / 0
- Impacto comparable réplica / BingX bruto / BingX neto: 487.5218 / -70.6756 / -246.3499 VST
- Brecha bruta antes de costes: -558.1973 VST
- Costes comparables, comisiones / funding / total: -170.8566 / -4.8178 / -175.6744 VST
- Peso de costes sobre la brecha negativa: 23.94% del gap
- Brecha total BingX neto - réplica: -733.8717 VST
- Brecha por signo distinto antes de costes: 15 operaciones; bruta -198.9333 VST; costes -17.5123 VST; neta -216.4457 VST
- Brecha por signo cambiado por costes: 6 operaciones; bruta -32.7866 VST; costes -7.1946 VST; neta -39.9812 VST
- Brecha por otro cambio neto: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha aunque coincide el signo: 138 operaciones; bruta -326.4774 VST; costes -150.9674 VST; neta -477.4448 VST
- Residual del impacto: 0.0000 VST (reconciliado)
- Impacto SOL-USDT: 50 pares; 6 cambios de signo; réplica 127.4101 VST; brecha bruta -212.3036 VST; costes -55.9116 VST (20.85% del gap); BingX neto -140.8052 VST; brecha neta -268.2152 VST.
- Impacto ETH-USDT: 51 pares; 7 cambios de signo; réplica 226.3713 VST; brecha bruta -204.0369 VST; costes -55.2409 VST (21.31% del gap); BingX neto -32.9064 VST; brecha neta -259.2778 VST.
- Impacto BTC-USDT: 52 pares; 5 cambios de signo; réplica 137.7975 VST; brecha bruta -112.9161 VST; costes -57.6704 VST (33.81% del gap); BingX neto -32.7890 VST; brecha neta -170.5865 VST.
- Impacto SUI-USDT: 6 pares; 3 cambios de signo; réplica -4.0571 VST; brecha bruta -28.9407 VST; costes -6.8515 VST (19.14% del gap); BingX neto -39.8493 VST; brecha neta -35.7922 VST.
- Ejecuciones de entrada > 0,15%: 82 de 170
- Ejecuciones de salida > 0,15%: 52 de 113
- Fuentes de entrada: {"exchange_fill":170,"unavailable":18}
- Fuentes de salida: {"exchange_order_history":169,"unavailable":19}
- Stops comparables alineados / divergentes / con deslizamiento: 33 / 8 / 6
- Stops observados sin hoja comparable: 2
- Stops divergentes precedidos por cierres fallidos: 3
- Stops divergentes por el fallo histórico del guard: 3
- Stops divergentes tras un cierre no procesado: 3
- Stops divergentes en posiciones agregadas: 5
- Clasificación: {"Alineada":12,"Entrada desviada":51,"Stop antes del cierre":2,"Salida desviada":18,"Signo distinto de mercado":7,"No ejecutada en VST":18,"Diferencia de ejecución":31,"Fees dominan":9,"Stop alineado":11,"Ganancia absorbida por costes":6,"Stop con deslizamiento":6,"Cierre no procesado":3,"Cierre fallido antes del stop":3,"Resultado pendiente en hoja":3,"Extra en VST":5,"Fuera de cobertura de la hoja":3}

## Puente contable

- Réplica teórica inicial: 540.1042 VST
- Emparejadas vs hoja (159 operaciones): -558.1973 VST
- No ejecutadas (18 operaciones): -52.5824 VST
- Resultado pendiente en hoja (3 operaciones): 14.4952 VST
- Posteriores sin hoja (3 operaciones): -28.2720 VST
- Extras en cobertura (5 operaciones): 5.5578 VST
- Comisiones: -177.2317 VST
- Funding: -4.8178 VST
- Bruto BingX reconstruido: -78.8946 VST
- Neto BingX reconstruido: -260.9440 VST
- Residual: 0.0000 VST (reconciliado)

## Desglose del gap emparejado

- Operaciones emparejadas / descomponibles: 159 / 159
- Réplica teórica emparejada: 487.5218 VST
- Contabilidad de la hoja: 0.0000 VST
- Diferencia de entrada: -256.1414 VST
- Diferencia de salida: -301.6238 VST
- Cantidad y fills: -0.4322 VST
- Bruto BingX emparejado: -70.6756 VST
- Residual: 0.0000 VST (reconciliado)
- Por activo:
- SOL-USDT: gap -212.3036 VST; entrada -94.2595; salida -117.9812; cantidad/fills -0.0629.
- ETH-USDT: gap -204.0369 VST; entrada -132.0871; salida -71.7900; cantidad/fills -0.1598.
- BTC-USDT: gap -112.9161 VST; entrada -14.7763; salida -97.9535; cantidad/fills -0.1863.
- SUI-USDT: gap -28.9407 VST; entrada -15.0185; salida -13.8991; cantidad/fills -0.0232.

## Rutas causales de salida

- Operaciones emparejadas: 159
- Incidencias históricas ya corregidas: 7
- Reintentos protegidos: 7
- Salidas sin señal local enlazada: 2
- Residual: 0.0000 VST (reconciliado)
- Familias:
- Ejecución observada: 143 operaciones; gap -423.1600 VST; entrada -240.8932 VST; salida -189.8422 VST.
- Incidencia histórica corregida: 7 operaciones; gap -107.3859 VST; entrada -6.6801 VST; salida -93.1546 VST.
- Reintento protegido: 7 operaciones; gap -26.0973 VST; entrada -7.8002 VST; salida -18.2580 VST.
- Evidencia local incompleta: 2 operaciones; gap -1.5542 VST; entrada -0.7680 VST; salida -0.3690 VST.
- Rutas:
- Cierre explícito ejecutado: 102 operaciones; réplica 758.1713 VST; BingX bruto 473.5838 VST; gap -284.5875 VST; 0 intentos fallidos; 0 cierres sin evento.
- Stop antes de otra señal de cierre: 41 operaciones; réplica -416.5241 VST; BingX bruto -555.0966 VST; gap -138.5725 VST; 0 intentos fallidos; 0 cierres sin evento.
- Cierre no procesado; salida posterior por stop: 3 operaciones; réplica 16.8605 VST; BingX bruto -48.5519 VST; gap -65.4125 VST; 0 intentos fallidos; 3 cierres sin evento.
- Error histórico del guard; salida posterior por stop: 3 operaciones; réplica 14.9111 VST; BingX bruto -31.6776 VST; gap -46.5887 VST; 6 intentos fallidos; 0 cierres sin evento.
- Error histórico del guard; cierre recuperado: 1 operaciones; réplica 14.4634 VST; BingX bruto 19.0786 VST; gap 4.6153 VST; 1 intentos fallidos; 0 cierres sin evento.
- Guard de cierre; ejecución posterior: 7 operaciones; réplica 94.6677 VST; BingX bruto 68.5705 VST; gap -26.0973 VST; 157 intentos fallidos; 0 cierres sin evento.
- Salida sin señal local enlazada: 2 operaciones; réplica 4.9719 VST; BingX bruto 3.4177 VST; gap -1.5542 VST; 0 intentos fallidos; 0 cierres sin evento.
- Nota: el gap asociado a una ruta describe lo observado y no equivale a dinero contrafactualmente recuperable.

## Cadena señal, cotización y fill

- Operaciones emparejadas / cadena base completa: 159 / 159
- Entradas con señal y cotización / salidas con objetivo y cotización: 159 / 150
- Contabilidad de la hoja (159 operaciones): 0.0000 VST
- Referencia de entrada (159 operaciones): -28.3553 VST
- Señal a cotización (159 operaciones): -96.3582 VST
- Cotización a fill de entrada (159 operaciones): -131.4279 VST
- Objetivo de salida (154 operaciones): -80.2306 VST
- Objetivo a cotización (150 operaciones): -1.6459 VST
- Cotización a fill de salida (155 operaciones): -200.1392 VST
- Salida sin traza intermedia (9 operaciones): -19.6080 VST
- Cantidad y fills (159 operaciones): -0.4322 VST
- Bruto BingX reconstruido: -70.6756 VST
- Residual: 0.0000 VST (reconciliado)
- Latencia de apertura: mediana 1.90 s, p95 85.3 s, 40 con espera de reintento.
- Latencia de cierre por señal: mediana 0.73 s, p95 3.41 s, 3 con espera de reintento.

## Cohorte posterior a las mejoras

- Inicio: 2026-07-15T07:05:17.987Z
- Muestra: Muestra preliminar (43 cierres)
- Aperturas / cierres: 44 / 43
- Filas comparables / VST posteriores sin referencia: 41 / 3
- Última operación disponible en la hoja: 2026-07-22T12:00:00.000Z
- Última jornada provisional / filas abiertas: sí / 3
- Neto observado: -92.0633 VST
- Comisiones: -47.2171 VST
- Paquetes completos: 15 de 16
- Aperturas esperadas / ejecutadas / faltantes: 48 / 47 / 1
- Faltantes con corrección posterior demostrada: 1
- Motivos de aperturas ausentes: ninguna
- Cierres históricos sin evento / posiciones afectadas: 0 / 0
- Signos netos distintos antes de costes / por costes: 2 / 0
- Brutos de signo distinto / realineados después de costes: 3 / 1
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 35 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: 68.57% / 62.86%
- Brecha de win rate VST - hoja: -5.7143 puntos
- Mismo signo / signo neto distinto: 33 / 2
- Impacto comparable réplica / BingX bruto / BingX neto: 39.5936 / -32.1511 / -72.5583 VST
- Brecha bruta antes de costes: -71.7448 VST
- Costes comparables, comisiones / funding / total: -39.3488 / -1.0584 / -40.4072 VST
- Peso de costes sobre la brecha negativa: 36.03% del gap
- Brecha total BingX neto - réplica: -112.1520 VST
- Brecha por signo distinto antes de costes: 2 operaciones; bruta -8.1445 VST; costes -2.5274 VST; neta -10.6718 VST
- Brecha por signo cambiado por costes: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha por otro cambio neto: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha aunque coincide el signo: 33 operaciones; bruta -63.6003 VST; costes -37.8798 VST; neta -101.4801 VST
- Residual del impacto: 0.0000 VST (reconciliado)
- Impacto SOL-USDT: 12 pares; 1 cambio de signo; réplica 6.3456 VST; brecha bruta -41.7406 VST; costes -14.0064 VST (25.12% del gap); BingX neto -49.4014 VST; brecha neta -55.7470 VST.
- Impacto ETH-USDT: 10 pares; 1 cambio de signo; réplica 5.0914 VST; brecha bruta -16.9896 VST; costes -11.4550 VST (40.27% del gap); BingX neto -23.3532 VST; brecha neta -28.4447 VST.
- Impacto BTC-USDT: 11 pares; 0 cambios de signo; réplica 27.9378 VST; brecha bruta -5.0306 VST; costes -12.6979 VST (71.62% del gap); BingX neto 10.2093 VST; brecha neta -17.7285 VST.
- Impacto SUI-USDT: 2 pares; 0 cambios de signo; réplica 0.2187 VST; brecha bruta -7.9839 VST; costes -2.2479 VST (21.97% del gap); BingX neto -10.0131 VST; brecha neta -10.2318 VST.
- Ejecuciones de entrada / salida > 0,15%: 27 / 10
- Stops comparables alineados / divergentes: 7 / 0
- Divergencias precedidas por cierres fallidos: 0
- Fallos heurísticos de parseo: 0
- Clasificación: {"Entrada desviada":14,"Fees dominan":3,"Stop alineado":2,"Stop con deslizamiento":3,"Diferencia de ejecución":7,"Signo distinto de mercado":2,"Alineada":4,"Resultado pendiente en hoja":3,"Extra en VST":3,"Fuera de cobertura de la hoja":3}

## Contraste antes y después

- Estado: Muestra preliminar. 43/100 cierres para una comparación contrastable.
- Antes: 34 cierres; 34/34 con referencia; 100.00% con precio ejecutado exacto.
- Ahora: 43 cierres; 35/43 con referencia; 100.00% con precio ejecutado exacto.
- Veredicto global: Mejora técnica; rentabilidad no demostrada. Fiabilidad: mejora observada; entradas: empeoramiento observado; cierres: mejora observada. El intervalo del cambio neto cruza cero.
- Lecturas por ámbito:
- Fiabilidad: mejora. 0 incidencias técnicas y 0 cierres sin enlazar en la cohorte actual.
- Entradas: empeora. 61,4% superan el 0,15% adverso.
- Cierres: mejora. Media adversa 0,118%; p95 2,36 s.
- Economía: negativo. -2,141 VST netos por cierre; contraste inconcluso.
- Alineación: mixto. 35/43 cierres comparables con la hoja.
- Métricas normalizadas:
- Incidencias técnicas: antes 11.76%; ahora 0.00%; cambio -11.76 pp; mejora.
- Cobertura de precios exactos: antes 100.00%; ahora 100.00%; cambio 0.00 pp; estable.
- Entradas sobre 0,15%: antes 42.86%; ahora 61.36%; cambio +18.51 pp; empeora.
- Desviación media de entrada: antes 0.13%; ahora 0.14%; cambio +0.02 pp; empeora.
- Cierres sobre 0,15%: antes 57.14%; ahora 32.26%; cambio -24.88 pp; mejora.
- Desviación media de cierre: antes 0.17%; ahora 0.12%; cambio -0.06 pp; mejora.
- Latencia de cierre p95: antes 3.45 s; ahora 2.36 s; cambio -1.10 s; mejora.
- Coste por cierre: antes 1.1878 VST; ahora 1.1227 VST; cambio -0.0651 VST; mejora.
- Bruto por cierre: antes -0.8608 VST; ahora -1.0183 VST; cambio -0.1576 VST; empeora.
- Neto por cierre: antes -2.0485 VST; ahora -2.1410 VST; cambio -0.0925 VST; empeora.
- Cobertura de la hoja: antes 100.00%; ahora 81.40%; cambio -18.60 pp; empeora.
- Gap por operación comparable: antes -4.9771 VST; ahora -2.0499 VST; cambio +2.9272 VST; mejora.
- Impacto de entrada por comparable: antes -1.4257 VST; ahora -2.2731 VST; cambio -0.8474 VST; empeora.
- Impacto de salida por comparable: antes -3.5547 VST; ahora 0.2254 VST; cambio +3.7801 VST; mejora.
- Diagnóstico de entrada: El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. El deterioro comparable más claro está en SOL-USDT: 55,6% → 86,7% sobre el umbral. La primera apertura del paquete promedia 0,0531%; las posteriores, 0,189%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,91 s, mientras que inicio→fill ronda 1,95 s. El cambio de mezcla por posición explica descriptivamente 66% del aumento medio observado. 24/27 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/27, tras reintento.
- Descomposición por fase:
- Fase Señal a cotización: antes 0.05%; ahora 0.07%; cambio +0.0112 pp; empeora.
- Fase Cotización a fill: antes 0.07%; ahora 0.08%; cambio +0.0088 pp; empeora.
- Comparación por activo:
- SUI-USDT: 2 → 3 aperturas; media 0.18% → 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- SOL-USDT: 9 → 15 aperturas; media 0.17% → 0.19%; 86.67% sobre 0,15%; empeora.
- ETH-USDT: 11 → 12 aperturas; media 0.17% → 0.18%; 83.33% sobre 0,15%; empeora.
- BTC-USDT: 13 → 14 aperturas; media 0.04% → 0.05%; 7.14% sobre 0,15%; empeora.
- Comparación por ruta:
- Con espera de reintento: 3 aperturas actuales; media 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- Sin espera de reintento: 41 aperturas actuales; media 0.14%; 58.54% sobre 0,15%; empeora.
- Tiempo observado hasta el fill:
- Reacción hasta el intento: 1.56 s → 1.92 s.
- Inicio del intento a fill: 1.70 s → 1.95 s.
- Latencia total p95: 6.41 s → 7.23 s; 44 aperturas actuales con hora del histórico de BingX.
- Microestructura prospectiva (solo aperturas nuevas):
- Cobertura bid/ask prospectiva: 6/44 aperturas; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; last a precio ejecutable 0.01%; precio ejecutable a fill 0.07%.
- RTT local medio: ticker 173 ms; orden 287 ms; antigüedad mediana de la cotización 162 ms.
- Reloj de bookTicker: 6/6 con marca BingX; BingX a recepción local -422 ms de mediana; recepción local a envío 162 ms; 6 con desfase aparente.
- Secuencia del paquete: 3/44 con cotización inicial; espera media hasta el envío 3198 ms; movimiento adverso durante la cola 0.00%.
- Comparación por posición dentro del paquete:
- Cuarta o posterior: 1 → 2 aperturas; media 0.16% → 0.22%; detección a primer intento 2.92 s; inicio a fill 2.00 s; muestra insuficiente.
- Tercera del paquete: 8 → 12 aperturas; media 0.19% → 0.21%; detección a primer intento 3.97 s; inicio a fill 1.92 s; empeora.
- Segunda del paquete: 11 → 15 aperturas; media 0.16% → 0.17%; detección a primer intento 2.06 s; inicio a fill 1.94 s; empeora.
- Primera del paquete: 15 → 15 aperturas; media 0.06% → 0.05%; detección a primer intento 0.02 s; inicio a fill 1.98 s; mixto.
- Mezcla por posición del paquete: +0.0115 pp; cambio dentro de cada posición: +0.0059 pp; variación observada: +0.0174 pp.
- Proporción descriptiva asociada a la mezcla por posición: 65.97%. Este desglose no se suma al desglose por activo.
- Límite del diagnóstico: Es una asociación descriptiva. Activo y posición dentro del paquete están correlacionados; sus desgloses son lecturas alternativas y no deben sumarse como causas. La microestructura solo se mide en aperturas nuevas con bookTicker fresco y no modifica la ejecución.
- Microestructura prospectiva de cierre (solo cierres explícitos nuevos):
- Cobertura bid/ask prospectiva: 3/31 cierres; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; último precio a ejecutable 0.00%; ejecutable a fill 0.07%.
- RTT local medio: ticker 189 ms; orden 280 ms; antigüedad mediana de la cotización 47 ms.
- Reloj de bookTicker: 3/3 con marca BingX; BingX a recepción local -495 ms de mediana; recepción local a envío 47 ms; 3 con desfase aparente.
- BTC-USDT: 1/11 cierres medidos; ejecutable a fill 0.00%; 0 sobre 0,15%.
- SOL-USDT: 1/10 cierres medidos; ejecutable a fill 0.11%; 0 sobre 0,15%.
- ETH-USDT: 1/8 cierres medidos; ejecutable a fill 0.11%; 0 sobre 0,15%.
- Media neta enlazada: antes -2.0307 VST; ahora -2.1410 VST; diferencia -0.1103 VST por cierre.
- Bootstrap determinista (4000 iteraciones): intervalo del 95% -4.4039 a 4.2543 VST; probabilidad exploratoria de mejora 48.85%; lectura inconclusa.
- Límite: el contraste describe esta muestra. La cobertura parcial y un intervalo que cruce cero impiden afirmar una mejora económica o garantizar rentabilidad futura.

## Puerta de promoción

- Veredicto: No apta para revisión.
- Diagnóstico: Pendiente: muestra, fiabilidad y rentabilidad.
- Revisión humana habilitada: no.
- Promoción automática: no.
- Muestra: recogiendo muestra. 16/50 paquetes.
- Fiabilidad: no cumple. 47/48 aperturas · 1 fallo por corrección posterior.
- Rentabilidad: no cumple. -92,0633 VST · -2,141 VST/cierre · 43 cierres.
- Colas: verificado. 0 aperturas · 0 reintentos.
- Seguridad: verificado. 0 posiciones sin SL · 0 órdenes huérfanas.
- Criterios pendientes: Muestra de paquetes, Cobertura de aperturas, Paquetes completos, Aperturas perdidas, Neto tras costes.

## Estado operativo

- Monitor: ok
- Fase: live
- Posiciones abiertas: 1
- PnL diario: 0.0000
- PnL mensual: 293.1206
- Modo: demo
- Desviación adversa máxima: 0.15%
- Antigüedad máxima de apertura: 5 min
- Distancia máxima del stop: 5.00%
- Lectura Telegram: 5 s
- Recarga Telegram: 30 s
- Reloj REST BingX: +850 ms de offset; RTT 184 ms; antigüedad 62.2 s; warn; solo observación

## Interpretación

El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. La cohorte posterior a las mejoras mide el comportamiento nuevo sin reescribir el histórico. El contraste normaliza las métricas por cierre y muestra su cobertura; una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.
