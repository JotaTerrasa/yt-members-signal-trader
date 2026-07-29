# Auditoría integral del sistema

Generada: 2026-07-29T07:32:33.432Z
Mes auditado: 2026-07
Ventana: 2026-07-01T10:55:57.218Z a 2026-07-29T07:32:33.934Z

## Resumen ejecutivo

- **CRITICAL · signals_without_event:** 12 señales no tienen evento de ejecución ni bloqueo.
- **HIGH · entry_chasing:** 91 entradas superaron el 0,15% de desviación adversa.
- **HIGH · close_slippage:** 56 cierres superaron el 0,15% de desviación adversa.
- **HIGH · fees_dominate:** Las comisiones acumuladas superan el PnL bruto de BingX.
- **HIGH · market_sign_mismatch:** 19 operaciones terminaron con signo neto contrario a la hoja y la diferencia ya estaba presente antes de costes.
- **HIGH · profit_absorbed_by_costs:** 6 operaciones coincidieron con la hoja en bruto, pero comisiones y funding convirtieron la ganancia VST en pérdida neta.
- **INFO · gross_sign_recovered_after_costs:** 1 operación tuvo signo bruto contrario a la hoja, pero volvió a coincidir en neto después de costes; no forma parte de los cambios de signo neto.
- **HIGH · paired_win_rate_gap:** Sobre las mismas 199 operaciones cerradas, la hoja gana el 72.36% y BingX VST neto el 59.80%; la brecha es de -12.5628 puntos y 25 resultados cambian de signo.
- **INFO · paired_outcome_gap_by_cause:** 19 cambios de signo anteriores a costes aportan -299.3759 VST de brecha y 6 cambios provocados por costes aportan -39.9812 VST.
- **HIGH · same_sign_economic_gap:** 174 operaciones coinciden en signo, pero la réplica suma 373.1599 VST y BingX neto -224.4932 VST; la brecha es -597.6531 VST: -403.1527 VST antes de costes y -194.5004 VST de costes.
- **INFO · historical_close_incidents_isolated:** 7 operaciones están asociadas a incidencias históricas ya corregidas, con un gap observado de -107.3859 VST; no se interpreta como contrafactual recuperable.
- **INFO · openings_recovered_from_exchange:** 3 aperturas ausentes en los eventos locales fueron recuperadas desde BingX.
- **HIGH · sheet_operations_missing:** 23 operaciones de la hoja no tienen apertura VST emparejada. Motivos: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 6 desviación de entrada.
- **HIGH · historical_close_unprocessed:** 1 publicación histórica de cierre no generó evento y afectó a 3 posiciones. La errata CUERRE ya está cubierta por el parser actual.
- **HIGH · reference_stop_divergence:** 12 stops cerraron con signo contrario a la hoja; 44 de 66 stops comparables sí quedaron alineados, 3 divergencias estuvieron precedidas por cierres fallidos por el fallo histórico del guard y esas 7 posiciones terminaron agregadas; 3 divergencias procedieron de cierres no procesados.
- **CRITICAL · post_correction_miss:** 1 apertura faltó tras procesar una versión anterior del post. La cohorte conserva el fallo histórico; las correcciones recientes ya se recuperan por la ruta idempotente.
- **CRITICAL · incomplete_signal_packages:** 5 aperturas faltan en paquetes posteriores a las mejoras sin una corrección posterior que las explique.
- **INFO · cohort_reliability_improved:** La cohorte actual reduce las incidencias técnicas observadas de 4 a 0 operaciones.
- **HIGH · cohort_net_per_close_negative:** La economía de la cohorte actual sigue siendo negativa: -3,025 VST netos por cierre; contraste inconcluso.
- **INFO · cohort_effect_inconclusive:** El intervalo exploratorio del cambio neto va de -5.1092 a 3.1464 VST por cierre y cruza cero.
- **INFO · entry_execution_attribution:** El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. Ningún activo tiene aún una comparación antes/después concluyente. La primera apertura del paquete promedia 0,0494%; las posteriores, 0,1578%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,91 s, mientras que inicio→fill ronda 1,83 s. El cambio de mezcla por posición explica descriptivamente -151% del aumento medio observado. 35/38 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/38, tras reintento.
- **INFO · rebate_not_detected:** BingX no acredita ninguna devolución de comisiones en el histórico consultado.

## Cobertura de señales

- Aperturas esperadas desde publicaciones: 231
- Ejecutadas: 194
- Bloqueadas: 14
- Sin evento: 12
- Tasa de ejecución: 83.98%
- Razones de bloqueo: {"exchange_stop_loss_invalid":1,"cost_guard_margin_break_even":9,"entry_adverse_deviation_too_high":3,"stop_loss_distance_too_high":1}

## Calidad de ejecución

- Entradas medibles: 194
- Entradas adversas: 175
- Entradas por encima del 0,15%: 91
- Arrastre neto estimado en entradas: 202.9996 VST
- Cierres medibles: 129
- Cierres por encima del 0,15%: 56
- Arrastre neto estimado en cierres: 193.8498 VST

## Réplica y costes

- Filas de la hoja: 224
- Aperturas VST: 208
- Réplica teórica escalada: 634.9007 VST
- PnL bruto BingX: -183.2852 VST
- Comisiones: -223.2595 VST
- Funding: -6.5772 VST
- Neto observado: -413.1220 VST
- Devolución acreditada por BingX: 0.0000 VST (no detectada)
- Tarifa taker observada: 0.05%
- Tarifa maker observada: 0.02%
- Devolución estimada (22%): 49.1171 VST
- Neto hipotético tras devolución estimada: -364.0049 VST
- Ciclos con entradas agregadas: 12 (20 filas)
- Histórico exacto de órdenes: disponible
- Órdenes históricas leídas: 562
- Cierres con fill exacto: 206 de 206
- Órdenes de cierre / posiciones reconstruidas: 202 / 196
- Aperturas recuperadas desde BingX: 3
- Cobertura de eventos locales: 98.56%
- Cierres sin apertura enlazada: 0
- Última operación disponible en la hoja: 2026-07-28T12:00:00.000Z
- Cobertura fiable para comparar hasta: 2026-07-28T23:59:59.999Z
- Cobertura permitida para emparejar hasta: 2026-07-28T23:59:59.999Z
- Última jornada provisional / filas abiertas: no / 0
- Última apertura VST: 2026-07-28T15:30:05.478Z
- Aperturas VST posteriores sin referencia: 0
- Motivos de aperturas ausentes: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 6 desviación de entrada
- Publicaciones históricas de cierre sin evento: 1
- Posiciones afectadas por cierres no procesados: 3
- Signos netos distintos antes de costes / por costes: 19 / 6
- Brutos de signo distinto / realineados después de costes: 20 / 1
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 199 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: 72.36% / 59.80%
- Brecha de win rate VST - hoja: -12.5628 puntos
- Mismo signo / signo neto distinto: 174 / 25
- Hoja ganadora y VST perdedora / caso inverso: 25 / 0
- Impacto comparable réplica / BingX bruto / BingX neto: 521.0530 / -192.2607 / -415.9573 VST
- Brecha bruta antes de costes: -713.3137 VST
- Costes comparables, comisiones / funding / total: -217.2679 / -6.4287 / -223.6966 VST
- Peso de costes sobre la brecha negativa: 23.87% del gap
- Brecha total BingX neto - réplica: -937.0103 VST
- Brecha por signo distinto antes de costes: 19 operaciones; bruta -277.3744 VST; costes -22.0016 VST; neta -299.3759 VST
- Brecha por signo cambiado por costes: 6 operaciones; bruta -32.7866 VST; costes -7.1946 VST; neta -39.9812 VST
- Brecha por otro cambio neto: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha aunque coincide el signo: 174 operaciones; bruta -403.1527 VST; costes -194.5004 VST; neta -597.6531 VST
- Residual del impacto: 0.0000 VST (reconciliado)
- Impacto ETH-USDT: 65 pares; 10 cambios de signo; réplica 259.7505 VST; brecha bruta -300.8109 VST; costes -72.0451 VST (19.32% del gap); BingX neto -113.1054 VST; brecha neta -372.8559 VST.
- Impacto SOL-USDT: 64 pares; 7 cambios de signo; réplica 122.2742 VST; brecha bruta -264.9999 VST; costes -72.0463 VST (21.38% del gap); BingX neto -214.7720 VST; brecha neta -337.0462 VST.
- Impacto BTC-USDT: 64 pares; 5 cambios de signo; réplica 143.0853 VST; brecha bruta -118.5622 VST; costes -72.7538 VST (38.03% del gap); BingX neto -48.2307 VST; brecha neta -191.3160 VST.
- Impacto SUI-USDT: 6 pares; 3 cambios de signo; réplica -4.0571 VST; brecha bruta -28.9407 VST; costes -6.8515 VST (19.14% del gap); BingX neto -39.8493 VST; brecha neta -35.7922 VST.
- Ejecuciones de entrada > 0,15%: 93 de 208
- Ejecuciones de salida > 0,15%: 56 de 129
- Fuentes de entrada: {"exchange_fill":208,"unavailable":23}
- Fuentes de salida: {"exchange_order_history":206,"unavailable":25}
- Stops comparables alineados / divergentes / con deslizamiento: 44 / 12 / 10
- Stops observados sin hoja comparable: 0
- Stops divergentes precedidos por cierres fallidos: 3
- Stops divergentes por el fallo histórico del guard: 3
- Stops divergentes tras un cierre no procesado: 3
- Stops divergentes en posiciones agregadas: 7
- Clasificación: {"Stop antes del cierre":6,"Alineada":14,"Entrada desviada":63,"Salida desviada":20,"Signo distinto de mercado":7,"No ejecutada en VST":23,"Diferencia de ejecución":40,"Fees dominan":10,"Stop alineado":17,"Ganancia absorbida por costes":6,"Stop con deslizamiento":10,"Cierre no procesado":3,"Cierre fallido antes del stop":3,"Abierta o sin cierre":2,"Extra en VST":7}

## Puente contable

- Réplica teórica inicial: 634.9007 VST
- Emparejadas vs hoja (199 operaciones): -713.3137 VST
- No ejecutadas (23 operaciones): -104.0158 VST
- Hoja sin cierre VST (2 operaciones): -9.8319 VST
- Extras en cobertura (7 operaciones): 8.9755 VST
- Comisiones: -223.2595 VST
- Funding: -6.5772 VST
- Bruto BingX reconstruido: -183.2852 VST
- Neto BingX reconstruido: -413.1220 VST
- Residual: 0.0000 VST (reconciliado)

## Desglose del gap emparejado

- Operaciones emparejadas / descomponibles: 199 / 199
- Réplica teórica emparejada: 521.0530 VST
- Contabilidad de la hoja: 0.0000 VST
- Diferencia de entrada: -308.2654 VST
- Diferencia de salida: -404.9661 VST
- Cantidad y fills: -0.0821 VST
- Bruto BingX emparejado: -192.2607 VST
- Residual: 0.0000 VST (reconciliado)
- Por activo:
- ETH-USDT: gap -300.8109 VST; entrada -157.3916; salida -143.4511; cantidad/fills 0.0319.
- SOL-USDT: gap -264.9999 VST; entrada -116.5272; salida -148.3365; cantidad/fills -0.1361.
- BTC-USDT: gap -118.5622 VST; entrada -19.3281; salida -99.2794; cantidad/fills 0.0453.
- SUI-USDT: gap -28.9407 VST; entrada -15.0185; salida -13.8991; cantidad/fills -0.0232.

## Rutas causales de salida

- Operaciones emparejadas: 199
- Incidencias históricas ya corregidas: 7
- Reintentos protegidos: 7
- Salidas sin señal local enlazada: 4
- Residual: 0.0000 VST (reconciliado)
- Familias:
- Ejecución observada: 181 operaciones; gap -576.9456 VST; entrada -288.4751 VST; salida -295.9758 VST.
- Incidencia histórica corregida: 7 operaciones; gap -107.3859 VST; entrada -6.6801 VST; salida -93.1546 VST.
- Reintento protegido: 7 operaciones; gap -26.0973 VST; entrada -7.8002 VST; salida -18.2580 VST.
- Evidencia local incompleta: 4 operaciones; gap -2.8849 VST; entrada -5.3101 VST; salida 2.4222 VST.
- Rutas:
- Cierre explícito ejecutado: 121 operaciones; réplica 893.0019 VST; BingX bruto 562.6598 VST; gap -330.3420 VST; 0 intentos fallidos; 0 cierres sin evento.
- Stop antes de otra señal de cierre: 60 operaciones; réplica -564.4593 VST; BingX bruto -811.0628 VST; gap -246.6035 VST; 0 intentos fallidos; 0 cierres sin evento.
- Cierre no procesado; salida posterior por stop: 3 operaciones; réplica 16.8605 VST; BingX bruto -48.5519 VST; gap -65.4125 VST; 0 intentos fallidos; 3 cierres sin evento.
- Error histórico del guard; salida posterior por stop: 3 operaciones; réplica 14.9111 VST; BingX bruto -31.6776 VST; gap -46.5887 VST; 6 intentos fallidos; 0 cierres sin evento.
- Error histórico del guard; cierre recuperado: 1 operaciones; réplica 14.4634 VST; BingX bruto 19.0786 VST; gap 4.6153 VST; 1 intentos fallidos; 0 cierres sin evento.
- Guard de cierre; ejecución posterior: 7 operaciones; réplica 94.6677 VST; BingX bruto 68.5705 VST; gap -26.0973 VST; 157 intentos fallidos; 0 cierres sin evento.
- Salida sin señal local enlazada: 4 operaciones; réplica 51.6075 VST; BingX bruto 48.7227 VST; gap -2.8849 VST; 0 intentos fallidos; 0 cierres sin evento.
- Nota: el gap asociado a una ruta describe lo observado y no equivale a dinero contrafactualmente recuperable.

## Cadena señal, cotización y fill

- Operaciones emparejadas / cadena base completa: 199 / 199
- Entradas con señal y cotización / salidas con objetivo y cotización: 199 / 188
- Contabilidad de la hoja (199 operaciones): 0.0000 VST
- Referencia de entrada (199 operaciones): -32.4665 VST
- Señal a cotización (199 operaciones): -106.7074 VST
- Cotización a fill de entrada (199 operaciones): -169.0915 VST
- Objetivo de salida (192 operaciones): -149.5296 VST
- Objetivo a cotización (188 operaciones): 36.3578 VST
- Cotización a fill de salida (195 operaciones): -274.1859 VST
- Salida sin traza intermedia (11 operaciones): -17.6084 VST
- Cantidad y fills (199 operaciones): -0.0821 VST
- Bruto BingX reconstruido: -192.2607 VST
- Residual: 0.0000 VST (reconciliado)
- Latencia de apertura: mediana 1.90 s, p95 82.0 s, 42 con espera de reintento.
- Latencia de cierre por señal: mediana 0.78 s, p95 3.06 s, 3 con espera de reintento.

## Cohorte posterior a las mejoras

- Inicio: 2026-07-15T07:05:17.987Z
- Muestra: Muestra preliminar (80 cierres)
- Aperturas / cierres: 82 / 80
- Filas comparables / VST posteriores sin referencia: 87 / 0
- Última operación disponible en la hoja: 2026-07-28T12:00:00.000Z
- Última jornada provisional / filas abiertas: no / 0
- Neto observado: -242.0019 VST
- Comisiones: -91.0055 VST
- Paquetes completos: 27 de 30
- Aperturas esperadas / ejecutadas / faltantes: 89 / 83 / 6
- Faltantes con corrección posterior demostrada: 1
- Motivos de aperturas ausentes: 5 desviación de entrada
- Cierres históricos sin evento / posiciones afectadas: 0 / 0
- Signos netos distintos antes de costes / por costes: 6 / 0
- Brutos de signo distinto / realineados después de costes: 7 / 1
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 77 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: 66.23% / 58.44%
- Brecha de win rate VST - hoja: -7.7922 puntos
- Mismo signo / signo neto distinto: 71 / 6
- Impacto comparable réplica / BingX bruto / BingX neto: 78.0967 / -150.3186 / -239.4939 VST
- Brecha bruta antes de costes: -228.4153 VST
- Costes comparables, comisiones / funding / total: -86.5059 / -2.6694 / -89.1753 VST
- Peso de costes sobre la brecha negativa: 28.08% del gap
- Brecha total BingX neto - réplica: -317.5906 VST
- Brecha por signo distinto antes de costes: 6 operaciones; bruta -86.5855 VST; costes -7.0166 VST; neta -93.6021 VST
- Brecha por signo cambiado por costes: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha por otro cambio neto: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha aunque coincide el signo: 71 operaciones; bruta -141.8298 VST; costes -82.1586 VST; neta -223.9884 VST
- Residual del impacto: 0.0000 VST (reconciliado)
- Impacto ETH-USDT: 25 pares; 4 cambios de signo; réplica 40.8577 VST; brecha bruta -114.7619 VST; costes -28.6346 VST (19.97% del gap); BingX neto -102.5389 VST; brecha neta -143.3965 VST.
- Impacto SOL-USDT: 26 pares; 2 cambios de signo; réplica 1.2098 VST; brecha bruta -94.4369 VST; costes -30.1411 VST (24.19% del gap); BingX neto -123.3681 VST; brecha neta -124.5779 VST.
- Impacto BTC-USDT: 24 pares; 0 cambios de signo; réplica 35.8104 VST; brecha bruta -11.2325 VST; costes -28.1517 VST (71.48% del gap); BingX neto -3.5738 VST; brecha neta -39.3843 VST.
- Impacto SUI-USDT: 2 pares; 0 cambios de signo; réplica 0.2187 VST; brecha bruta -7.9839 VST; costes -2.2479 VST (21.97% del gap); BingX neto -10.0131 VST; brecha neta -10.2318 VST.
- Ejecuciones de entrada / salida > 0,15%: 38 / 14
- Stops comparables alineados / divergentes: 18 / 4
- Divergencias precedidas por cierres fallidos: 0
- Fallos heurísticos de parseo: 0
- Clasificación: {"Entrada desviada":27,"Fees dominan":4,"Stop alineado":8,"Stop con deslizamiento":7,"Diferencia de ejecución":16,"Signo distinto de mercado":2,"Alineada":7,"Salida desviada":2,"Stop antes del cierre":4,"No ejecutada en VST":5,"Abierta o sin cierre":2,"Extra en VST":3}

## Contraste antes y después

- Estado: Muestra preliminar. 80/100 cierres para una comparación contrastable.
- Antes: 34 cierres; 34/34 con referencia; 100.00% con precio ejecutado exacto.
- Ahora: 80 cierres; 77/80 con referencia; 100.00% con precio ejecutado exacto.
- Veredicto global: Mejora técnica; rentabilidad no demostrada. Fiabilidad: mejora observada; entradas: lectura mixta; cierres: mejora observada. El intervalo del cambio neto cruza cero.
- Lecturas por ámbito:
- Fiabilidad: mejora. 0 incidencias técnicas y 0 cierres sin enlazar en la cohorte actual.
- Entradas: mixto. 46,3% superan el 0,15% adverso.
- Cierres: mejora. Media adversa 0,1101%; p95 2,04 s.
- Economía: negativo. -3,025 VST netos por cierre; contraste inconcluso.
- Alineación: mixto. 77/80 cierres comparables con la hoja.
- Métricas normalizadas:
- Incidencias técnicas: antes 11.76%; ahora 0.00%; cambio -11.76 pp; mejora.
- Cobertura de precios exactos: antes 100.00%; ahora 100.00%; cambio 0.00 pp; estable.
- Entradas sobre 0,15%: antes 42.86%; ahora 46.34%; cambio +3.48 pp; empeora.
- Desviación media de entrada: antes 0.13%; ahora 0.12%; cambio -0.01 pp; mejora.
- Cierres sobre 0,15%: antes 57.14%; ahora 29.79%; cambio -27.36 pp; mejora.
- Desviación media de cierre: antes 0.17%; ahora 0.11%; cambio -0.06 pp; mejora.
- Latencia de cierre p95: antes 3.45 s; ahora 2.04 s; cambio -1.41 s; mejora.
- Coste por cierre: antes 1.1878 VST; ahora 1.1728 VST; cambio -0.0150 VST; estable.
- Bruto por cierre: antes -0.8608 VST; ahora -1.8522 VST; cambio -0.9915 VST; empeora.
- Neto por cierre: antes -2.0485 VST; ahora -3.0250 VST; cambio -0.9765 VST; empeora.
- Cobertura de la hoja: antes 100.00%; ahora 96.25%; cambio -3.75 pp; estable.
- Gap por operación comparable: antes -4.9771 VST; ahora -2.9664 VST; cambio +2.0106 VST; mejora.
- Impacto de entrada por comparable: antes -1.4257 VST; ahora -1.7201 VST; cambio -0.2944 VST; empeora.
- Impacto de salida por comparable: antes -3.5547 VST; ahora -1.2444 VST; cambio +2.3102 VST; mejora.
- Diagnóstico de entrada: El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. Ningún activo tiene aún una comparación antes/después concluyente. La primera apertura del paquete promedia 0,0494%; las posteriores, 0,1578%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,91 s, mientras que inicio→fill ronda 1,83 s. El cambio de mezcla por posición explica descriptivamente -151% del aumento medio observado. 35/38 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/38, tras reintento.
- Descomposición por fase:
- Fase Señal a cotización: antes 0.05%; ahora 0.05%; cambio -0.0055 pp; mejora.
- Fase Cotización a fill: antes 0.07%; ahora 0.08%; cambio +0.0074 pp; empeora.
- Comparación por activo:
- SUI-USDT: 2 → 3 aperturas; media 0.18% → 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- SOL-USDT: 9 → 27 aperturas; media 0.17% → 0.16%; 66.67% sobre 0,15%; mixto.
- ETH-USDT: 11 → 25 aperturas; media 0.17% → 0.15%; 64.00% sobre 0,15%; mejora.
- BTC-USDT: 13 → 27 aperturas; media 0.04% → 0.04%; 3.70% sobre 0,15%; estable.
- Comparación por ruta:
- Con espera de reintento: 5 aperturas actuales; media 0.14%; 60.00% sobre 0,15%; muestra insuficiente.
- Sin espera de reintento: 77 aperturas actuales; media 0.12%; 45.45% sobre 0,15%; empeora.
- Tiempo observado hasta el fill:
- Reacción hasta el intento: 1.56 s → 1.89 s.
- Inicio del intento a fill: 1.70 s → 1.83 s.
- Latencia total p95: 6.41 s → 7.40 s; 82 aperturas actuales con hora del histórico de BingX.
- Microestructura prospectiva (solo aperturas nuevas):
- Cobertura bid/ask prospectiva: 44/82 aperturas; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; last a precio ejecutable 0.01%; precio ejecutable a fill 0.07%.
- RTT local medio: ticker 181 ms; orden 338 ms; antigüedad mediana de la cotización 162 ms.
- Reloj de bookTicker: 44/44 con marca BingX; BingX a recepción local -469 ms de mediana; recepción local a envío 162 ms; 31 con desfase aparente.
- Secuencia del paquete: 39/82 con cotización inicial; espera media hasta el envío 3416 ms; movimiento adverso durante la cola 0.00%.
- Comparación por posición dentro del paquete:
- Cuarta o posterior: 1 → 2 aperturas; media 0.16% → 0.22%; detección a primer intento 2.92 s; inicio a fill 2.00 s; muestra insuficiente.
- Tercera del paquete: 8 → 23 aperturas; media 0.19% → 0.17%; detección a primer intento 3.94 s; inicio a fill 1.75 s; mejora.
- Segunda del paquete: 11 → 28 aperturas; media 0.16% → 0.15%; detección a primer intento 2.05 s; inicio a fill 1.78 s; mejora.
- Primera del paquete: 15 → 29 aperturas; media 0.06% → 0.05%; detección a primer intento 0.02 s; inicio a fill 1.93 s; mejora.
- Mezcla por posición del paquete: +0.0087 pp; cambio dentro de cada posición: -0.0144 pp; variación observada: -0.0057 pp.
- Proporción descriptiva asociada a la mezcla por posición: -150.99%. Este desglose no se suma al desglose por activo.
- Límite del diagnóstico: Es una asociación descriptiva. Activo y posición dentro del paquete están correlacionados; sus desgloses son lecturas alternativas y no deben sumarse como causas. La microestructura solo se mide en aperturas nuevas con bookTicker fresco y no modifica la ejecución.
- Microestructura prospectiva de cierre (solo cierres explícitos nuevos):
- Cobertura bid/ask prospectiva: 19/47 cierres; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; último precio a ejecutable 0.00%; ejecutable a fill 0.08%.
- RTT local medio: ticker 187 ms; orden 272 ms; antigüedad mediana de la cotización 130 ms.
- Reloj de bookTicker: 19/19 con marca BingX; BingX a recepción local -487 ms de mediana; recepción local a envío 130 ms; 12 con desfase aparente.
- BTC-USDT: 8/18 cierres medidos; ejecutable a fill 0.00%; 0 sobre 0,15%.
- SOL-USDT: 5/14 cierres medidos; ejecutable a fill 0.12%; 0 sobre 0,15%.
- ETH-USDT: 6/13 cierres medidos; ejecutable a fill 0.14%; 2 sobre 0,15%.
- Media neta enlazada: antes -2.0307 VST; ahora -3.0091 VST; diferencia -0.9784 VST por cierre.
- Bootstrap determinista (4000 iteraciones): intervalo del 95% -5.1092 a 3.1464 VST; probabilidad exploratoria de mejora 31.80%; lectura inconclusa.
- Límite: el contraste describe esta muestra. La cobertura parcial y un intervalo que cruce cero impiden afirmar una mejora económica o garantizar rentabilidad futura.

## Puerta de promoción

- Veredicto: No apta para revisión.
- Diagnóstico: Pendiente: muestra, fiabilidad y rentabilidad.
- Revisión humana habilitada: no.
- Promoción automática: no.
- Muestra: recogiendo muestra. 30/50 paquetes.
- Fiabilidad: no cumple. 83/89 aperturas · 1 fallo por corrección posterior.
- Rentabilidad: no cumple. -242,0019 VST · -3,025 VST/cierre · 80 cierres.
- Colas: verificado. 0 aperturas · 0 reintentos.
- Seguridad: verificado. 0 posiciones sin SL · 0 órdenes huérfanas.
- Criterios pendientes: Muestra de paquetes, Cobertura de aperturas, Paquetes completos, Aperturas perdidas, Neto tras costes.

## Estado operativo

- Monitor: ok
- Fase: live
- Posiciones abiertas: 1
- PnL diario: 0.0000
- PnL mensual: 339.8780
- Modo: demo
- Desviación adversa máxima: 0.15%
- Antigüedad máxima de apertura: 5 min
- Distancia máxima del stop: 5.00%
- Lectura Telegram: 5 s
- Recarga Telegram: 30 s
- Reloj REST BingX: -335 ms de offset; RTT 179 ms; antigüedad 21.7 s; warn; solo observación

## Interpretación

El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. La cohorte posterior a las mejoras mide el comportamiento nuevo sin reescribir el histórico. El contraste normaliza las métricas por cierre y muestra su cobertura; una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.
