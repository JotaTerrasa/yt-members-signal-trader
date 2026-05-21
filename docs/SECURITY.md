# Seguridad

Esta aplicacion puede leer contenido privado de YouTube/Telegram y operar en BingX. Tratala como software sensible.

## Nunca subir a Git

Estos paths estan ignorados:

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

- Si un token se pega en un chat, captura o repo, rotalo.
- Usa claves de BingX sin permisos de retirada.
- Si BingX permite restriccion por IP, activala.
- Separa claves demo y live si tu operativa lo permite.
- No compartas `.data/config.json`.
- No publiques capturas donde se vean tokens, chat IDs, API keys o URLs privadas.

## Live real

Live real requiere confirmacion manual en la UI. Aun asi:

- valida primero en `test`;
- valida despues en `demo`;
- revisa parser con `/api/bingx/parse-test`;
- confirma cantidades;
- confirma que cada apertura trae SL;
- usa allowlist si solo quieres pares concretos;
- deja `dryRunRequired` activo salvo que sepas por que lo desactivas.

No ejecutes `REPLAY_LIVE` sin revisar si la orden ya se ejecuto.

## Telegram Web

Telegram Web puede recibir mensajes urgentes antes que YouTube. Tambien aumenta el riesgo operativo.

Recomendacion:

- permitir por defecto solo gestion de posiciones;
- mantener aperturas desactivadas salvo confirmacion explicita;
- exigir confirmacion live si `executeSignals` esta activo en `live` o `dual`;
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

No expongas `http://localhost:5178` a internet sin autenticacion.

Si usas Cloudflare Tunnel:

- que sea temporal;
- no compartas la URL;
- cierralo al terminar;
- recuerda que la UI permite operar y cambiar claves.

## Incidente

Si sospechas que se ha filtrado algo:

1. Para la app.
2. Revoca token Telegram.
3. Revoca API key BingX.
4. Borra o rota la URL publica del tunel.
5. Revisa `git log` y GitHub por si hubo secretos.
6. Genera claves nuevas.
7. Reinicia en `test`.
8. Valida de nuevo antes de `live`.
