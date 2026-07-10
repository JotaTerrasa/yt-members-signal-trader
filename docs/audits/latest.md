# Auditoría integral del sistema

Generada: 2026-07-10T06:57:53.293Z
Mes auditado: 2026-07
Ventana: 2026-07-01T10:55:57.218Z a 2026-07-10T06:57:53.730Z

## Resumen ejecutivo

- **HIGH · entry_chasing:** 14 entradas superaron el 0,15% de desviación adversa.
- **HIGH · close_slippage:** 9 cierres superaron el 0,15% de desviación adversa.
- **HIGH · fees_dominate:** Las comisiones acumuladas superan el PnL bruto de BingX.
- **HIGH · sheet_operations_missing:** 15 operaciones de la hoja no tienen apertura VST emparejada.

## Cobertura de señales

- Aperturas esperadas desde publicaciones: 103
- Ejecutadas: 88
- Bloqueadas: 10
- Sin evento: 0
- Tasa de ejecución: 85.44%
- Razones de bloqueo: {"exchange_stop_loss_invalid":1,"cost_guard_margin_break_even":9}

## Calidad de ejecución

- Entradas medibles: 88
- Entradas adversas: 65
- Entradas por encima del 0,15%: 14
- Arrastre neto estimado en entradas: 18.4592 VST
- Cierres medibles: 58
- Cierres por encima del 0,15%: 9
- Arrastre neto estimado en cierres: 39.4414 VST

## Réplica y costes

- Filas de la hoja: 103
- Aperturas VST: 88
- Réplica teórica escalada: 272.4109 VST
- PnL bruto BingX: -10.5657 VST
- Comisiones: -92.9171 VST
- Funding: -2.0737 VST
- Neto observado: -105.5564 VST
- Devolución estimada (22%): 20.4418 VST
- Neto tras devolución estimada: -85.1146 VST
- Ciclos con entradas agregadas: 4 (8 filas)
- Clasificación: {"Alineada":8,"No ejecutada en VST":15,"Diferencia de ejecución":32,"Entrada desviada":7,"Salida desviada":16,"Signo distinto":10,"Fees dominan":5,"Stop antes del cierre":10,"Cierre sin apertura enlazada":3}

## Estado operativo

- Monitor: ok
- Fase: live
- Posiciones abiertas: 0
- PnL diario: 0.0000
- PnL mensual: -105.5564
- Modo: demo
- Desviación adversa máxima: 0.15%
- Antigüedad máxima de apertura: 5 min
- Distancia máxima del stop: 5.00%
- Recarga Telegram: 30 s

## Interpretación

El informe separa resultados observados de escenarios estimados. La devolución de comisiones no modifica la equity real hasta que aparezca como ingreso en BingX. Una mejora de ejecución reduce divergencias, pero no garantiza rentabilidad futura.

