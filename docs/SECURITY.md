# Seguridad

Esta aplicación puede leer contenido privado de YouTube/Telegram y operar en BingX. Trátala como software sensible.

## Nunca subir a Git

Estas rutas están ignoradas:

```text
.data/
.yt-profile/
node_modules/
tmp/
.env
.env.*
```

`.data/config.json` puede contener:

- token de Telegram;
- chat ID;
- API key de BingX;
- API secret de BingX;
- confirmaciones de live.

`.yt-profile/` contiene sesiones Chromium de YouTube y Telegram Web.

## Tokens y claves

Reglas:

- Si un token se pega en un chat, captura o repo, rótalo.
- Usa claves de BingX sin permisos de retirada.
- Si BingX permite restricción por IP, actívala.
- Separa claves demo y live si tu operativa lo permite.
- No compartas `.data/config.json`.
- No publiques capturas donde se vean tokens, chat IDs, API keys o URLs privadas.

## Live real

Live real requiere confirmación manual en la UI. Aun así:

- valida primero en `test`;
- valida después en `demo`;
- revisa parser con `/api/bingx/parse-test`;
- confirma cantidades;
- confirma que cada apertura trae SL;
- usa allowlist si solo quieres pares concretos;
- deja `dryRunRequired` activo salvo que sepas por qué lo desactivas.

No ejecutes `REPLAY_LIVE` sin revisar si la orden ya se ejecuto.

## Telegram Web

Telegram Web puede recibir mensajes urgentes antes que YouTube. También aumenta el riesgo operativo.

Recomendacion:

- permitir por defecto solo gestión de posiciones;
- mantener aperturas desactivadas salvo confirmación explícita;
- exigir confirmación live si `executeSignals` está activo en `live` o `dual`;
- revisar que el canal abierto en Chromium sea el correcto.

Mensajes como:

```text
CERRADLO TODO
```

cierran todas las posiciones abiertas.

## GitHub

Antes de cada push:

```bash
git status --short --ignored
rg -n "(botToken|apiSecret|apiKey|TOKEN|SECRET|PRIVATE_KEY|chatId)" README.md docs public src package.json package-lock.json
```

No incluyas:

- `.data/`;
- `.yt-profile/`;
- capturas con informacion sensible;
- logs con claves.

## UI expuesta

No expongas `http://localhost:5178` a internet sin autenticación.

Si usas Cloudflare Tunnel:

- que sea temporal;
- no compartas la URL;
- ciérralo al terminar;
- recuerda que la UI permite operar y cambiar claves.

## Incidente

Si sospechas que se ha filtrado algo:

1. Para la app.
2. Revoca token Telegram.
3. Revoca API key BingX.
4. Borra o rota la URL pública del túnel.
5. Revisa `git log` y GitHub por si hubo secretos.
6. Genera claves nuevas.
7. Reinicia en `test`.
8. Valida de nuevo antes de `live`.
