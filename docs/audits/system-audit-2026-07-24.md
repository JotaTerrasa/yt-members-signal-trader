# Auditoría integral del sistema

Generada: 2026-07-24T07:31:52.183Z
Mes auditado: 2026-07
Ventana: 2026-07-01T10:55:57.218Z a 2026-07-24T07:31:52.597Z

## Resumen ejecutivo

- **HIGH · entry_chasing:** 85 entradas superaron el 0,15% de desviación adversa.
- **HIGH · close_slippage:** 52 cierres superaron el 0,15% de desviación adversa.
- **HIGH · fees_dominate:** Las comisiones acumuladas superan el PnL bruto de BingX.
- **HIGH · market_sign_mismatch:** 18 operaciones terminaron con signo neto contrario a la hoja y la diferencia ya estaba presente antes de costes.
- **HIGH · profit_absorbed_by_costs:** 6 operaciones coincidieron con la hoja en bruto, pero comisiones y funding convirtieron la ganancia VST en pérdida neta.
- **INFO · gross_sign_recovered_after_costs:** 1 operación tuvo signo bruto contrario a la hoja, pero volvió a coincidir en neto después de costes; no forma parte de los cambios de signo neto.
- **HIGH · paired_win_rate_gap:** Sobre las mismas 164 operaciones cerradas, la hoja gana el 72.56% y BingX VST neto el 61.59%; la brecha es de -10.9756 puntos y 24 resultados cambian de signo.
- **INFO · paired_outcome_gap_by_cause:** 18 cambios de signo anteriores a costes aportan -176.1430 VST de brecha y 6 cambios provocados por costes aportan -39.9812 VST.
- **HIGH · same_sign_economic_gap:** 140 operaciones coinciden en signo, pero la réplica suma 343.6641 VST y BingX neto -140.5889 VST; la brecha es -484.2530 VST: -331.0419 VST antes de costes y -153.2111 VST de costes.
- **INFO · historical_close_incidents_isolated:** 7 operaciones están asociadas a incidencias históricas ya corregidas, con un gap observado de -107.3859 VST; no se interpreta como contrafactual recuperable.
- **INFO · openings_recovered_from_exchange:** 3 aperturas ausentes en los eventos locales fueron recuperadas desde BingX.
- **HIGH · sheet_operations_missing:** 18 operaciones de la hoja no tienen apertura VST emparejada. Motivos: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 1 desviación de entrada.
- **HIGH · historical_close_unprocessed:** 1 publicación histórica de cierre no generó evento y afectó a 3 posiciones. La errata CUERRE ya está cubierta por el parser actual.
- **HIGH · reference_stop_divergence:** 8 stops cerraron con signo contrario a la hoja; 35 de 49 stops comparables sí quedaron alineados, 3 divergencias estuvieron precedidas por cierres fallidos por el fallo histórico del guard y esas 5 posiciones terminaron agregadas; 3 divergencias procedieron de cierres no procesados.
- **HIGH · post_correction_miss:** 1 apertura faltó tras procesar una versión anterior del post. La cohorte conserva el fallo histórico; las correcciones recientes ya se recuperan por la ruta idempotente.
- **INFO · cohort_reliability_improved:** La cohorte actual reduce las incidencias técnicas observadas de 4 a 0 operaciones.
- **HIGH · cohort_entry_execution_worse:** La ejecución de entrada empeora frente a la cohorte anterior: 61,2% superan el 0,15% adverso.
- **HIGH · cohort_net_per_close_negative:** La economía de la cohorte actual sigue siendo negativa: -3,2801 VST netos por cierre; contraste inconcluso.
- **INFO · cohort_effect_inconclusive:** El intervalo exploratorio del cambio neto va de -5.5063 a 3.2920 VST por cierre y cruza cero.
- **INFO · entry_execution_attribution:** El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. El deterioro comparable más claro está en SOL-USDT: 55,6% → 82,4% sobre el umbral. La primera apertura del paquete promedia 0,059%; las posteriores, 0,1857%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,88 s, mientras que inicio→fill ronda 1,96 s. El cambio de mezcla por posición explica descriptivamente 61,2% del aumento medio observado. 27/30 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/30, tras reintento.
- **INFO · rebate_not_detected:** BingX no acredita ninguna devolución de comisiones en el histórico consultado.

## Cobertura de señales

- Aperturas esperadas desde publicaciones: 195
- Ejecutadas: 172
- Bloqueadas: 12
- Sin evento: 0
- Tasa de ejecución: 88.21%
- Razones de bloqueo: {"exchange_stop_loss_invalid":1,"cost_guard_margin_break_even":9,"entry_adverse_deviation_too_high":1,"stop_loss_distance_too_high":1}

## Calidad de ejecución

- Entradas medibles: 172
- Entradas adversas: 155
- Entradas por encima del 0,15%: 85
- Arrastre neto estimado en entradas: 180.3888 VST
- Cierres medibles: 113
- Cierres por encima del 0,15%: 52
- Arrastre neto estimado en cierres: 177.4807 VST

## Réplica y costes

- Filas de la hoja: 183
- Aperturas VST: 175
- Réplica teórica escalada: 476.3872 VST
- PnL bruto BingX: -134.0960 VST
- Comisiones: -185.6311 VST
- Funding: -5.0003 VST
- Neto observado: -324.7274 VST
- Devolución acreditada por BingX: 0.0000 VST (no detectada)
- Tarifa taker observada: 0.05%
- Tarifa maker observada: 0.02%
- Devolución estimada (22%): 40.8388 VST
- Neto hipotético tras devolución estimada: -283.8885 VST
- Ciclos con entradas agregadas: 10 (16 filas)
- Histórico exacto de órdenes: disponible
- Órdenes históricas leídas: 474
- Cierres con fill exacto: 173 de 173
- Órdenes de cierre / posiciones reconstruidas: 169 / 164
- Aperturas recuperadas desde BingX: 3
- Cobertura de eventos locales: 98.29%
- Cierres sin apertura enlazada: 0
- Última operación disponible en la hoja: 2026-07-23T12:00:00.000Z
- Cobertura fiable para comparar hasta: 2026-07-23T23:59:59.999Z
- Cobertura permitida para emparejar hasta: 2026-07-23T23:59:59.999Z
- Última jornada provisional / filas abiertas: no / 0
- Última apertura VST: 2026-07-23T18:54:14.767Z
- Aperturas VST posteriores sin referencia: 0
- Motivos de aperturas ausentes: 5 stop inválido, 9 filtro de costes, 3 margen VST insuficiente, 1 desviación de entrada
- Publicaciones históricas de cierre sin evento: 1
- Posiciones afectadas por cierres no procesados: 3
- Signos netos distintos antes de costes / por costes: 18 / 6
- Brutos de signo distinto / realineados después de costes: 19 / 1
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 164 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: 72.56% / 61.59%
- Brecha de win rate VST - hoja: -10.9756 puntos
- Mismo signo / signo neto distinto: 140 / 24
- Hoja ganadora y VST perdedora / caso inverso: 21 / 3
- Impacto comparable réplica / BingX bruto / BingX neto: 434.1392 / -84.9142 / -266.2381 VST
- Brecha bruta antes de costes: -519.0534 VST
- Costes comparables, comisiones / funding / total: -176.4727 / -4.8511 / -181.3239 VST
- Peso de costes sobre la brecha negativa: 25.89% del gap
- Brecha total BingX neto - réplica: -700.3772 VST
- Brecha por signo distinto antes de costes: 18 operaciones; bruta -155.2249 VST; costes -20.9181 VST; neta -176.1430 VST
- Brecha por signo cambiado por costes: 6 operaciones; bruta -32.7866 VST; costes -7.1946 VST; neta -39.9812 VST
- Brecha por otro cambio neto: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha aunque coincide el signo: 140 operaciones; bruta -331.0419 VST; costes -153.2111 VST; neta -484.2530 VST
- Residual del impacto: 0.0000 VST (reconciliado)
- Impacto SOL-USDT: 52 pares; 7 cambios de signo; réplica 104.3793 VST; brecha bruta -198.2762 VST; costes -58.1592 VST (22.68% del gap); BingX neto -152.0560 VST; brecha neta -256.4353 VST.
- Impacto ETH-USDT: 53 pares; 8 cambios de signo; réplica 202.3218 VST; brecha bruta -190.8798 VST; costes -57.4805 VST (23.14% del gap); BingX neto -46.0386 VST; brecha neta -248.3603 VST.
- Impacto BTC-USDT: 53 pares; 6 cambios de signo; réplica 131.4952 VST; brecha bruta -100.9567 VST; costes -58.8326 VST (36.82% del gap); BingX neto -28.2942 VST; brecha neta -159.7894 VST.
- Impacto SUI-USDT: 6 pares; 3 cambios de signo; réplica -4.0571 VST; brecha bruta -28.9407 VST; costes -6.8515 VST (19.14% del gap); BingX neto -39.8493 VST; brecha neta -35.7922 VST.
- Ejecuciones de entrada > 0,15%: 85 de 175
- Ejecuciones de salida > 0,15%: 52 de 113
- Fuentes de entrada: {"exchange_fill":175,"unavailable":18}
- Fuentes de salida: {"exchange_order_history":173,"unavailable":20}
- Stops comparables alineados / divergentes / con deslizamiento: 35 / 8 / 6
- Stops observados sin hoja comparable: 4
- Stops divergentes precedidos por cierres fallidos: 3
- Stops divergentes por el fallo histórico del guard: 3
- Stops divergentes tras un cierre no procesado: 3
- Stops divergentes en posiciones agregadas: 5
- Clasificación: {"Alineada":12,"Entrada desviada":52,"Stop antes del cierre":2,"Salida desviada":18,"Signo distinto de mercado":10,"No ejecutada en VST":18,"Diferencia de ejecución":31,"Fees dominan":9,"Stop alineado":12,"Ganancia absorbida por costes":6,"Stop con deslizamiento":6,"Cierre no procesado":3,"Cierre fallido antes del stop":3,"Abierta o sin cierre":1,"Extra en VST":10}

## Puente contable

- Réplica teórica inicial: 476.3872 VST
- Emparejadas vs hoja (164 operaciones): -519.0534 VST
- No ejecutadas (18 operaciones): -52.5824 VST
- Hoja sin cierre VST (1 operaciones): 10.3344 VST
- Extras en cobertura (10 operaciones): -49.1818 VST
- Comisiones: -185.6311 VST
- Funding: -5.0003 VST
- Bruto BingX reconstruido: -134.0960 VST
- Neto BingX reconstruido: -324.7274 VST
- Residual: 0.0000 VST (reconciliado)

## Desglose del gap emparejado

- Operaciones emparejadas / descomponibles: 164 / 164
- Réplica teórica emparejada: 434.1392 VST
- Contabilidad de la hoja: 0.0000 VST
- Diferencia de entrada: -265.5246 VST
- Diferencia de salida: -253.0605 VST
- Cantidad y fills: -0.4683 VST
- Bruto BingX emparejado: -84.9142 VST
- Residual: -0.0000 VST (reconciliado)
- Por activo:
- SOL-USDT: gap -198.2762 VST; entrada -98.6492; salida -99.5544; cantidad/fills -0.0726.
- ETH-USDT: gap -190.8798 VST; entrada -136.4508; salida -54.2666; cantidad/fills -0.1624.
- BTC-USDT: gap -100.9567 VST; entrada -15.4062; salida -85.3405; cantidad/fills -0.2100.
- SUI-USDT: gap -28.9407 VST; entrada -15.0185; salida -13.8991; cantidad/fills -0.0232.

## Rutas causales de salida

- Operaciones emparejadas: 164
- Incidencias históricas ya corregidas: 7
- Reintentos protegidos: 7
- Salidas sin señal local enlazada: 2
- Residual: 0.0000 VST (reconciliado)
- Familias:
- Ejecución observada: 148 operaciones; gap -384.0160 VST; entrada -250.2764 VST; salida -141.2789 VST.
- Incidencia histórica corregida: 7 operaciones; gap -107.3859 VST; entrada -6.6801 VST; salida -93.1546 VST.
- Reintento protegido: 7 operaciones; gap -26.0973 VST; entrada -7.8002 VST; salida -18.2580 VST.
- Evidencia local incompleta: 2 operaciones; gap -1.5542 VST; entrada -0.7680 VST; salida -0.3690 VST.
- Rutas:
- Cierre explícito ejecutado: 105 operaciones; réplica 728.9580 VST; BingX bruto 488.0790 VST; gap -240.8790 VST; 0 intentos fallidos; 0 cierres sin evento.
- Stop antes de otra señal de cierre: 43 operaciones; réplica -440.6935 VST; BingX bruto -583.8305 VST; gap -143.1370 VST; 0 intentos fallidos; 0 cierres sin evento.
- Cierre no procesado; salida posterior por stop: 3 operaciones; réplica 16.8605 VST; BingX bruto -48.5519 VST; gap -65.4125 VST; 0 intentos fallidos; 3 cierres sin evento.
- Error histórico del guard; salida posterior por stop: 3 operaciones; réplica 14.9111 VST; BingX bruto -31.6776 VST; gap -46.5887 VST; 6 intentos fallidos; 0 cierres sin evento.
- Error histórico del guard; cierre recuperado: 1 operaciones; réplica 14.4634 VST; BingX bruto 19.0786 VST; gap 4.6153 VST; 1 intentos fallidos; 0 cierres sin evento.
- Guard de cierre; ejecución posterior: 7 operaciones; réplica 94.6677 VST; BingX bruto 68.5705 VST; gap -26.0973 VST; 157 intentos fallidos; 0 cierres sin evento.
- Salida sin señal local enlazada: 2 operaciones; réplica 4.9719 VST; BingX bruto 3.4177 VST; gap -1.5542 VST; 0 intentos fallidos; 0 cierres sin evento.
- Nota: el gap asociado a una ruta describe lo observado y no equivale a dinero contrafactualmente recuperable.

## Cadena señal, cotización y fill

- Operaciones emparejadas / cadena base completa: 164 / 164
- Entradas con señal y cotización / salidas con objetivo y cotización: 164 / 155
- Contabilidad de la hoja (164 operaciones): 0.0000 VST
- Referencia de entrada (164 operaciones): -28.3553 VST
- Señal a cotización (164 operaciones): -100.5166 VST
- Cotización a fill de entrada (164 operaciones): -136.6527 VST
- Objetivo de salida (159 operaciones): -24.4821 VST
- Objetivo a cotización (155 operaciones): 1.0270 VST
- Cotización a fill de salida (160 operaciones): -209.9974 VST
- Salida sin traza intermedia (9 operaciones): -19.6080 VST
- Cantidad y fills (164 operaciones): -0.4683 VST
- Bruto BingX reconstruido: -84.9142 VST
- Residual: 0.0000 VST (reconciliado)
- Latencia de apertura: mediana 1.90 s, p95 85.3 s, 40 con espera de reintento.
- Latencia de cierre por señal: mediana 0.73 s, p95 3.41 s, 3 con espera de reintento.

## Cohorte posterior a las mejoras

- Inicio: 2026-07-15T07:05:17.987Z
- Muestra: Muestra preliminar (47 cierres)
- Aperturas / cierres: 49 / 47
- Filas comparables / VST posteriores sin referencia: 49 / 0
- Última operación disponible en la hoja: 2026-07-23T12:00:00.000Z
- Última jornada provisional / filas abiertas: no / 0
- Neto observado: -154.1625 VST
- Comisiones: -53.9323 VST
- Paquetes completos: 17 de 18
- Aperturas esperadas / ejecutadas / faltantes: 53 / 52 / 1
- Faltantes con corrección posterior demostrada: 1
- Motivos de aperturas ausentes: ninguna
- Cierres históricos sin evento / posiciones afectadas: 0 / 0
- Signos netos distintos antes de costes / por costes: 5 / 0
- Brutos de signo distinto / realineados después de costes: 6 / 1
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 40 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: 60.00% / 62.50%
- Brecha de win rate VST - hoja: 2.5000 puntos
- Mismo signo / signo neto distinto: 35 / 5
- Impacto comparable réplica / BingX bruto / BingX neto: -13.7890 / -46.3898 / -92.4465 VST
- Brecha bruta antes de costes: -32.6008 VST
- Costes comparables, comisiones / funding / total: -44.9649 / -1.0918 / -46.0567 VST
- Peso de costes sobre la brecha negativa: 58.55% del gap
- Brecha total BingX neto - réplica: -78.6575 VST
- Brecha por signo distinto antes de costes: 5 operaciones; bruta 35.5640 VST; costes -5.9332 VST; neta 29.6309 VST
- Brecha por signo cambiado por costes: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha por otro cambio neto: 0 operaciones; bruta 0.0000 VST; costes 0.0000 VST; neta 0.0000 VST
- Brecha aunque coincide el signo: 35 operaciones; bruta -68.1648 VST; costes -40.1235 VST; neta -108.2884 VST
- Residual del impacto: 0.0000 VST (reconciliado)
- Impacto SOL-USDT: 14 pares; 2 cambios de signo; réplica -16.6851 VST; brecha bruta -27.7131 VST; costes -16.2539 VST (36.97% del gap); BingX neto -60.6522 VST; brecha neta -43.9671 VST.
- Impacto ETH-USDT: 12 pares; 2 cambios de signo; réplica -18.9581 VST; brecha bruta -3.8326 VST; costes -13.6947 VST (78.13% del gap); BingX neto -36.4854 VST; brecha neta -17.5272 VST.
- Impacto SUI-USDT: 2 pares; 0 cambios de signo; réplica 0.2187 VST; brecha bruta -7.9839 VST; costes -2.2479 VST (21.97% del gap); BingX neto -10.0131 VST; brecha neta -10.2318 VST.
- Impacto BTC-USDT: 12 pares; 1 cambio de signo; réplica 21.6355 VST; brecha bruta 6.9288 VST; costes -13.8602 VST (no atribuible linealmente); BingX neto 14.7042 VST; brecha neta -6.9314 VST.
- Ejecuciones de entrada / salida > 0,15%: 30 / 10
- Stops comparables alineados / divergentes: 9 / 0
- Divergencias precedidas por cierres fallidos: 0
- Fallos heurísticos de parseo: 0
- Clasificación: {"Entrada desviada":15,"Fees dominan":3,"Stop alineado":3,"Stop con deslizamiento":3,"Diferencia de ejecución":7,"Signo distinto de mercado":5,"Alineada":4,"Abierta o sin cierre":1,"Extra en VST":8}

## Contraste antes y después

- Estado: Muestra preliminar. 47/100 cierres para una comparación contrastable.
- Antes: 34 cierres; 34/34 con referencia; 100.00% con precio ejecutado exacto.
- Ahora: 47 cierres; 40/47 con referencia; 100.00% con precio ejecutado exacto.
- Veredicto global: Mejora técnica; rentabilidad no demostrada. Fiabilidad: mejora observada; entradas: empeoramiento observado; cierres: mejora observada. El intervalo del cambio neto cruza cero.
- Lecturas por ámbito:
- Fiabilidad: mejora. 0 incidencias técnicas y 0 cierres sin enlazar en la cohorte actual.
- Entradas: empeora. 61,2% superan el 0,15% adverso.
- Cierres: mejora. Media adversa 0,118%; p95 2,36 s.
- Economía: negativo. -3,2801 VST netos por cierre; contraste inconcluso.
- Alineación: mixto. 40/47 cierres comparables con la hoja.
- Métricas normalizadas:
- Incidencias técnicas: antes 11.76%; ahora 0.00%; cambio -11.76 pp; mejora.
- Cobertura de precios exactos: antes 100.00%; ahora 100.00%; cambio 0.00 pp; estable.
- Entradas sobre 0,15%: antes 42.86%; ahora 61.22%; cambio +18.37 pp; empeora.
- Desviación media de entrada: antes 0.13%; ahora 0.14%; cambio +0.02 pp; empeora.
- Cierres sobre 0,15%: antes 57.14%; ahora 32.26%; cambio -24.88 pp; mejora.
- Desviación media de cierre: antes 0.17%; ahora 0.12%; cambio -0.06 pp; mejora.
- Latencia de cierre p95: antes 3.45 s; ahora 2.36 s; cambio -1.10 s; mejora.
- Coste por cierre: antes 1.1878 VST; ahora 1.1739 VST; cambio -0.0139 VST; estable.
- Bruto por cierre: antes -0.8608 VST; ahora -2.1062 VST; cambio -1.2454 VST; empeora.
- Neto por cierre: antes -2.0485 VST; ahora -3.2801 VST; cambio -1.2315 VST; empeora.
- Cobertura de la hoja: antes 100.00%; ahora 85.11%; cambio -14.89 pp; empeora.
- Gap por operación comparable: antes -4.9771 VST; ahora -0.8150 VST; cambio +4.1620 VST; mejora.
- Impacto de entrada por comparable: antes -1.4257 VST; ahora -2.2235 VST; cambio -0.7978 VST; empeora.
- Impacto de salida por comparable: antes -3.5547 VST; ahora 1.4113 VST; cambio +4.9660 VST; mejora.
- Diagnóstico de entrada: El mayor arrastre aparece entre la cotización y el fill. SUI-USDT registra la media actual más alta entre los activos con al menos tres aperturas: 0,2279%. El deterioro comparable más claro está en SOL-USDT: 55,6% → 82,4% sobre el umbral. La primera apertura del paquete promedia 0,059%; las posteriores, 0,1857%. El tiempo medio desde detección hasta el primer intento pasa de 0,02 s a 2,88 s, mientras que inicio→fill ronda 1,96 s. El cambio de mezcla por posición explica descriptivamente 61,2% del aumento medio observado. 27/30 entradas sobre el umbral se ejecutaron sin espera de reintento; 3/30, tras reintento.
- Descomposición por fase:
- Fase Señal a cotización: antes 0.05%; ahora 0.06%; cambio +0.0086 pp; empeora.
- Fase Cotización a fill: antes 0.07%; ahora 0.08%; cambio +0.0101 pp; empeora.
- Comparación por activo:
- SUI-USDT: 2 → 3 aperturas; media 0.18% → 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- ETH-USDT: 11 → 14 aperturas; media 0.17% → 0.18%; 85.71% sobre 0,15%; empeora.
- SOL-USDT: 9 → 17 aperturas; media 0.17% → 0.18%; 82.35% sobre 0,15%; empeora.
- BTC-USDT: 13 → 15 aperturas; media 0.04% → 0.04%; 6.67% sobre 0,15%; empeora.
- Comparación por ruta:
- Con espera de reintento: 3 aperturas actuales; media 0.23%; 100.00% sobre 0,15%; muestra insuficiente.
- Sin espera de reintento: 46 aperturas actuales; media 0.14%; 58.70% sobre 0,15%; empeora.
- Tiempo observado hasta el fill:
- Reacción hasta el intento: 1.56 s → 1.89 s.
- Inicio del intento a fill: 1.70 s → 1.96 s.
- Latencia total p95: 6.41 s → 7.23 s; 49 aperturas actuales con hora del histórico de BingX.
- Microestructura prospectiva (solo aperturas nuevas):
- Cobertura bid/ask prospectiva: 11/49 aperturas; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; last a precio ejecutable 0.00%; precio ejecutable a fill 0.08%.
- RTT local medio: ticker 178 ms; orden 291 ms; antigüedad mediana de la cotización 162 ms.
- Reloj de bookTicker: 11/11 con marca BingX; BingX a recepción local -422 ms de mediana; recepción local a envío 162 ms; 9 con desfase aparente.
- Secuencia del paquete: 8/49 con cotización inicial; espera media hasta el envío 3249 ms; movimiento adverso durante la cola 0.00%.
- Comparación por posición dentro del paquete:
- Cuarta o posterior: 1 → 2 aperturas; media 0.16% → 0.22%; detección a primer intento 2.92 s; inicio a fill 2.00 s; muestra insuficiente.
- Tercera del paquete: 8 → 13 aperturas; media 0.19% → 0.20%; detección a primer intento 3.94 s; inicio a fill 1.98 s; empeora.
- Segunda del paquete: 11 → 17 aperturas; media 0.16% → 0.17%; detección a primer intento 2.07 s; inicio a fill 1.92 s; empeora.
- Primera del paquete: 15 → 17 aperturas; media 0.06% → 0.06%; detección a primer intento 0.02 s; inicio a fill 1.97 s; empeora.
- Mezcla por posición del paquete: +0.0101 pp; cambio dentro de cada posición: +0.0064 pp; variación observada: +0.0166 pp.
- Proporción descriptiva asociada a la mezcla por posición: 61.18%. Este desglose no se suma al desglose por activo.
- Límite del diagnóstico: Es una asociación descriptiva. Activo y posición dentro del paquete están correlacionados; sus desgloses son lecturas alternativas y no deben sumarse como causas. La microestructura solo se mide en aperturas nuevas con bookTicker fresco y no modifica la ejecución.
- Microestructura prospectiva de cierre (solo cierres explícitos nuevos):
- Cobertura bid/ask prospectiva: 3/31 cierres; 0 instantáneas caducadas.
- Spread medio observado: 0.01%; último precio a ejecutable 0.00%; ejecutable a fill 0.07%.
- RTT local medio: ticker 189 ms; orden 280 ms; antigüedad mediana de la cotización 47 ms.
- Reloj de bookTicker: 3/3 con marca BingX; BingX a recepción local -495 ms de mediana; recepción local a envío 47 ms; 3 con desfase aparente.
- BTC-USDT: 1/11 cierres medidos; ejecutable a fill 0.00%; 0 sobre 0,15%.
- SOL-USDT: 1/10 cierres medidos; ejecutable a fill 0.11%; 0 sobre 0,15%.
- ETH-USDT: 1/8 cierres medidos; ejecutable a fill 0.11%; 0 sobre 0,15%.
- Media neta enlazada: antes -2.0307 VST; ahora -3.2538 VST; diferencia -1.2231 VST por cierre.
- Bootstrap determinista (4000 iteraciones): intervalo del 95% -5.5063 a 3.2920 VST; probabilidad exploratoria de mejora 28.75%; lectura inconclusa.
- Límite: el contraste describe esta muestra. La cobertura parcial y un intervalo que cruce cero impiden afirmar una mejora económica o garantizar rentabilidad futura.

## Puerta de promoción

- Veredicto: No apta para revisión.
- Diagnóstico: Pendiente: muestra, fiabilidad y rentabilidad.
- Revisión humana habilitada: no.
- Promoción automática: no.
- Muestra: recogiendo muestra. 18/50 paquetes.
- Fiabilidad: no cumple. 52/53 aperturas · 1 fallo por corrección posterior.
- Rentabilidad: no cumple. -154,1625 VST · -3,2801 VST/cierre · 47 cierres.
- Colas: verificado. 0 aperturas · 0 reintentos.
- Seguridad: verificado. 0 posiciones sin SL · 0 órdenes huérfanas.
- Criterios pendientes: Muestra de paquetes, Cobertura de aperturas, Paquetes completos, Aperturas perdidas, Neto tras costes.

## Estado operativo

- Monitor: ok
- Fase: live
- Posiciones abiertas: 2
- PnL diario: 0.0000
- PnL mensual: 244.5349
- Modo: demo
- Desviación adversa máxima: 0.15%
- Antigüedad máxima de apertura: 5 min
- Distancia máxima del stop: 5.00%
- Lectura Telegram: 5 s
- Recarga Telegram: 30 s
- Reloj REST BingX: +382 ms de offset; RTT 183 ms; antigüedad 86.7 s; warn; solo observación

## Interpretación

El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. La cohorte posterior a las mejoras mide el comportamiento nuevo sin reescribir el histórico. El contraste normaliza las métricas por cierre y muestra su cobertura; una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.
