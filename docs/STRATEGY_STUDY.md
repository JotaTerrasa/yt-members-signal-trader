# Estudio estratégico

Este proyecto puede construir un conjunto privado de datos para estudiar el estilo operativo de la fuente antes de intentar cualquier estrategia autónoma.

La prioridad es observar antes de automatizar:

- capturar cada señal parseada;
- persistir cada evento de trading emitido por la aplicación;
- reconciliar las órdenes live reales con BingX;
- medir resultados, distancia al stop, distancia al objetivo, estructura de paquetes y comportamiento de gestión;
- esperar a tener una muestra estadísticamente útil antes de crear lógica de ejecución autónoma.

## Generar el informe

```bash
npm run study:strategy
```

Ventana opcional:

```bash
npm run study:strategy -- --days 30
```

Ejecución local sin consultar BingX:

```bash
npm run study:strategy -- --days 30 --offline
```

Los archivos con datos brutos de investigación son privados y están ignorados por Git:

```text
.data/strategy-study/strategy-report.md
.data/strategy-study/strategy-study.json
```

El informe Markdown también se guarda como copia de seguridad en Git:

```text
docs/strategy-reports/latest.md
docs/strategy-reports/strategy-study-YYYY-MM-DD-HH-MM-SS.md
```

## Datos utilizados

- `.data/posts.json`: posts de YouTube y mensajes de Telegram Web scrapeados.
- `.data/trade-events.json`: eventos de trading persistidos por la aplicación.
- Histórico de órdenes reales de BingX mediante llamadas de solo lectura a la API.

Si no se puede consultar el histórico de BingX, el informe se genera igualmente con una advertencia de calidad de datos y utiliza los eventos locales como respaldo. Así la automatización diaria sigue funcionando sin ocultar que la muestra es menos completa.

## Interpretación

El informe es investigación descriptiva, no una señal de trading.

La muestra debe tratarse como exploratoria hasta alcanzar al menos 30 posiciones live cerradas. Un objetivo más robusto es superar las 100 posiciones cerradas, repartidas entre distintos regímenes de mercado.

Antes de crear cualquier estrategia autónoma, el estudio debe responder:

- ¿Qué símbolos aparecen con más frecuencia?
- ¿Las entradas suelen ser a mercado o limitadas?
- ¿Cuál es la distancia típica al stop?
- ¿Cuál es la distancia típica al objetivo?
- ¿Con qué frecuencia se modifican los stops?
- ¿Con qué frecuencia se modifican los take profits?
- ¿Las posiciones se abren en paquetes?
- ¿Los mensajes de gestión mejoran o reducen la esperanza matemática?
- ¿Qué ocurre si se opera solo una parte de los símbolos?

## Límite de seguridad

Este estudio no coloca, cancela ni modifica órdenes. Solo lee datos locales e histórico de órdenes de BingX.
