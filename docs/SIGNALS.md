# Formato de senales

El parser intenta leer textos de posts de YouTube y convertirlos en eventos de trading. Esta pagina documenta los formatos esperados y los limites actuales.

## Apertura multi-ticker

Formato recomendado:

```text
ORDEN

LONG BTC 78190
STOP BTC BINGX 77500
APALANCAMIENTO X25
1500USDT

LONG ETH 2178
STOP ETH BINGX 2155
APALANCAMIENTO X25
1500USDT
```

Resultado esperado:

- `BTC-USDT LONG`
- `ETH-USDT LONG`
- Leverage: `25`
- Stop loss por simbolo.
- Notional leido: `1500 USDT`

En ejecucion actual:

- La orden de apertura se manda a mercado.
- El precio de la senal se guarda como referencia.
- En Demo VST, el tamano real usa una base fija de 1000 VST. Con 15%, cada ticker abre 150 VST de margen.

## Direcciones soportadas

Long:

```text
LONG
LARGO
BUY
COMPRA
COMPRAR
```

Short:

```text
SHORT
CORTO
SELL
VENTA
VENDER
```

## Stop loss

Formatos habituales:

```text
STOP BTC 77500
SL BTC 77500
STOP BTC BINGX 77500
```

Si `Stop obligatorio` esta activo, una apertura sin stop se bloquea.

## Take profit

Formatos habituales:

```text
TP BTC 79000
TAKE PROFIT BTC 79000
```

Si hay varios TP, la orden actual usa el primero como `TAKE_PROFIT_MARKET`.

## Apalancamiento

Formatos habituales:

```text
APALANCAMIENTO X25
25x
X25
```

Regla:

- Si la senal trae apalancamiento, se usa ese valor.
- Si no trae, se usa el fallback configurado.
- Si supera el maximo del contrato o el maximo de riesgo local, se bloquea.

## Notional

Formatos habituales:

```text
1500USDT
1500 USDT
```

Uso por modo:

- `test`: usa el notional de la senal o el default.
- `demo`: ignora el USDT de la senal y usa porcentaje sobre capital base VST fijo.
- `live`: usa el notional de la senal limitado por `maxNotionalUSDT`.

## Cierre total

Formato recomendado:

```text
CIERRE TOTAL

BTC 78440
ETH 2194
```

Resultado:

- Cierra `BTC-USDT`.
- Cierra `ETH-USDT`.
- Si no hay precio, usa el ultimo precio de mercado.

## Cierre parcial

Formato recomendado:

```text
CIERRE PARCIAL 50%
SOL 92.4
```

Resultado:

- Cierra el porcentaje indicado.
- Si el texto contiene `MITAD`, `HALF` o `PARCIAL` sin porcentaje, usa 50%.

## Stop a break even

Formatos detectados:

```text
SL BE BTC
STOP A ENTRADA ETH
BREAK EVEN SOL
```

Estado actual:

- En paper local mueve el stop al precio de entrada.
- En Demo VST y live solo registra el evento. No modifica aun el stop real en BingX.

## Portfolio

Formato detectado:

```text
PORTFOLIO COMPLETAMENTE ACTUALIZADO

NUEVO ENLACE

https://4tfs.short.gy/14may
```

Reglas:

- Debe parecer un post de portfolio.
- Debe incluir `4tfs.short.gy`, `short.gy` o Google Sheets.
- Se resuelve el enlace y se guarda el Google Sheet activo.

## Limitaciones conocidas

- Textos ambiguos pueden producir simbolos no deseados. Usa allowlist si quieres restringir.
- Los cierres se aplican por simbolo, no por ID de senal original.
- Si hay varios TP, solo se envia el primero a BingX.
- El cambio de SL a BE en BingX real no esta implementado todavia.
- El parser asume pares contra USDT.
