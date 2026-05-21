# Formato de senales

El parser convierte texto libre de YouTube o Telegram Web en senales normalizadas. Esta guia documenta los formatos soportados y sus limites.

## Acciones soportadas

- `OPEN`: apertura LONG/SHORT.
- `CLOSE`: cierre por simbolo.
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
- direccion `LONG`
- entrada `LIMIT 78190`
- SL `77500`
- leverage `25`
- notional leido `1500 USDT`

Regla de tipo de orden:

- `LONG BTC 78190` o `SHORT BTC 78190` => `LIMIT`.
- `LONG BTC` o `SHORT BTC` sin precio => `MARKET`.

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

Si `Stop obligatorio` esta activo, una apertura sin stop se bloquea.

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
```

Cuando aparece una seccion `TPS`, cada linea `SIMBOLO PRECIO` se convierte en `SET_TAKE_PROFIT`.

## Modificacion de stop loss

Formatos:

```text
MODIFICACION STOPLOSS
ETH 2115
SOL 86.5
```

Tambien detecta:

```text
SL ETH 2115
STOP LOSS SOL 86.5
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

Senales generadas:

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

- Si el TP del simbolo abierto aparece en `TPS`, se adjunta tambien a la apertura.
- Las secciones `TPS` y `MODIFICACION STOPLOSS` tienen limites para no mezclar precios.

## Apalancamiento

Formatos:

```text
APALANCAMIENTO X25
25x
X25
```

Regla:

- Si la senal trae apalancamiento, se usa ese valor.
- Si no trae, se usa el fallback configurado.
- Si supera el maximo local o del contrato, se bloquea.

## Notional

Formatos:

```text
1500USDT
1500 USDT
1500USDT
```

Uso:

- `test`: usa el notional de la senal o el default.
- `demo`: usa porcentaje sobre capital base VST fijo.
- `live`: usa el tamano configurado/limitado para real.

## Cierre por simbolo

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

## Cierre global

Formatos:

```text
CERRADLO TODO
CERRAR TODO
CIERRE TOTAL TODO
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

- En paper local mueve el stop al precio de entrada.
- En Demo VST y live se registra como evento detectado.

## Telegram Web

Telegram Web puede ejecutar:

- cierres;
- cierre global;
- TP;
- SL;
- break even.

Las aperturas desde Telegram Web solo se ejecutan si `Permitir aperturas` esta activo.

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

- Textos ambiguos pueden producir simbolos no deseados. Usa allowlist si quieres restringir.
- Los cierres se aplican por simbolo, no por ID de senal original.
- Si hay varios TP de apertura, se usa el primero como TP adjunto.
- Telegram Web depende de la sesion visual de Chromium.
- El parser asume pares contra USDT.
