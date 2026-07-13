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

No ejecutes `REPLAY_LIVE` sin revisar si la orden ya se ejecutó.

## Demo VST

La reserva técnica de Demo VST usa una llamada firmada a BingX para añadir saldo virtual al entorno demo. Trátala como acción de escritura aunque no mueva USDT reales:

- actívala solo con la confirmación explícita `ACTIVAR_RESERVA_VST`;
- revisa el objetivo de margen libre antes de habilitarla;
- verifica en la UI que las aportaciones técnicas aparecen separadas del rendimiento;
- no uses esta reserva como referencia de rentabilidad live.

## Telegram Web

Telegram Web puede recibir mensajes urgentes antes que YouTube. También aumenta el riesgo operativo.

Recomendación:

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
- capturas con información sensible;
- logs con claves.

## Backups cifrados

Los backups restaurables usan AES-256-GCM y una clave derivada con scrypt. La clave predeterminada vive fuera del proyecto:

```text
~/.futures-magician/backup.key
```

Reglas:

- no subas la clave ni archivos `.fmbak` a Git;
- al inicializarla, el script limita sus permisos al usuario actual en Windows y a modo `0600` en Linux/macOS;
- guarda una copia de la clave separada del backup;
- verifica cada backup antes de considerarlo válido;
- restaura primero en `.data/restore-tests/`;
- para respaldar `.yt-profile/`, detén Chromium/PM2 mediante `scripts/profileBackup.ps1` para que Cookies no quede bloqueado;
- no excluyas Cookies del backup del perfil: contiene la sesión que permite recuperar el acceso web.

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
