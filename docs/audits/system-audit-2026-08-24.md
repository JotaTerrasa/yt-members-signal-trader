# Auditoría integral del sistema

Generada: 2026-08-24T07:33:14.721Z
Mes auditado: 2026-08
Ventana: 2026-08-01T00:00:00.000Z a 2026-08-24T07:33:14.721Z

## Resumen ejecutivo

- **CRITICAL · post_correction_miss:** 1 apertura faltó tras procesar una versión anterior del post. La cohorte conserva el fallo histórico; las correcciones recientes ya se recuperan por la ruta idempotente.
- **CRITICAL · incomplete_signal_packages:** 14 aperturas faltan en paquetes posteriores a las mejoras sin una corrección posterior que las explique.

## Cobertura de señales

- Aperturas esperadas desde publicaciones: 9
- Ejecutadas: 0
- Bloqueadas: 9
- Sin evento: 0
- Tasa de ejecución: 0.00%
- Razones de bloqueo: {"stale_signal":9}

## Calidad de ejecución

- Entradas medibles: 0
- Entradas adversas: 0
- Entradas por encima del 0,15%: 0
- Arrastre neto estimado en entradas: 0.0000 VST
- Cierres medibles: 0
- Cierres por encima del 0,15%: 0
- Arrastre neto estimado en cierres: 0.0000 VST

## Réplica y costes

- Filas de la hoja: -
- Aperturas VST: -
- Réplica teórica escalada: - VST
- PnL bruto BingX: - VST
- Comisiones: - VST
- Funding: - VST
- Neto observado: - VST
- Devolución acreditada por BingX: - VST (no detectada)
- Tarifa taker observada: sin datos
- Tarifa maker observada: sin datos
- Devolución estimada (0%): - VST
- Neto hipotético tras devolución estimada: - VST
- Ciclos con entradas agregadas: 0 (0 filas)
- Histórico exacto de órdenes: no disponible
- Órdenes históricas leídas: 0
- Cierres con fill exacto: 0 de 0
- Órdenes de cierre / posiciones reconstruidas: 0 / 0
- Aperturas recuperadas desde BingX: 0
- Cobertura de eventos locales: sin datos
- Cierres sin apertura enlazada: 0
- Última operación disponible en la hoja: sin fecha
- Cobertura fiable para comparar hasta: sin fecha
- Cobertura permitida para emparejar hasta: sin fecha
- Última jornada provisional / filas abiertas: no / 0
- Última apertura VST: sin fecha
- Aperturas VST posteriores sin referencia: 0
- Motivos de aperturas ausentes: ninguna
- Publicaciones históricas de cierre sin evento: 0
- Posiciones afectadas por cierres no procesados: 0
- Signos netos distintos antes de costes / por costes: 0 / 0
- Brutos de signo distinto / realineados después de costes: 0 / 0
- Cambios netos sin atribución: 0
- Muestra cerrada emparejada: 0 operaciones
- Win rate hoja / BingX VST neto sobre la misma muestra: sin datos / sin datos
- Brecha de win rate VST - hoja: - puntos
- Mismo signo / signo neto distinto: 0 / 0
- Hoja ganadora y VST perdedora / caso inverso: 0 / 0
- Impacto económico por resultado: sin muestra comparable.
- Ejecuciones de entrada > 0,15%: 0 de 0
- Ejecuciones de salida > 0,15%: 0 de 0
- Fuentes de entrada: {}
- Fuentes de salida: {}
- Stops comparables alineados / divergentes / con deslizamiento: 0 / 0 / 0
- Stops observados sin hoja comparable: 0
- Stops divergentes precedidos por cierres fallidos: 0
- Stops divergentes por el fallo histórico del guard: 0
- Stops divergentes tras un cierre no procesado: 0
- Stops divergentes en posiciones agregadas: 0
- Clasificación: {}

## Puente contable

- Sin puente disponible.

## Desglose del gap emparejado

- Sin desglose disponible.

## Rutas causales de salida

- Sin rutas causales disponibles.

## Cadena señal, cotización y fill

- Sin cadena de precios disponible.

## Cohorte posterior a las mejoras

- La cohorte todavía no está inicializada.

## Contraste antes y después

- No existe una cohorte anterior cerrada con la que construir el contraste.

## Puerta de promoción

- Veredicto: No apta para revisión.
- Diagnóstico: Pendiente: muestra, fiabilidad, rentabilidad y seguridad.
- Revisión humana habilitada: no.
- Promoción automática: no.
- Muestra: recogiendo muestra. 33/50 paquetes.
- Fiabilidad: no cumple. 83/98 aperturas · 1 fallo por corrección posterior.
- Rentabilidad: recogiendo muestra. Sin cierres contrastables todavía.
- Colas: verificado. 0 aperturas · 0 reintentos.
- Seguridad: no cumple. 0 posiciones sin SL · 0 órdenes huérfanas.
- Criterios pendientes: Muestra de paquetes, Cobertura de aperturas, Paquetes completos, Aperturas perdidas, Neto tras costes, Reconciliación BingX.

## Estado operativo

- Monitor: ok
- Fase: live
- Posiciones abiertas: -
- PnL diario: 0.0000
- PnL mensual: 0.0000
- Modo: sin datos
- Desviación adversa máxima: sin datos
- Antigüedad máxima de apertura: - min
- Distancia máxima del stop: sin datos
- Lectura Telegram: 5 s
- Recarga Telegram: 30 s
- Reloj REST BingX: -352 ms de offset; RTT 190 ms; antigüedad 127.9 s; warn; solo observación

## Interpretación

El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. La cohorte posterior a las mejoras mide el comportamiento nuevo sin reescribir el histórico. El contraste normaliza las métricas por cierre y muestra su cobertura; una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.
