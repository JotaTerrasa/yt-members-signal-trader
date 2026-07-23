# Formato de señales

El parser convierte texto libre de YouTube o Telegram Web en señales normalizadas. Esta guía documenta los formatos soportados y sus límites.

## Acciones soportadas

- `OPEN`: apertura LONG/SHORT.
- `CLOSE`: cierre por símbolo.
- `CLOSE_ALL`: cierre global.
- `SET_TAKE_PROFIT`: colocar o modificar TP.
- `SET_STOP_LOSS`: colocar o modificar SL.
- `MOVE_SL_BE`: mover stop a break even.

## Apertura estructurada

Formato:

```text
ORDEN

LONG BTC 78190
STOP BTC BINGX 77500
APALANCAMIENTO X25
1500USDT
```

Resultado:

- `BTC-USDT`
- dirección `LONG`
- entrada `LIMIT 78190`
- SL `77500`
- leverage `25`
- notional leído `1500 USDT`

Regla de tipo de orden:

- `LONG BTC 78190` o `SHORT BTC 78190` => `LIMIT`.
- `LONG BTC` o `SHORT BTC` sin precio => `MARKET`.

## Correcciones de una publicación

En Demo VST, si YouTube edita una publicación reciente y corrige la entrada, el stop o el apalancamiento, la aplicación vuelve a evaluar solo esa apertura. Se mantienen la edad máxima, todas las validaciones y el antiduplicados. Una edición de texto explicativo o de take profits no dispara una apertura nueva. Esta recuperación no se aplica en el modo real.

## Direcciones

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

## Stop loss obligatorio

Formatos:

```text
STOP BTC 77500
SL BTC 77500
STOP BTC BINGX 77500
STOP SUI BINGX 1.111
```

Si `Stop obligatorio` está activo, una apertura sin stop se bloquea.

## Take profit

Formatos:

```text
TP BTC 79000
TAKE PROFIT BTC 79000
TPS
BTC 78350
ETH 2165
SOL 88.6
SUI 1.159
Segundo: take profits
BTC 78711
ETH 2182
```

Cuando aparece una sección `TPS` o `take profits`, cada línea `SIMBOLO PRECIO` se convierte en `SET_TAKE_PROFIT`. El encabezado puede venir precedido por `Primero:`, `Segundo:`, `1.` o formatos similares.

## Modificacion de stop loss

Formatos:

```text
MODIFICACION STOPLOSS
ETH 2115
SOL 86.5
```

También detecta:

```text
SL ETH 2115
STOP LOSS SOL 86.5
Primero: modificacion sl btc a 76200
```

Resultado: `SET_STOP_LOSS`.

## Mensaje mixto de apertura + TP + SL

Ejemplo real:

```text
ORDEN NOCTURNA Y TPS Y SL

TPS

BTC 78350
ETH 2165
SOL 88.6
SUI 1.159

MODIFICACION STOPLOSS

ETH 2115
SOL 86.5

LONG SUI 1.123
STOP SUI BINGX 1.111
APALANCAMIENTO X25
1500USDT
```

Señales generadas:

```text
OPEN SUI-USDT LONG LIMIT 1.123 SL 1.111 TP 1.159 X25
SET_TAKE_PROFIT BTC-USDT 78350
SET_TAKE_PROFIT ETH-USDT 2165
SET_TAKE_PROFIT SOL-USDT 88.6
SET_TAKE_PROFIT SUI-USDT 1.159
SET_STOP_LOSS ETH-USDT 2115
SET_STOP_LOSS SOL-USDT 86.5
```

Notas:

- Si el TP del símbolo abierto aparece en `TPS`, se adjunta también a la apertura.
- Las secciones `TPS` y `MODIFICACION STOPLOSS` tienen límites para no mezclar precios.

## Apalancamiento

Formatos:

```text
APALANCAMIENTO X25
25x
X25
```

Regla:

- Si la señal trae apalancamiento, se usa ese valor.
- Si no lo incluye, se usa el respaldo configurado.
- Si supera el máximo local o del contrato, se bloquea.

## Notional

Formatos:

```text
1500USDT
1500 USDT
1500USDT
```

Uso:

- `test`: usa el notional de la señal o el default.
- `demo`: usa porcentaje sobre capital base VST fijo.
- `live`: usa el tamaño configurado/limitado para real.

## Cierre por símbolo

```text
CIERRE TOTAL

BTC 78440
ETH 2194
```

Resultado:

- `CLOSE BTC-USDT`
- `CLOSE ETH-USDT`

Si hay porcentaje:

```text
CIERRE PARCIAL 50%
SOL 92.4
```

Cierra el porcentaje indicado. Si dice `MITAD`, `HALF` o `PARCIAL` sin porcentaje, usa 50%.

El encabezado de cierre admite variantes como `CIERRO`, `CERRAR`, `CERRAMOS`, `CERRAD`, `CERRADLO`, `CLOSE`, `SALIR`, `SALIMOS`, `FUERA` y la errata `CUERRE`/`CUERRES`.

## Cierre global

Formatos:

```text
CERRADLO TODO
CERRAR TODO
CIERRE TOTAL TODO
CUERRE TOTAL TODO
CERRAMOS TODO
SALIMOS DE TODO
```

Resultado: `CLOSE_ALL`.

En `live` o `dual`, cierra las posiciones abiertas de BingX para los modos activos.

## Stop a break even

Formatos:

```text
SL BE BTC
STOP A ENTRADA ETH
BREAK EVEN SOL
```

Estado:

- En la simulación local mueve el stop al precio de entrada.
- En Demo VST y live se registra como evento detectado.

## Telegram Web

Telegram Web puede ejecutar:

- cierres;
- cierre global;
- TP;
- SL;
- break even.

Las aperturas desde Telegram Web solo se ejecutan si `Permitir aperturas` está activo.

## Portfolio

Formato:

```text
PORTFOLIO COMPLETAMENTE ACTUALIZADO

NUEVO ENLACE

https://4tfs.short.gy/14may
```

Reglas:

- Debe parecer un post de portfolio.
- Debe incluir `4tfs.short.gy`, `short.gy` o Google Sheets.
- Se resuelve el enlace y se guarda el Google Sheet activo.

## Limitaciones

- Textos ambiguos pueden producir símbolos no deseados. Usa allowlist si quieres restringir.
- Los cierres se aplican por símbolo, no por ID de señal original.
- Si hay varios TP de apertura, se usa el primero como TP adjunto.
- Telegram Web depende de la sesión visual de Chromium.
- El parser asume pares contra USDT.
