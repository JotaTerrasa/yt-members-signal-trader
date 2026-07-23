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

## Protección local en Windows

Las credenciales de la UI se guardan en texto legible para el proceso dentro de `.data/config.json`. El archivo está fuera de Git y los backups son cifrados, pero eso no sustituye los permisos del sistema operativo.

Audita los permisos sin modificarlos:

```powershell
npm run security:check
```

La comprobación revisa dos superficies: las ACL de `.data`, `.yt-profile` y `.env`, y los nombres de variables guardados por PM2 tanto en el proceso como en `~/.pm2/dump.pm2`. Nunca imprime valores. El resultado debe indicar listas privadas vacías.

Aplica ACL privadas a `.data`, `.yt-profile` y `.env` durante una ventana de mantenimiento:

```powershell
pm2 stop yt-members-signal-trader
npm run security:harden
pm2 startOrReload ecosystem.config.cjs --only yt-members-signal-trader --update-env
pm2 save --force
```

El endurecimiento conserva acceso completo para el usuario actual, SYSTEM y administradores, elimina la herencia de permisos ajenos y propaga las reglas a los descendientes. Si la validación falla, restaura el ACL raíz anterior. El comando rechaza una primera aplicación si detecta PM2 activo y omite cualquier ruta que ya esté protegida, evitando reinicios inesperados por cambios recursivos en el perfil Chromium abierto.

Estas ACL protegen frente a otras cuentas locales, pero no frente a software malicioso ejecutado como tu propio usuario. Rota las claves si sospechas de una intrusión.

## Tokens y claves

Reglas:

- Si un token se pega en un chat, captura o repo, rótalo.
- Usa claves de BingX sin permisos de retirada.
- Si BingX permite restricción por IP, actívala.
- Separa claves demo y live si tu operativa lo permite.
- No compartas `.data/config.json`.
- No publiques capturas donde se vean tokens, chat IDs, API keys o URLs privadas.

## Modo real

El modo real requiere confirmación manual en la interfaz. Aun así:

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

## Copias cifradas

Los backups restaurables usan AES-256-GCM y una clave derivada con scrypt. La clave predeterminada vive fuera del proyecto:

```text
~/.futures-magician/backup.key
```

Reglas:

- no subas la clave ni archivos `.fmbak` a Git;
- al inicializarla, el script limita sus permisos al usuario actual en Windows y a modo `0600` en Linux/macOS;
- guarda una copia de la clave separada del backup mediante `backup:secure:key:export` y vuelve a comprobarla con `backup:secure:key:verify`;
- no guardes la clave de recuperación dentro del proyecto ni en el mismo sistema de archivos que los `.fmbak` de la réplica: el comando rechaza ambas ubicaciones y no sobrescribe archivos existentes;
- una clave copiada al mismo volumen no protege frente a la pérdida del equipo; `--allow-same-volume` solo confirma conscientemente esa limitación;
- la creación descifra y valida automáticamente cada archivo parcial antes de publicarlo como `.fmbak`;
- las tareas programadas extraen después el backup en un directorio temporal, comprueban sus raíces y lo eliminan al terminar;
- cualquier ruta absoluta, transversal o ajena a `.data` y `.yt-profile` se rechaza antes de extraer;
- vuelve a ejecutar `verify` después de copiar el backup a otro soporte;
- usa `drill` para demostrar que una copia transportada se puede extraer realmente;
- configura una réplica externa solo mediante `configure-mirror --target`; nunca elijas automáticamente una carpeta de nube;
- desactívala con `disable-mirror`: conserva la configuración y todos los contenedores existentes;
- la réplica se copia a un archivo parcial, se verifica con la misma clave y se renombra al final;
- una carpeta del mismo sistema de archivos no cuenta como resiliente, aunque se permita expresamente para un cliente de sincronización;
- restaura primero en `.data/restore-tests/`;
- para respaldar `.yt-profile/`, detén Chromium/PM2 mediante `scripts/profileBackup.ps1` para que Cookies no quede bloqueado;
- no excluyas Cookies del backup del perfil: contiene la sesión que permite recuperar el acceso web.

La app lee únicamente el estado saneado de `.data/backups/secure/status.json`: nombre de archivo, tamaño, fechas, resultado del simulacro, raíces permitidas, salud de la réplica y verificación de la clave de recuperación. De esta última solo expone una huella SHA-256 truncada, una etiqueta saneada y si está en otro volumen. La inspección de capacidad publica únicamente contadores, bytes, porcentajes y nivel; nunca rutas ni nombres individuales. No publica la clave, la ruta completa del destino, la contraseña derivada ni el contenido del backup. La configuración privada vive en `~/.futures-magician/backup-mirror.json` con permisos restringidos al usuario.

## UI expuesta

El servidor escucha en `127.0.0.1` de forma predeterminada. Docker escucha dentro del contenedor en `0.0.0.0`, pero Compose publica el puerto únicamente en `127.0.0.1` del host.

No expongas `http://localhost:5178` a internet sin autenticación. Para activar la autenticación básica, configura las dos variables juntas:

```dotenv
APP_BASIC_USER=operador
APP_BASIC_PASSWORD=una-clave-larga-y-unica
```

No versionees el archivo `.env`. La app también aplica cabeceras de seguridad, rechaza mutaciones con un origen web distinto y limita la frecuencia de peticiones que modifican estado. `/api/health` permanece accesible para healthchecks, pero no permite ninguna acción.

Si usas Cloudflare Tunnel:

- que sea temporal;
- no compartas la URL;
- activa `APP_BASIC_USER` y `APP_BASIC_PASSWORD` antes de abrirlo;
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
