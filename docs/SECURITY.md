# Seguridad

Esta aplicacion puede leer contenido privado de YouTube y operar en BingX. Tratala como software sensible.

## Nunca subir a Git

Estos paths estan ignorados y no deben salir de tu maquina:

```text
.data/
.yt-profile/
node_modules/
tmp/
.env
.env.*
```

`.data/config.json` puede contener:

- Token de Telegram.
- Chat ID.
- API key de BingX.
- API secret de BingX.
- Configuracion de live.

`.yt-profile/` contiene la sesion de Chromium/YouTube.

## Tokens y claves

Reglas:

- Si un token se pega en un chat, captura o repo, rotalo.
- Usa claves de BingX sin permisos de retirada.
- Si BingX permite restriccion por IP, activala.
- Separa claves demo y live.
- No compartas `.data/config.json`.

## GitHub

Recomendado:

- Repo privado.
- Revisar `git status --ignored -sb` antes de cada push.
- Buscar secretos antes de commit:

```bash
rg -n '(botToken|apiSecret|apiKey|TOKEN|SECRET|PRIVATE_KEY)' README.md docs public src package.json package-lock.json
```

## Telegram

El bot token permite controlar el bot. Si se filtra:

1. Abre BotFather.
2. Usa `/revoke` o genera token nuevo.
3. Actualiza la UI.
4. Prueba el envio.

## BingX live

Antes de live:

- Valida parser con ejemplos reales.
- Ejecuta en `test`.
- Ejecuta en `demo`.
- Prueba una orden manual minima.
- Prueba un cierre.
- Revisa tamano de orden.
- Activa stop loss obligatorio.
- Mantiene max posiciones.
- Usa allowlist si solo quieres pares concretos.

Live se debe armar manualmente desde la UI. No dejes la UI expuesta a internet sin proteccion.

## Acceso desde movil o 5G

Si usas Cloudflare Tunnel u otro tunel:

- No lo publiques como URL permanente sin autenticacion.
- Cierra el tunel cuando termines.
- Evita compartir la URL.
- Recuerda que la UI permite cambiar configuracion y disparar pruebas.

## Incidente

Si sospechas que se ha filtrado algo:

1. Para la app.
2. Revoca token Telegram.
3. Revoca API key BingX.
4. Borra o rota la URL publica del tunel.
5. Revisa `git log` y GitHub por si hubo secretos.
6. Genera claves nuevas.
7. Reinicia en modo `test` antes de volver a operar.
